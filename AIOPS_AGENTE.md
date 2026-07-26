# 🤖 Agente AIOps — Monitoramento, Troubleshooting e Resolução

Documentação do agente que monitora a stack `credgestor` no Docker Swarm, avisa
no Slack quando há indisponibilidade, diagnostica com LLM e executa a correção
após aprovação humana.

Serviço no Swarm: **`agent_agent`** (stack `agent`).

---

## 1. O que o agente faz

| Situação | Comportamento |
|---|---|
| Tudo saudável | Envia "Status Saudável" a cada 1 hora |
| Serviço fica indisponível | Alerta no Slack em até 30 segundos |
| Após o alerta | Roda troubleshooting (LLM) e envia o relatório |
| Em seguida | Pede aprovação no Slack com botões Aprovar / Rejeitar |
| Aprovado | Executa a correção e envia o relatório de resolução |
| Serviço normaliza | Envia mensagem de "Serviço Recuperado" |
| Ninguém responde | Pedido expira em 10 min e é reaberto a cada 15 min |

O status saudável é **suprimido** enquanto houver incidente em aberto, para não
afirmar que está tudo bem durante uma indisponibilidade.

---

## 2. O que é detectado

A cada ~30 segundos o agente olha **todas as camadas** da aplicação: as réplicas
no Swarm, a API pela rede interna e pela URL pública, o banco de dados, o
frontend, o host e a configuração dos serviços.

### Camada Docker Swarm

Varre os serviços com a label `com.docker.stack.namespace=credgestor`:

| `issue_type` | Condição | Severidade |
|---|---|---|
| `task_failed` | Task terminou em falha (ex: `exit 137: unhealthy container`) | CRITICAL |
| `scaled_below_min` | Réplicas desejadas abaixo da label `com.docker.swarm.autoscale.min` | CRITICAL |
| `scaled_to_zero` | Serviço sem label de autoscale escalado para 0 réplicas | CRITICAL |
| `unavailable` | Réplicas desejadas > 0, mas nenhuma rodando | CRITICAL |
| `degraded` | Réplicas rodando abaixo das desejadas | HIGH |

### Sondagens ativas (`agent/probes.py`)

| `issue_type` | Condição | Severidade |
|---|---|---|
| `api_unreachable` | `/health/live` não responde (rede interna nem URL pública) | CRITICAL |
| `api_not_ready` | Liveness OK, mas `/health` (readiness) falha | HIGH |
| `edge_unreachable` | API responde internamente mas falha pela URL pública (Traefik, DNS ou TLS) | CRITICAL |
| `database_unreachable` | `/health` acusa `database.connected = false` | CRITICAL |
| `database_slow` | Latência do banco acima de `PROBE_DB_SLOW_MS` | HIGH |
| `frontend_unreachable` | Frontend não responde na `FRONTEND_URL` | CRITICAL |
| `container_unhealthy` | Réplica running com `Health=unhealthy` (pré-exit 137) | CRITICAL |
| `host_memory_low` | Memória disponível do host abaixo de `PROBE_HOST_MEMORY_MIN_PERCENT` | HIGH |
| `host_disk_low` | Disco acima de `PROBE_HOST_DISK_MAX_PERCENT` | HIGH |
| `healthcheck_disabled` | Serviço com `Healthcheck.Test = NONE` no spec | MEDIUM (aviso) |

Comparar a sondagem interna com a pública é o que permite separar **falha da
aplicação** de **falha de borda**: se o `/health/live` responde em
`http://credgestor_api:8000` mas o domínio não, o problema é de roteamento e
reiniciar o serviço não adianta.

Liveness (`/health/live`) e readiness (`/health`) são sondados em separado:
o Swarm só deve matar o container quando o **processo** morre — nunca porque o
Supabase ficou lento.

Enquanto um serviço está escalado para zero, as sondagens de API e frontend são
puladas — a indisponibilidade já é reportada pela camada do Swarm, sem duplicar
mensagem.

Regras anti-spam:

- Cada task com falha alerta **uma única vez**;
- Falhas com mais de 15 minutos são ignoradas no startup do agente (não
  re-alerta incidentes antigos a cada reinício);
- Um problema em aberto alerta na entrada, quando a severidade **aumenta** e
  como lembrete a cada `REALERT_INTERVAL`. Mudanças laterais de estado (ex:
  `scaled_to_zero` → `unavailable` enquanto o container sobe) não repetem alerta;
- Avisos de configuração (`advisory`, como `healthcheck_disabled`) alertam uma
  única vez, sem lembretes, e não suprimem o relatório de status saudável.

---

## 3. Ações do resolutor

