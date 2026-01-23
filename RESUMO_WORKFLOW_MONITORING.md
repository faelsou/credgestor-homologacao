# 📋 Resumo - Workflow de Monitoramento e Troubleshooting

## ✅ O que foi criado

### 1. Workflow Principal de Monitoramento
**Arquivo**: `n8n_workflow_monitoring_troubleshooting.json`

- ✅ Verificação periódica (a cada 15 minutos)
- ✅ Health checks (API, Frontend, Métricas)
- ✅ Roteamento inteligente para especialistas
- ✅ Análise via Claude AI (Infra e Dev)
- ✅ Geração de relatórios estruturados
- ✅ Notificações via Slack e Email
- ✅ Sistema de aprovação

### 2. Workflow de Aprovação
**Arquivo**: `n8n_workflow_approval_handler.json`

- ✅ Monitora mensagens do Slack
- ✅ Processa comandos APROVAR/REJEITAR
- ✅ Atualiza status no banco de dados
- ✅ Envia confirmações

### 3. Prompts dos Especialistas

#### Especialista de Infraestrutura
**Arquivo**: `prompts/infra_specialist_prompt.txt`

- ✅ Especializado em Linux, Containers Docker, Banco SQL
- ✅ Análise de recursos do sistema
- ✅ Diagnóstico de problemas de infra
- ✅ Plano de ação com comandos específicos

#### Especialista de Desenvolvimento
**Arquivo**: `prompts/dev_specialist_prompt.txt`

- ✅ Especializado em Frontend (React/Vite) e Backend (FastAPI)
- ✅ Análise de código e erros
- ✅ Diagnóstico de problemas de integração
- ✅ Plano de ação com correções de código

### 4. Script SQL
**Arquivo**: `scripts/create_troubleshooting_table.sql`

- ✅ Criação da tabela `troubleshooting_reports`
- ✅ Índices para performance
- ✅ Views para relatórios pendentes e estatísticas
- ✅ Triggers para atualização automática

### 5. Documentação

#### Documentação Completa
**Arquivo**: `N8N_MONITORING_TROUBLESHOOTING.md`

- ✅ Visão geral do sistema
- ✅ Arquitetura do workflow
- ✅ Configuração detalhada
- ✅ Prompts completos
- ✅ Troubleshooting

#### Guia Rápido
**Arquivo**: `N8N_SETUP_RAPIDO.md`

- ✅ Setup em 5 passos
- ✅ Configuração de credenciais
- ✅ Variáveis de ambiente
- ✅ Testes e verificação

## 🎯 Funcionalidades Principais

### Monitoramento Automatizado
- Verifica saúde da aplicação a cada 15 minutos
- Detecta problemas em API, Frontend e Métricas
- Coleta contexto técnico para análise

### Análise Inteligente
- Roteia problemas para especialistas apropriados
- Usa Claude AI para diagnóstico detalhado
- Gera planos de ação estruturados

### Sistema de Aprovação
- Todas as ações requerem aprovação
- Notificações via Slack e Email
- Comandos simples: `APROVAR <ID>` ou `REJEITAR <ID>`

### Documentação Automática
- Relatórios salvos no banco de dados
- Histórico completo de problemas
- Estatísticas e análises

## 📁 Estrutura de Arquivos

```
/var/www/credgestor-homologacao/
├── n8n_workflow_monitoring_troubleshooting.json  # Workflow principal
├── n8n_workflow_approval_handler.json            # Workflow de aprovação
├── prompts/
│   ├── infra_specialist_prompt.txt               # Prompt Infra
│   └── dev_specialist_prompt.txt                 # Prompt Dev
├── scripts/
│   └── create_troubleshooting_table.sql         # Script SQL
├── N8N_MONITORING_TROUBLESHOOTING.md             # Doc completa
├── N8N_SETUP_RAPIDO.md                           # Guia rápido
└── RESUMO_WORKFLOW_MONITORING.md                 # Este arquivo
```

## 🚀 Próximos Passos

1. **Executar Script SQL**: Criar tabela no banco de dados
2. **Configurar Credenciais**: PostgreSQL, Anthropic, Slack, Gmail
3. **Configurar Variáveis**: Prompts e configurações
4. **Importar Workflows**: No n8n
5. **Ativar Workflows**: Testar e monitorar

## 📊 Fluxo de Funcionamento

```
1. Verificação Periódica (15 min)
   ↓
2. Health Checks (API, Frontend, Métricas)
   ↓
3. Detecção de Problemas
   ↓
4. Roteamento para Especialistas
   ↓
5. Análise via Claude AI
   ↓
6. Geração de Relatório
   ↓
7. Salvamento no Banco
   ↓
8. Notificação (Slack + Email)
   ↓
9. Aguarda Aprovação
   ↓
10. Execução (quando aprovado)
```

## 🔧 Tecnologias Utilizadas

- **n8n 1.115**: Automação e workflows
- **Claude AI (Anthropic)**: Análise inteligente
- **PostgreSQL/Supabase**: Armazenamento de relatórios
- **Slack API**: Notificações e aprovações
- **Gmail OAuth2**: Notificações por email

## 📝 Notas Importantes

1. **Versão n8n**: Workflow compatível com n8n 1.115+
2. **LLM**: Configurado para Claude AI, mas pode usar OpenAI/Codex
3. **Aprovação**: Todas as ações requerem aprovação manual
4. **Frequência**: Ajustável via cron expression
5. **Prompts**: Customizáveis em `prompts/`

## 🆘 Suporte

- Consulte `N8N_SETUP_RAPIDO.md` para configuração rápida
- Consulte `N8N_MONITORING_TROUBLESHOOTING.md` para documentação completa
- Verifique logs no n8n em **Executions**

---

**Criado em**: 2024-12-20  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso
