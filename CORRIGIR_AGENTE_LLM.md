# 🔧 Correção do Modelo LLM do Agente

## Problema

O agente está usando o modelo `claude-3-5-sonnet-20240620` que não existe mais na API da Anthropic.

**Erro nos logs:**
```
⚠️  Erro ao usar LLM: Modelo não encontrado: claude-3-5-sonnet-20240620
Error code: 404 - model: claude-3-5-sonnet-20240620
```

## Solução

### Opção 1: Script Automático (Recomendado)

Execute na VPS:

```bash
cd /var/www/credgestor-homologacao
./scripts/corrigir-agente-llm.sh
```

### Opção 2: Comando Manual

```bash
# Atualizar variável de ambiente do serviço
docker service update \
  --env-rm LLM_MODEL \
  --env-add LLM_MODEL=claude-3-5-sonnet \
  agent_agent

# Verificar status
docker service ps agent_agent --no-trunc

# Ver logs
docker service logs agent_agent -f
```

### Opção 3: Atualizar no .env e Fazer Redeploy

1. Editar `.env`:
```bash
LLM_MODEL=claude-3-5-sonnet
```

2. Fazer redeploy:
```bash
cd /var/www/credgestor-homologacao
source .env
docker stack deploy -c docker-compose-agent.yml agent
```

## Modelos Válidos

- ✅ `claude-3-5-sonnet` (recomendado - mais estável)
- ✅ `claude-3-5-sonnet-20241022` (versão específica)
- ✅ `claude-3-haiku-20240307` (mais rápido, mais barato)
- ✅ `claude-3-opus-20240229` (mais poderoso, mais caro)

## Verificação

Após a correção, verifique os logs:

```bash
docker service logs agent_agent -f | grep -E "LLM|modelo|Modelo"
```

O erro de modelo não encontrado não deve mais aparecer.
