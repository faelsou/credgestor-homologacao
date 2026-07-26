# 🔧 Botões de Aprovação do Slack

Documentação completa do agente: `AIOPS_AGENTE.md`.

## Estado atual

Os botões **Aprovar** / **Rejeitar** funcionam, inclusive quando o serviço
`credgestor_api` está indisponível. Os cliques são recebidos pelo próprio agente
(`agent/slack_interactions.py`, porta `8085`), não pelo backend.

Fluxo confirmado no log:

```
✅ Mensagem de aprovação enviada via Bot API (com botões)
✅ Decisão recebida de <usuário> para credgestor_api-7a8d36e5
✅ Aprovação recebida via botão
✅ Serviço credgestor_api escalado para 1 réplica(s)
```

## Por que o receptor saiu do backend

O endpoint original vivia em `backend/main.py` (`/slack/interactions`). Quando o
incidente era a própria API estar em 0 réplicas, o Traefik não tinha backend para
a Request URL e o clique era perdido — justamente no cenário em que a aprovação
era necessária.

O agente passou a expor o receptor e o Traefik roteia as duas URLs para ele:

| URL | Rota |
|---|---|
| `https://credgestor.app.br/api/slack/interactions` | Rota histórica, `priority=1000` acima do `PathPrefix(/api)` |
| `https://credgestor.app.br/agent/slack/interactions` | Rota nova |

O endpoint no backend continua existindo (com `GET /slack/approval-status/{id}`)
como caminho alternativo, mas não é mais o principal.

## Requisitos

1. **`SLACK_BOT_TOKEN`** configurado — os botões só existem via Bot API; o
   webhook é fallback sem botões;
2. **Bot no canal** `#credgestor-agent` (`/invite @Credgestor-Agent`);
3. **`SLACK_SIGNING_SECRET`** com 32 caracteres hexadecimais, igual ao do Slack
   App (Basic Information → App Credentials);
4. **Interactivity ativada** no Slack App, com a Request URL apontando para uma
   das duas rotas acima.

## Verificação

```bash
# Receptor ativo?
docker service logs agent_agent | grep "Receptor de interações"
curl https://credgestor.app.br/agent/health

# Teste de assinatura válida x inválida (deve responder 200 e 403)
docker exec $(docker ps -q -f name=agent_agent) python3 -c "
import hashlib, hmac, os, time, json, urllib.parse, requests
s = os.environ['SLACK_SIGNING_SECRET']
aid = 'teste-doc'
p = {'type':'block_actions','user':{'name':'doc'},'actions':[{'action_id':'approve_'+aid}]}
body = 'payload=' + urllib.parse.quote(json.dumps(p)); ts = str(int(time.time()))
sig = 'v0=' + hmac.new(s.encode(), f'v0:{ts}:{body}'.encode(), hashlib.sha256).hexdigest()
url = 'https://credgestor.app.br/api/slack/interactions'
h = {'Content-Type':'application/x-www-form-urlencoded','X-Slack-Request-Timestamp':ts}
print('valida  ->', requests.post(url, data=body, headers={**h,'X-Slack-Signature':sig}).status_code)
print('invalida->', requests.post(url, data=body, headers={**h,'X-Slack-Signature':'v0=falsa'}).status_code)
"
```

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| Clique não faz nada e log mostra `assinatura não confere` | `SLACK_SIGNING_SECRET` errado | Copiar o secret do Slack App (32 hex) |
| Log mostra `SLACK_SIGNING_SECRET ausente ou em formato inválido` | Variável com valor de outro token | Corrigir a variável; até então vale o modo degradado |
| Log mostra `timestamp fora da janela` | Relógio do host dessincronizado | `chronyd` / `ntpdate` |
| `Decisão recusada: origem não verificada` | `action_id` já expirado ou inexistente | Aguardar o novo pedido (lembrete a cada 15 min) |
| Botões não aparecem na mensagem | `SLACK_BOT_TOKEN` ausente ou bot fora do canal | Configurar token e convidar o bot |
| `⚠️ Erro ao listar canais: missing_scope` | Falta `channels:read`/`groups:read` | Inofensivo: o ID do canal é obtido da resposta do envio |

## Arquivos envolvidos

- `agent/slack_interactions.py` — receptor HTTP, validação e store de aprovações
- `agent/slack_client.py` — envio das mensagens com botões e polling da decisão
- `agent/resolver.py` — registra o `action_id` aguardado e executa a ação
- `docker-compose-agent.yml` — labels do Traefik e `AGENT_HTTP_PORT`
- `backend/main.py` — endpoints alternativos `/slack/interactions` e `/slack/approval-status/{id}`
