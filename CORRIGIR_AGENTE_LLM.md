# 🔧 Modelo LLM do Agente AIOps

Documentação completa do agente: `AIOPS_AGENTE.md`.

## Estado atual

O agente usa **`claude-sonnet-4-5`** (variável `LLM_MODEL` no serviço
`agent_agent`). O log de inicialização confirma o LLM ativo:

```
✅ Agente de troubleshooting com LLM habilitado
```

## Histórico do problema

Os modelos `claude-3-5-sonnet`, `claude-3-5-sonnet-20240620` e
`claude-3-5-sonnet-20241022` foram **aposentados pela Anthropic** e retornam 404:

```
⚠️  Falha na análise via LLM, usando regras: Modelo não encontrado: claude-3-5-sonnet-20241022
Error code: 404 - {'type': 'not_found_error', 'message': 'model: claude-3-5-sonnet-20241022'}
```

Quando isso acontece o agente **não para**: ele cai para a análise baseada em
regras (`agent/troubleshooter.py`), com diagnóstico e plano de ação menos
detalhados, e o fluxo de aprovação segue normalmente.

## Como trocar o modelo

```bash
docker service update --env-add LLM_MODEL=claude-sonnet-4-5 agent_agent
docker service logs agent_agent -f | grep -Ei "LLM|modelo"
```

Para persistir entre redeploys, ajuste também o default em
`docker-compose-agent.yml`:

```yaml
- LLM_MODEL=${LLM_MODEL:-claude-sonnet-4-5}
```

## Como validar se um modelo existe

Antes de aplicar, teste o nome do modelo com a credencial em uso:

```bash
docker exec $(docker ps -q -f name=agent_agent) python3 -c "
import os
from anthropic import Anthropic
client = Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
client.messages.create(model='claude-sonnet-4-5', max_tokens=5,
                       messages=[{'role':'user','content':'oi'}])
print('modelo OK')
"
```

Se retornar 404, o modelo não está disponível para essa conta — consulte a lista
atual em https://docs.anthropic.com/en/docs/about-claude/models.

## Troubleshooting

| Log | Causa | Ação |
|---|---|---|
| `Modelo não encontrado` (404) | Modelo aposentado ou nome errado | Trocar `LLM_MODEL` |
| `Erro de autenticação` (401) | `ANTHROPIC_API_KEY` inválida | Atualizar a credencial |
| `⚠️ LLM indisponível, troubleshooting usará regras` | Chave ausente na inicialização | Conferir `ANTHROPIC_API_KEY` no serviço |
