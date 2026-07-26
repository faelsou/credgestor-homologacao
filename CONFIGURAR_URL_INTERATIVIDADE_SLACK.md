# 🔧 Request URL de Interatividade do Slack

Documentação completa do agente: `AIOPS_AGENTE.md`.

## Estado atual

Nenhuma alteração é necessária no Slack App. A Request URL histórica continua
válida porque o Traefik a roteia para o agente AIOps:

```
https://credgestor.app.br/api/slack/interactions
```

Rota equivalente, também servida pelo agente:

```
https://credgestor.app.br/agent/slack/interactions
```

Ambas chegam ao receptor em `agent/slack_interactions.py` (porta `8085`). A regra
`Path(/api/slack/interactions)` tem `priority=1000`, acima do
`PathPrefix(/api)` do serviço `credgestor_api` — por isso funciona mesmo com a
API em 0 réplicas.

## Se precisar (re)configurar no Slack App

1. Acesse https://api.slack.com/apps e selecione **Credgestor-Agent**;
2. **Interactivity & Shortcuts** → ative **Interactivity**;
3. Em **Request URL**, use uma das duas URLs acima;
4. **Save Changes**.

## Signing Secret

A validação das interações usa HMAC-SHA256 com o **Signing Secret** do app
(Basic Information → App Credentials). Ele tem **32 caracteres hexadecimais** —
não confundir com o *Verification Token* (24 caracteres, formato diferente), que
já foi colocado nessa variável por engano e causava recusa de todos os cliques.

```bash
# Conferir formato sem expor o valor
docker exec $(docker ps -q -f name=agent_agent) python3 -c "
import os, re
s = os.environ.get('SLACK_SIGNING_SECRET','')
print('len:', len(s), '| formato valido:', bool(re.fullmatch(r'[0-9a-fA-F]{32}', s)))
"

# Aplicar nos serviços que validam interações
docker service update --env-add SLACK_SIGNING_SECRET=<32-hex> agent_agent
docker service update --env-add SLACK_SIGNING_SECRET=<32-hex> credgestor_api
```

Sem um secret válido, o agente opera em modo degradado: aceita apenas decisões
cujo `action_id` está sendo aguardado pelo resolutor naquele momento, e registra
o aviso no log.

## Scopes do bot

Em uso hoje: `chat:write`, `incoming-webhook`, `channels:read`, `users:read`,
`reactions:write`, `im:read`, `im:write`, `files:write`, `commands`.

Faltando: **`reactions:read`** — sem ele a aprovação por reação 👍/👎 não
funciona, apenas os botões. Adicionar em OAuth & Permissions exige reinstalar o
app no workspace.

## Verificação

```bash
curl https://credgestor.app.br/agent/health          # {"status":"ok"}
docker service logs agent_agent -f | grep -Ei "Decisão|Interação|aprovação"
```

## Troubleshooting

| Sintoma | Causa | Ação |
|---|---|---|
| `Invalid signature` / `assinatura não confere` | Signing Secret errado | Recopiar do Slack App (32 hex) |
| `Request timestamp too old` | Relógio do host fora de sincronia | Sincronizar com `chronyd` / `ntpdate` |
| Clique falha com a API fora do ar | Rota de prioridade ausente no Traefik | Conferir labels `credgestor-agent-interactions` em `docker-compose-agent.yml` |
| Botões não aparecem | `SLACK_BOT_TOKEN` ausente ou bot fora do canal | Configurar e convidar o bot no canal |

## Notas

- A URL precisa ser **HTTPS** e responder em menos de 3 segundos (o receptor
  responde imediatamente e a ação roda em background);
- O endpoint aceita `url_verification` do Slack;
- Toda requisição sem assinatura válida é recusada com HTTP 403.