| Problema | Ação executada após aprovação |
|---|---|
| `scaled_below_min`, `scaled_to_zero` | Escalar o serviço de volta ao mínimo esperado |
| `unavailable`, `degraded`, `api_unreachable`, `api_not_ready`, `frontend_unreachable`, `container_unhealthy` | Forçar reinício das tasks (`force_update`) |

Após executar, o agente aguarda até 120 segundos pela estabilização e informa no
relatório se o serviço voltou com todas as réplicas rodando.

Os demais problemas **não têm ação automática**, porque reiniciar o serviço não
resolveria: `task_failed` (o Swarm já recriou a task), `database_unreachable` e
`database_slow` (dependência externa), `edge_unreachable` (borda), `host_*`
(recurso do host) e `healthcheck_disabled` (exige redeploy). Nesses casos o
agente envia o diagnóstico com o título **"Intervenção manual necessária"** e os
próximos passos, sem pedir aprovação.

---

## 4. Arquitetura

```
agent/
├── main.py                 Loop principal (~30s) + orquestração do incidente
├── monitor.py              Réplicas e tasks falhas via Docker socket
├── probes.py               Sondagens HTTP (API, DB, frontend), host e health
├── issue_tracker.py        Deduplicação, lembretes e recuperação
├── troubleshooter.py       Coleta diagnóstico + análise com LLM (fallback por regras)
├── resolver.py             Plano de ação, pedido de aprovação e execução
├── slack_client.py         Envio de mensagens, botões e polling de aprovação
├── slack_interactions.py   Receptor HTTP dos cliques + consulta de aprovações
├── llm_client.py           Cliente Anthropic / OpenAI
└── config.py               Leitura das variáveis de ambiente
```

Fluxo de um incidente:

```
monitor.collect() + probes.collect()
   └─> issue_tracker.evaluate(findings)
         └─> alerta no Slack (send_issue_detected)
               └─> IncidentPipeline (thread por alvo)
                     ├─> troubleshooter: coleta estado, tasks e logs → análise LLM
                     ├─> Slack: relatório de troubleshooting
                     ├─> resolver: pedido de aprovação (botões) — se actionable
                     ├─> aguarda decisão (polling do receptor local)
                     └─> executa ação + relatório de resolução
```

---

## 2.1 Incidente de sexta/sábado (exit 137) — causa raiz

Entre 24 e 25/07/2026 o `credgestor_api` reiniciou várias vezes com:

```
task: non-zero exit (137): dockerexec: unhealthy container
```

Causa: o healthcheck do Swarm apontava para `GET /health`, endpoint que **consulta
o Supabase**. Quando o banco ficou lento ou inacessível, o `curl -f` falhou por
3 retries → Docker marcou o container `unhealthy` → Swarm o matou (SIGKILL /
exit 137), mesmo com o processo uvicorn ainda vivo.

Correção aplicada:

| Antes | Depois |
|---|---|
| Healthcheck → `/health` (com banco) | Healthcheck → `/health/live` (só processo) |
| `/health` misturava liveness e readiness | `/health/live` = vivo; `/health` = readiness + DB |
| AIOps só olhava réplicas | AIOps sonda API, DB, frontend, host e unhealthy |

O AIOps agora alerta `database_slow` / `database_unreachable` **sem** derrubar a
API, e alerta `container_unhealthy` **antes** do Swarm executar o kill.

---

## 5. Receptor de aprovações (importante)

Os cliques nos botões são recebidos pelo **próprio agente**, em um servidor HTTP
na porta `8085`, e **não** pelo backend. Isso é intencional: quando o serviço
`credgestor_api` está fora do ar, um endpoint hospedado nele não poderia receber
a aprovação para restaurá-lo.

Rotas expostas via Traefik (labels no serviço `agent_agent`):

| URL pública | Uso |
|---|---|
| `https://credgestor.app.br/agent/slack/interactions` | Rota nova do receptor |
| `https://credgestor.app.br/api/slack/interactions` | Rota histórica do Slack App, com `priority=1000` acima do `PathPrefix(/api)` da API |
| `https://credgestor.app.br/agent/health` | Health check do receptor |

Por causa da segunda rota, **não é necessário alterar a Request URL no Slack
App**: a URL já configurada passou a ser atendida pelo agente.

### Validação de origem

Toda interação é validada por HMAC-SHA256 com o `SLACK_SIGNING_SECRET`
(assinatura `v0=`, janela de 5 minutos). Requisição com assinatura inválida é
recusada com HTTP 403 e o motivo é registrado no log.

Se o signing secret estiver ausente ou fora do formato esperado (32 caracteres
hexadecimais), o agente entra em modo degradado: aceita a decisão **somente** se
o `action_id` for uma ação que o resolutor está aguardando naquele momento
(valor aleatório, válido por poucos minutos). Nesse caso o log avisa para
corrigir o secret.

