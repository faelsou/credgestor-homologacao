# 🚀 Guia Rápido de Configuração - Workflow de Monitoramento

## ⚡ Setup em 5 Passos

### 1. Criar Tabela no Banco de Dados

Execute o script SQL:

```bash
# Via Supabase Dashboard ou psql
psql -h db.aclyrcuahiujgtjuimoh.supabase.co -U postgres -d postgres -f scripts/create_troubleshooting_table.sql
```

Ou copie e cole o conteúdo de `scripts/create_troubleshooting_table.sql` no SQL Editor do Supabase.

### 2. Configurar Credenciais no n8n

No n8n, configure as seguintes credenciais:

#### PostgreSQL
- **Host**: `db.aclyrcuahiujgtjuimoh.supabase.co`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: (sua senha do Supabase)
- **Port**: `5432`
- **SSL**: Habilitado

#### Anthropic Claude API
- **API Key**: (sua chave da Anthropic)
- **Model**: `claude-3-5-sonnet-20241022` (ou outro modelo)

#### Slack API
- **Access Token**: (token do bot Slack)
- **Bot Token**: (token do bot)
- Permissões necessárias: `chat:write`, `channels:read`, `im:read`

#### Gmail OAuth2
- Configure OAuth2 seguindo a [documentação do n8n](https://docs.n8n.io/integrations/builtin/credentials/gmail/)

### 3. Configurar Variáveis de Ambiente

No n8n, vá em **Settings** → **Environment Variables** e adicione:

```bash
# LLM
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sua_chave_aqui

# Prompts (copie o conteúdo dos arquivos)
PROMPT_INFRA_SPECIALIST=<conteúdo de prompts/infra_specialist_prompt.txt>
PROMPT_DEV_SPECIALIST=<conteúdo de prompts/dev_specialist_prompt.txt>

# Email
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br

# Slack (opcional, pode usar credenciais)
SLACK_CHANNEL=#credgestor-alerts
```

**Importante**: Para os prompts, você pode:
- Copiar o conteúdo completo dos arquivos `.txt` e colar nas variáveis
- Ou usar um nó "Read Binary File" no workflow para ler os arquivos

### 4. Importar Workflows

#### Workflow Principal (Monitoramento)

1. Vá em **Workflows** → **Import from File**
2. Selecione `n8n_workflow_monitoring_troubleshooting.json`
3. Configure os nós que requerem credenciais:
   - Health Check API, Verificar Métricas, Health Check Frontend
   - Análise Especialista Infra (Anthropic)
   - Análise Especialista Dev (Anthropic)
   - Salvar Relatório (PostgreSQL)
   - Enviar Slack (Slack API)
   - Enviar Email Gmail (Gmail OAuth2)

#### Workflow de Aprovação (Opcional)

1. Vá em **Workflows** → **Import from File**
2. Selecione `n8n_workflow_approval_handler.json`
3. Configure:
   - Slack - Nova Mensagem (Slack API)
   - Buscar Relatório, Aprovar Relatório, Rejeitar Relatório (PostgreSQL)
   - Enviar Confirmação (Slack API)

### 5. Ativar Workflows

1. **Workflow Principal**: Ative o workflow (toggle no canto superior direito)
2. **Workflow de Aprovação**: Ative o workflow (se importado)

## ✅ Verificação

### Testar Health Checks

Execute manualmente o workflow principal e verifique:
- ✅ Health Check API retorna 200
- ✅ Métricas estão disponíveis
- ✅ Frontend está acessível

### Testar Análise

Se houver um problema real ou simular um:
- ✅ Especialistas são chamados corretamente
- ✅ Relatório é salvo no banco
- ✅ Notificações são enviadas

### Testar Aprovação

No Slack, envie:
```
APROVAR <ID_DO_RELATORIO>
```

Verifique:
- ✅ Status atualizado no banco
- ✅ Confirmação enviada no Slack

## 🔧 Ajustes Comuns

### Alterar Frequência de Verificação

No nó "Verificação Periódica", altere a expressão cron:
- A cada 15 minutos: `*/15 * * * *`
- A cada 5 minutos: `*/5 * * * *`
- A cada hora: `0 * * * *`

### Alterar Canal do Slack

No nó "Enviar Slack", altere o campo `channel` ou use a variável `SLACK_CHANNEL`.

### Alterar Destinatário do Email

Altere a variável `ALERT_EMAIL_TO` ou o campo `toEmail` no nó "Enviar Email Gmail".

### Usar Outro LLM

Se quiser usar OpenAI (Codex/GPT) em vez de Claude:
1. Altere o tipo do nó LLM para `@n8n/n8n-nodes-langchain.lmChatOpenAi`
2. Configure credenciais OpenAI
3. Ajuste o modelo: `gpt-4` ou `gpt-3.5-turbo`

## 📊 Monitoramento

### Ver Execuções

1. Vá em **Executions** no n8n
2. Filtre por workflow
3. Veja logs detalhados

### Ver Relatórios no Banco

```sql
-- Relatórios pendentes
SELECT * FROM vw_pending_troubleshooting_reports;

-- Estatísticas
SELECT * FROM vw_troubleshooting_stats;

-- Últimos 10 relatórios
SELECT 
    id,
    timestamp,
    specialist_type,
    severity,
    status,
    diagnosis->>'summary' as summary
FROM troubleshooting_reports
ORDER BY timestamp DESC
LIMIT 10;
```

## 🆘 Troubleshooting

### Workflow não executa

- Verifique se está ativado (toggle verde)
- Verifique o agendamento (cron expression)
- Veja logs em **Executions**

### LLM não responde

- Verifique API key
- Verifique modelo configurado
- Veja logs do nó LLM
- Verifique limites de rate da API

### Banco não conecta

- Verifique credenciais
- Verifique se a tabela existe: `SELECT * FROM troubleshooting_reports LIMIT 1;`
- Teste conexão manualmente

### Slack não envia

- Verifique token do bot
- Verifique permissões do bot
- Verifique se o canal existe
- Veja logs do nó Slack

## 📚 Próximos Passos

1. **Customizar Prompts**: Ajuste os prompts em `prompts/` para suas necessidades
2. **Adicionar Verificações**: Adicione mais health checks conforme necessário
3. **Workflow de Execução**: Crie workflow para executar ações aprovadas automaticamente
4. **Dashboard**: Crie dashboard no Grafana para visualizar relatórios

## 🔗 Links Úteis

- [Documentação Completa](./N8N_MONITORING_TROUBLESHOOTING.md)
- [Prompts dos Especialistas](./prompts/)
- [Script SQL](./scripts/create_troubleshooting_table.sql)
- [Documentação n8n](https://docs.n8n.io/)
