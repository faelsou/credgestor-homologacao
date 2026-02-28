# 🤖 Arquitetura Multi-Agente - CredGestor Monitoring

## 📋 Visão Geral

Sistema de monitoramento e troubleshooting baseado em arquitetura **multi-agente** com um **Agente Orquestrador** que coordena **sub-agentes especializados**.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│           Agente Orquestrador                            │
│  - Monitora aplicação periodicamente                    │
│  - Detecta problemas                                     │
│  - Decide quais sub-agentes chamar                       │
│  - Consolida resultados                                  │
│  - Gera relatórios unificados                            │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴───────┬──────────────┐
       │               │              │
       ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Agente    │ │   Agente    │ │   Agente    │
│  Infra      │ │    Dev      │ │  Database   │
│             │ │             │ │             │
│ - Linux     │ │ - React     │ │ - PostgreSQL│
│ - Docker    │ │ - FastAPI   │ │ - Supabase  │
│ - Traefik   │ │ - TypeScript│ │ - Queries   │
│ - Rede      │ │ - Python    │ │ - Performance│
└─────────────┘ └─────────────┘ └─────────────┘
```

## 🎯 Componentes

### 1. Agente Orquestrador
**Arquivo**: `n8n_workflow_orquestrador.json`

**Responsabilidades**:
- ✅ Execução periódica (a cada 15 minutos)
- ✅ Coleta de dados iniciais (health checks)
- ✅ Análise e decisão sobre quais agentes chamar
- ✅ Coordenação de chamadas para sub-agentes
- ✅ Consolidação de resultados
- ✅ Geração de relatórios unificados
- ✅ Notificações (Slack/Email)

**Fluxo**:
1. Inicializa sessão de monitoramento
2. Executa health checks (API, Frontend, Métricas, DB)
3. Analisa resultados e detecta problemas
4. Decide quais sub-agentes especializados chamar
5. Chama sub-agentes via webhook
6. Aguarda respostas dos sub-agentes
7. Consolida análises de todos os agentes
8. Gera relatório unificado
9. Envia notificações

### 2. Agente de Infraestrutura
**Arquivo**: `n8n_workflow_agente_infra.json`

**Especialização**:
- Linux (recursos, processos, logs)
- Containers Docker (status, saúde, recursos)
- Rede e conectividade
- Traefik (configuração, roteamento)
- Monitoramento (Prometheus, métricas)

**Webhook**: `/webhook/agente-infra`

**Coleta de Dados**:
- Health check da API
- Métricas detalhadas
- Performance do banco de dados
- Status de conexões

**Análise**:
- Diagnóstico de problemas de infra
- Identificação de gargalos
- Recomendações de otimização
- Planos de ação com comandos específicos

### 3. Agente de Desenvolvimento
**Arquivo**: `n8n_workflow_agente_dev.json`

**Especialização**:
- Frontend (React, Vite, TypeScript)
- Backend (FastAPI, Python)
- Integração API
- Código e lógica de negócio
- Erros e exceções

**Webhook**: `/webhook/agente-dev`

**Coleta de Dados**:
- Status da API Docs
- Health check do Frontend
- Erros da API
- Respostas HTTP

**Análise**:
- Diagnóstico de problemas de código
- Identificação de bugs
- Correções sugeridas
- Planos de ação com mudanças de código

### 4. Agente de Banco de Dados
**Arquivo**: `n8n_workflow_agente_database.json`

**Especialização**:
- PostgreSQL
- Supabase
- Queries e performance
- Índices e otimização
- Locks e deadlocks
- Conexões

**Webhook**: `/webhook/agente-database`

**Coleta de Dados**:
- Status de conexões
- Tamanhos de tabelas
- Queries lentas
- Locks ativos

**Análise**:
- Diagnóstico de problemas de banco
- Identificação de queries problemáticas
- Recomendações de índices
- Planos de ação para otimização

## 🔄 Fluxo de Execução

### 1. Trigger Periódico
```
Agente Orquestrador inicia execução
```

### 2. Coleta Inicial
```
Orquestrador executa health checks:
- API Health
- Métricas
- Frontend
- Conexões DB
```

### 3. Análise e Decisão
```
Orquestrador analisa resultados:
- Detecta problemas
- Classifica por tipo
- Decide quais agentes chamar
```

### 4. Chamada de Sub-Agentes
```
Orquestrador chama sub-agentes via HTTP:
- POST /webhook/agente-infra
- POST /webhook/agente-dev
- POST /webhook/agente-database
```

### 5. Processamento Paralelo
```
Cada sub-agente:
- Recebe tarefa
- Coleta dados específicos
- Analisa com Claude AI
- Retorna diagnóstico e plano de ação
```

### 6. Consolidação
```
Orquestrador:
- Recebe respostas de todos os agentes
- Consolida análises
- Cria plano de ação unificado
- Gera relatório
```

### 7. Notificação
```
Orquestrador envia:
- Notificação Slack
- Email Gmail
- Aguarda aprovação
```

## 📊 Estrutura de Dados

### Payload do Orquestrador para Sub-Agentes

```json
{
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-12-20T10:00:00Z",
  "orchestratorDecision": {
    "timestamp": "2024-12-20T10:00:00Z",
    "reasoning": "Detectados problemas de API e banco",
    "priority": "high"
  },
  "issues": [
    {
      "type": "infrastructure",
      "severity": "critical",
      "component": "backend",
      "message": "API retornou status 500"
    }
  ],
  "context": {
    "api": { "status": "unhealthy", "statusCode": 500 },
    "metrics": { "status": "available" },
    "frontend": { "status": "healthy" },
    "database": { "totalConnections": 45 }
  }
}
```

### Resposta do Sub-Agente

```json
{
  "agent": {
    "name": "Agente de Infraestrutura",
    "version": "1.0",
    "specialization": ["Linux", "Docker", "Rede"]
  },
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-12-20T10:00:15Z",
  "issues": [...],
  "diagnosis": {
    "summary": "Problema identificado...",
    "rootCause": "Causa raiz...",
    "impact": "Alto",
    "severity": "critical"
  },
  "actionPlan": [
    {
      "id": 1,
      "description": "Reiniciar serviço API",
      "type": "automated",
      "commands": ["docker service update --force credgestor_api"],
      "requiresApproval": true
    }
  ],
  "severity": "critical",
  "requiresApproval": true,
  "hasIssues": true
}
```

### Relatório Consolidado

```json
{
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-12-20T10:00:00Z",
  "orchestrator": {
    "name": "Agente Orquestrador CredGestor",
    "version": "1.0"
  },
  "issues": [...],
  "agentAnalyses": [
    { "agentType": "infra", "response": {...} },
    { "agentType": "database", "response": {...} }
  ],
  "summary": {
    "totalAgentsCalled": 2,
    "agentsWithIssues": 2,
    "criticalIssues": 1,
    "totalActions": 5
  },
  "consolidatedActionPlan": [
    {
      "id": 1,
      "description": "Ação do agente infra",
      "agent": "infra",
      "agentName": "Agente de Infraestrutura"
    }
  ],
  "requiresApproval": true
}
```

## 🚀 Configuração

### 1. Variáveis de Ambiente

```bash
# LLM
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sua_chave_aqui