O endpoint `GET /slack/approval-status/{action_id}` (no agente e no backend)
permite consultar o resultado de uma aprovação.

---

## 6. Variáveis de ambiente

| Variável | Valor atual | Descrição |
|---|---|---|
| `DOCKER_STACK` | `credgestor` | Stack monitorada |
| `MONITOR_INTERVAL` | `3600` | Base do intervalo do status saudável |
| `SEND_HEALTHY_STATUS` | `true` | Habilita o status periódico |
| `HEALTHY_STATUS_INTERVAL` | `3600` | Intervalo do status saudável (segundos) |
| `REALERT_INTERVAL` | `900` | Intervalo do lembrete de incidente em aberto |
| `REQUIRE_APPROVAL` | `true` | Exige aprovação antes de qualquer ação |
| `APPROVAL_TIMEOUT` | `600` | Timeout da aprovação (menor que `REALERT_INTERVAL`) |
| `AGENT_HTTP_PORT` | `8085` | Porta do receptor de interações |
| `SLACK_BOT_TOKEN` | `xoxb-...` | Envio de mensagens com botões |
| `SLACK_SIGNING_SECRET` | 32 hex | Validação das interações |
| `SLACK_WEBHOOK_URL` | URL | Fallback de envio sem botões |
| `SLACK_CHANNEL` | `#credgestor-agent` | Canal de destino |
| `LLM_PROVIDER` | `anthropic` | Provedor do LLM |
| `LLM_MODEL` | `claude-sonnet-4-5` | Modelo usado no troubleshooting |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Credencial do LLM |

O `APPROVAL_TIMEOUT` é deliberadamente menor que o `REALERT_INTERVAL` para que
cada lembrete encontre o pedido anterior encerrado e abra um novo, em vez de
deixar o incidente parado esperando.

---

## 7. Operação

```bash
# Estado do serviço
docker service ps agent_agent --no-trunc

# Logs (o código é montado por volume: basta reiniciar para aplicar mudanças)
docker service logs agent_agent -f
docker service update --force agent_agent

# Ajustar um parâmetro
docker service update --env-add APPROVAL_TIMEOUT=600 agent_agent

# Health do receptor de aprovações
curl https://credgestor.app.br/agent/health

# Redeploy completo (exige as variáveis exportadas no ambiente)
docker stack deploy -c docker-compose-agent.yml agent
```

Mensagens úteis no log:

| Log | Significado |
|---|---|
| `✅ Monitor Docker iniciado para a stack 'credgestor'` | Monitor ativo |
| `✅ Receptor de interações do Slack ouvindo na porta 8085` | Receptor ativo |
| `🚨 Alerta <tipo> de <serviço>: enviado` | Alerta entregue ao Slack |
| `🔁 Reabrindo aprovação de <serviço>` | Lembrete de incidente em aberto |
| `✅ Decisão recebida de <usuário> para <action_id>` | Clique registrado |
| `⏰ Timeout de aprovação` | Ninguém respondeu na janela |
| `⚠️ Interação recusada: ...` | Assinatura, timestamp ou origem inválida |

---

## 8. Relação com o autoscaler

O `autoscaler_autoscaler` (código em `scripts/autoscaler.py`) escala por CPU
usando as labels `com.docker.swarm.autoscale.{min,max,target}`.

Quando um serviço está **abaixo do mínimo**, o autoscaler não intervém: registra
`Aguardando tratativa do agente AIOps` e deixa a restauração para o fluxo com
aprovação, evitando que as duas automações compitam pelo mesmo serviço.

---

## 9. Limitações conhecidas

- **Escopo**: apenas serviços da stack `credgestor`. Serviços como
  `postgres_postgres`, `redis_redis`, `n8n_n8n`, `traefik_traefik` e o próprio
  `autoscaler_autoscaler` não são monitorados.
- **Aprovação por reação 👍**: o bot não tem o scope `reactions:read`, então só
  os botões funcionam.
- **Sem aprovação, sem correção**: com `REQUIRE_APPROVAL=true` um serviço fora
  do ar permanece assim até alguém aprovar (com lembretes a cada 15 minutos).
- **Estado em memória**: reiniciar o agente zera o histórico de incidentes, o
  que faz os problemas em aberto serem alertados novamente.

---

## 10. Documentos relacionados

- `CORRIGIR_AGENTE_LLM.md` — modelo do LLM
- `CORRIGIR_BOTOES_SLACK.md` — botões de aprovação
- `CONFIGURAR_URL_INTERATIVIDADE_SLACK.md` — Request URL e validação de assinatura
- `GUIA_ATUACAO_SRE.md` — procedimentos de SRE
