# 🤖 Workflow Unificado Multi-Agente - CredGestor

## 📋 Visão Geral

Este é um **workflow único e integrado** que combina monitoramento, troubleshooting e resolução de problemas em um único fluxo, coordenado por um orquestrador inteligente usando Claude.ai.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│     Workflow Unificado (Orquestrador + Claude.ai)       │
│  - Monitora aplicação periodicamente                    │
│  - Usa Claude.ai para decisões inteligentes             │
│  - Coordena agentes especializados                       │
│  - Consolida troubleshooting + resolução                │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴───────┬──────────────┐
       │               │              │
       ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Agente      │ │ Agente     │ │ Agente     │
│ Containers  │ │ Database   │ │ Development│
│             │ │            │ │            │
│ 🔍 Troubleshooting + 🔧 Resolução (unificado) │
│ - Docker    │ │ - PostgreSQL│ │ - React    │
│ - Swarm     │ │ - Supabase  │ │ - FastAPI  │
│ - Logs      │ │ - Queries  │ │ - Código   │
│ - Recursos  │ │ - Performance│ │ - Integração│
└─────────────┘ └─────────────┘ └─────────────┘
```

## 🔄 Fluxo Completo

### 1. Trigger Periódico
```
Workflow inicia execução (a cada 15 minutos)
```

### 2. Coleta Inicial
```
Orquestrador executa health checks:
- API Health
- Métricas
- Frontend
- Conexões DB
```

### 3. Análise com Claude.ai
```
Orquestrador usa Claude.ai para:
- Analisar dados coletados
- Decidir quais agentes especializados chamar
- Priorizar problemas
```

### 4. Agentes Especializados (Troubleshooting + Resolução)
```
Cada agente especializado:
- Recebe tarefa do orquestrador
- Coleta dados específicos
- Faz TROUBLESHOOTING (diagnóstico, evidências)
- Gera RESOLUÇÃO (plano de execução com comandos)
- Retorna ambos: troubleshooting + resolution
```

### 5. Consolidação
```
Orquestrador:
- Recebe respostas de todos os agentes
- Consolida troubleshooting
- Consolida planos de resolução
- Salva relatório no banco
```

### 6. Notificação
```
Orquestrador envia:
- Notificação Slack com troubleshooting + resolução
- Email Gmail
- Aguarda aprovação
```

## 🎯 Agentes Especializados

### 1. Agente Especialista em Containers
**Arquivo**: `n8n_workflow_agente_containers.json`  
**Webhook**: `/webhook/agente-containers`

**Especialização**:
- Docker Swarm
- Containers e serviços
- Logs de containers
- Recursos do sistema (CPU, memória, disco)
- Rede Docker
- Volumes

**Funcionalidades**:
- ✅ **Troubleshooting**: Diagnóstico de problemas em containers
- ✅ **Resolução**: Gera comandos Docker Swarm e SSH para execução

**Exemplo de Resposta**:
```json
{
  "troubleshooting": {
    "diagnosis": {
      "summary": "Serviço credgestor_api está com alta utilização de CPU",
      "rootCause": "Processo travado consumindo 100% CPU",
      "severity": "critical"
    },
    "actionPlan": [...]
  },
  "resolution": {
    "executionPlan": [
      {
        "description": "Reiniciar serviço API",
        "dockerCommands": ["docker service update --force credgestor_api"],
        "sshCommands": ["ssh root@167.235.76.26 'docker service update --force credgestor_api'"],
        "verification": "docker service ls | grep credgestor_api"
      }
    ],
    "vpsConnection": {
      "host": "167.235.76.26",
      "user": "root",
      "instructions": "Instruções detalhadas de conexão SSH"
    }
  }
}
```

### 2. Agente Especialista em Banco de Dados
**Arquivo**: `n8n_workflow_agente_database.json` (atualizado)  
**Webhook**: `/webhook/agente-database`

**Especialização**:
- PostgreSQL
- Supabase
- Queries e performance
- Índices
- Locks

**Funcionalidades**:
- ✅ **Troubleshooting**: Diagnóstico de problemas de banco
- ✅ **Resolução**: Gera queries SQL seguras e comandos

### 3. Agente Especialista em Desenvolvimento
**Arquivo**: `n8n_workflow_agente_dev.json` (atualizado)  
**Webhook**: `/webhook/agente-dev`

**Especialização**:
- React, TypeScript
- FastAPI, Python
- Código e integração

**Funcionalidades**:
- ✅ **Troubleshooting**: Diagnóstico de problemas de código
- ✅ **Resolução**: Gera mudanças de código e comandos de deploy

## 📁 Arquivos do Workflow Unificado

### Workflow Principal
- **`n8n_workflow_unificado_completo.json`** - Workflow único integrado

### Agentes Especializados
- **`n8n_workflow_agente_containers.json`** - Agente de containers (troubleshooting + resolução)
- **`n8n_workflow_agente_database.json`** - Agente de banco de dados (atualizar para modo unificado)
- **`n8n_workflow_agente_dev.json`** - Agente de desenvolvimento (atualizar para modo unificado)

## 🚀 Configuração

### Variáveis de Ambiente

```bash
# LLM
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sua_chave_aqui