# Prompts
PROMPT_INFRA_SPECIALIST=<conteúdo do prompt>
PROMPT_DEV_SPECIALIST=<conteúdo do prompt>
PROMPT_DB_SPECIALIST=<conteúdo do prompt>  # Opcional, usa PROMPT_INFRA_SPECIALIST se não definido

# URLs dos Sub-Agentes (webhooks)
WORKFLOW_AGENTE_INFRA_URL=http://localhost:5678/webhook/agente-infra
WORKFLOW_AGENTE_DEV_URL=http://localhost:5678/webhook/agente-dev
WORKFLOW_AGENTE_DB_URL=http://localhost:5678/webhook/agente-database

# Email
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br
```

### 2. Importar Workflows

1. **Agente Orquestrador**: `n8n_workflow_orquestrador.json`
2. **Agente Infra**: `n8n_workflow_agente_infra.json`
3. **Agente Dev**: `n8n_workflow_agente_dev.json`
4. **Agente Database**: `n8n_workflow_agente_database.json`

### 3. Ativar Workflows

**Ordem de ativação**:
1. Primeiro: Ative os sub-agentes (Infra, Dev, Database)
2. Depois: Ative o Orquestrador

**Importante**: Os sub-agentes devem estar ativos antes do orquestrador, pois ele chama eles via webhook.

## 🔧 Comunicação entre Agentes

### Método: HTTP Webhooks

O orquestrador chama os sub-agentes via POST para seus webhooks:

```
POST http://localhost:5678/webhook/agente-infra
POST http://localhost:5678/webhook/agente-dev
POST http://localhost:5678/webhook/agente-database
```

### Timeout

- Orquestrador aguarda até 60 segundos por resposta
- Sub-agentes devem responder dentro deste tempo

### Retry

O orquestrador não implementa retry automático. Se um sub-agente falhar:
- A análise continua com os outros agentes
- O relatório consolidado indicará quais agentes falharam

## 📈 Vantagens da Arquitetura Multi-Agente

1. **Especialização**: Cada agente foca em sua área de expertise
2. **Escalabilidade**: Fácil adicionar novos agentes especializados
3. **Paralelismo**: Sub-agentes podem trabalhar simultaneamente
4. **Manutenibilidade**: Código separado e focado
5. **Reutilização**: Sub-agentes podem ser chamados independentemente
6. **Testabilidade**: Cada agente pode ser testado isoladamente

## 🔍 Monitoramento

### Logs do Orquestrador

Verifique em **Executions** do n8n:
- Quais agentes foram chamados
- Tempo de resposta de cada agente
- Resultados consolidados

### Logs dos Sub-Agentes

Cada sub-agente tem suas próprias execuções:
- Verifique individualmente
- Analise diagnósticos específicos
- Veja planos de ação gerados

## 🆘 Troubleshooting

### Sub-agente não responde

1. Verifique se o workflow está ativo
2. Verifique se o webhook está acessível
3. Veja logs do sub-agente
4. Verifique timeout configurado

### Orquestrador não chama sub-agentes

1. Verifique se detectou problemas
2. Verifique lógica de decisão
3. Veja logs do orquestrador
4. Verifique URLs dos webhooks

### Respostas inconsistentes

1. Verifique formato JSON esperado
2. Verifique processamento de resposta
3. Veja logs de consolidação

## 📚 Próximos Passos

- [ ] Adicionar mais sub-agentes (Rede, Segurança, Performance)
- [ ] Implementar retry automático
- [ ] Adicionar cache de análises
- [ ] Dashboard de monitoramento dos agentes
- [ ] Histórico de decisões do orquestrador

---

**Versão**: 1.0  
**Data**: 2024-12-20  
**Status**: ✅ Pronto para uso
