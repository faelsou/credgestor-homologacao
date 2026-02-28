# 🔧 Correção dos Botões do Slack

## Problemas Identificados

1. ❌ **URL de Interatividade não configurada** - Tooltip mostra: "This app is not configured to handle interactive responses"
2. ❌ **Código antigo em execução** - Botões ainda têm emojis e confirmação (mesmo após correções)

## ✅ Correções Aplicadas no Código

### 1. Botões Simplificados
- ✅ Removidos emojis dos botões (agora apenas "Aprovar" e "Rejeitar")
- ✅ Removidas confirmações (botões respondem diretamente)
- ✅ Adicionado `value` aos botões para compatibilidade

### 2. Melhor Detecção de Canal
- ✅ Paginação na busca de canais
- ✅ Tentativa automática de adicionar bot ao canal
- ✅ Retry automático após adicionar bot

### 3. Mensagens Atualizadas
- ✅ Instruções focam apenas em botões (sem mencionar reações)
- ✅ Fallback mantém reações apenas quando botões não disponíveis

## 🚀 Como Aplicar as Correções

### Passo 1: Configurar URL de Interatividade no Slack

1. Acesse: https://api.slack.com/apps
2. Selecione seu app (Credgestor-Agent)
3. Vá em **"Interactivity & Shortcuts"**
4. Ative **"Interactivity"**
5. Configure **Request URL**:
   ```
   https://credgestor.app.br/api/slack/interactions
   ```
6. Clique em **"Save Changes"**

### Passo 2: Atualizar Código do Agente na VPS

O código foi corrigido, mas precisa ser atualizado no agente:

```bash
# Na VPS
cd /var/www/credgestor-homologacao

# Fazer pull das alterações (se já commitadas)
git pull origin main

# Ou atualizar o volume do agente (se usando volume)
# O código já está atualizado no repositório

# Reiniciar o agente para carregar novo código
docker service update --force agent_agent
```

### Passo 3: Verificar Configurações

```bash
# Verificar se variáveis estão configuradas
grep SLACK .env

# Deve ter:
# SLACK_BOT_TOKEN=xoxb-...
# SLACK_SIGNING_SECRET=...
# SLACK_CHANNEL=#credgestor-agent
```

### Passo 4: Adicionar Bot ao Canal

No Slack, no canal `#credgestor-agent`:
```
/invite @Credgestor-Agent
```

## 🔍 Verificação

Após configurar:

1. ✅ Tooltip "This app is not configured..." deve desaparecer
2. ✅ Botões devem aparecer sem emojis
3. ✅ Botões devem funcionar sem confirmação
4. ✅ Instruções devem mencionar apenas botões

## 📝 Arquivos Modificados

- `agent/slack_client.py` - Botões simplificados, melhor detecção de canal
- `backend/main.py` - Endpoint `/api/slack/interactions` já implementado
- `docker-compose-agent.yml` - Configuração do agente

## ⚠️ Importante

O endpoint `/api/slack/interactions` está em `backend/main.py` e deve estar acessível em:
- **Produção**: `https://credgestor.app.br/api/slack/interactions`
- **Desenvolvimento**: `http://localhost:8000/slack/interactions`

O Traefik deve rotear `/api/*` para o backend automaticamente.