# URLs dos Agentes Especializados
WORKFLOW_AGENTE_CONTAINERS_URL=http://localhost:5678/webhook/agente-containers
WORKFLOW_AGENTE_DB_URL=http://localhost:5678/webhook/agente-database
WORKFLOW_AGENTE_DEV_URL=http://localhost:5678/webhook/agente-dev

# Email
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br
```

### Ordem de Importação

1. **Agentes Especializados** (devem estar ativos primeiro):
   - `n8n_workflow_agente_containers.json`
   - `n8n_workflow_agente_database.json`
   - `n8n_workflow_agente_dev.json`

2. **Workflow Unificado** (por último):
   - `n8n_workflow_unificado_completo.json`

### Ordem de Ativação

1. Ative os **agentes especializados** primeiro
2. Por último, ative o **workflow unificado**

## 📊 Estrutura de Dados

### Payload para Agentes

```json
{
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-12-20T10:00:00Z",
  "orchestratorDecision": {
    "reasoning": "Problemas detectados em containers",
    "priority": "high"
  },
  "issues": [
    {
      "type": "infrastructure",
      "severity": "critical",
      "component": "backend",
      "message": "API ou métricas com problemas"
    }
  ],
  "context": {
    "api": { "status": "unhealthy", "statusCode": 500 },
    "metrics": { "status": "available" }
  },
  "mode": "troubleshooting_and_resolution"
}
```

### Resposta dos Agentes

```json
{
  "agent": {
    "name": "Agente Especialista em Containers",
    "version": "2.0"
  },
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-12-20T10:00:15Z",
  "issues": [...],
  "troubleshooting": {
    "diagnosis": {
      "summary": "Problema identificado...",
      "rootCause": "Causa raiz...",
      "severity": "critical"
    },
    "actionPlan": [
      {
        "id": 1,
        "description": "Investigar logs do serviço",
        "type": "investigation",
        "commands": ["docker service logs credgestor_api --tail 100"]
      }
    ],
    "requiresApproval": false
  },
  "resolution": {
    "validation": {
      "safeToExecute": true,
      "risks": ["risco1"],
      "recommendations": ["recomendação1"]
    },
    "executionPlan": [
      {
        "id": 1,
        "description": "Reiniciar serviço API",
        "dockerCommands": ["docker service update --force credgestor_api"],
        "sshCommands": ["ssh root@167.235.76.26 'docker service update --force credgestor_api'"],
        "verification": "docker service ls | grep credgestor_api",
        "rollback": "docker service rollback credgestor_api",
        "priority": "immediate",
        "requiresApproval": true
      }
    ],
    "vpsConnection": {
      "host": "167.235.76.26",
      "user": "root",
      "instructions": "Instruções detalhadas de conexão SSH"
    },
    "requiresApproval": true
  },
  "hasIssues": true
}
```

## ✨ Vantagens do Fluxo Unificado

1. ✅ **Simplicidade**: Um único workflow ao invés de múltiplos
2. ✅ **Eficiência**: Troubleshooting e resolução no mesmo agente
3. ✅ **Inteligência**: Claude.ai decide quais agentes chamar
4. ✅ **Completude**: Cada agente retorna diagnóstico + solução
5. ✅ **Manutenibilidade**: Código centralizado e organizado

## 🔍 Monitoramento

### Verificar Execuções

1. Acesse o n8n
2. Vá em **Executions**
3. Verifique:
   - Execuções do workflow unificado
   - Execuções dos agentes especializados

### Logs Importantes

- **Orquestrador**: Decisões e coordenação
- **Agentes**: Troubleshooting + resolução

## 🆘 Troubleshooting

### Agente não responde

1. Verifique se o workflow está ativo
2. Verifique se o webhook está acessível
3. Veja logs do agente
4. Verifique timeout configurado (120 segundos)

### Claude.ai não responde

1. Verifique `ANTHROPIC_API_KEY` configurada
2. Verifique conectividade com API
3. Veja logs de erro do HTTP Request
4. Verifique limite de tokens

## 📚 Documentação Relacionada

- `INSTRUCOES_CONEXAO_VPS.md` - Instruções de conexão SSH
- `N8N_WORKFLOW_MULTI_AGENTE_ATUALIZADO.md` - Arquitetura anterior (referência)

## 🎯 Próximos Passos

- [ ] Atualizar agentes database e development para modo unificado
- [ ] Implementar execução automática de ações aprovadas
- [ ] Adicionar histórico de execuções
- [ ] Dashboard de monitoramento

---

**Versão**: 2.0  
**Data**: 2024-12-20  
**Status**: ✅ Pronto para uso
