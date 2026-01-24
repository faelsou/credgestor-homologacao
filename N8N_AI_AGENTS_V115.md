# 🤖 Workflow AI Agents n8n v1.115 - CredGestor

## 📋 Visão Geral

Workflow unificado usando **AI Agents** do n8n versão 1.115 para monitorar e resolver problemas da aplicação **CredGestor** na VPS 167.235.76.26.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│     Monitoramento Periódico (a cada 15 minutos)        │
│  - Health Check API                                      │
│  - Verificar Métricas                                    │
│  - Health Check Frontend                                 │
│  - Verificar Conexões DB                                 │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│     AI Agent - Orquestrador                              │
│  - Chat Model: Claude.ai                                 │
│  - Memory: Buffer Window                                 │
│  - Decide quais agentes especializados chamar            │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴───────┬──────────────┬──────────────┐
       │               │              │              │
       ▼               ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ AI Agent    │ │ AI Agent    │ │ AI Agent    │ │ AI Agent    │
│ Containers  │ │ Infraestrutura│ │ Database   │ │ Fullstack  │
│             │ │             │ │             │ │             │
│ 🔍 Troubleshooting + 🔧 Resolução (unificado) │
│ - Docker    │ │ - Linux     │ │ - PostgreSQL│ │ - React     │
│ - Swarm     │ │ - Traefik   │ │ - Supabase  │ │ - FastAPI   │
│ - Logs      │ │ - Rede      │ │ - Queries   │ │ - Código    │
│ - Recursos  │ │ - Monitor   │ │ - Performance│ │ - Integração│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## 🎯 Agentes Especializados

### 1. AI Agent - Containers
**Especialização**: Docker Swarm, Containers, Serviços, Logs, Recursos

**Prompt Completo**: `prompts/containers_specialist_prompt.txt`

**Funcionalidades**:
- ✅ Troubleshooting de containers Docker Swarm
- ✅ Análise de logs e recursos
- ✅ Resolução com comandos Docker Swarm
- ✅ Instruções de conexão VPS

### 2. AI Agent - Infraestrutura
**Especialização**: Linux, Rede, Traefik, Monitoramento

**Prompt Completo**: `prompts/infrastructure_specialist_prompt.txt`

**Funcionalidades**:
- ✅ Troubleshooting de infraestrutura Linux
- ✅ Análise de Traefik e rede
- ✅ Resolução com comandos Linux/SSH
- ✅ Instruções de conexão VPS

### 3. AI Agent - Database
**Especialização**: PostgreSQL, Supabase, Queries, Performance

**Prompt Completo**: `prompts/db_specialist_prompt.txt`

**Funcionalidades**:
- ✅ Troubleshooting de banco de dados
- ✅ Análise de queries e performance
- ✅ Resolução com queries SQL seguras
- ✅ Considerações de multi-tenancy

### 4. AI Agent - Fullstack
**Especialização**: React, FastAPI, Código, Integração

**Prompt Completo**: `prompts/dev_specialist_prompt.txt`

**Funcionalidades**:
- ✅ Troubleshooting de código
- ✅ Análise de frontend e backend
- ✅ Resolução com mudanças de código
- ✅ Considerações de multi-tenancy

## 📁 Arquivos

### Workflow Principal
- **`n8n_workflow_ai_agents_v115.json`** - Workflow completo para n8n 1.115

### Prompts dos Especialistas
- **`prompts/containers_specialist_prompt.txt`** - Prompt do agente de containers
- **`prompts/infrastructure_specialist_prompt.txt`** - Prompt do agente de infraestrutura
- **`prompts/db_specialist_prompt.txt`** - Prompt do agente de banco de dados
- **`prompts/dev_specialist_prompt.txt`** - Prompt do agente fullstack

## 🚀 Configuração

### 1. Variáveis de Ambiente

```bash
# LLM
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sua_chave_aqui

# Email
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br
```

### 2. Credenciais Necessárias

1. **Anthropic API** - Para os AI Agents
2. **PostgreSQL** - Para salvar relatórios
3. **Slack API** - Para notificações
4. **Gmail OAuth2** - Para envio de emails

### 3. Importar Workflow

1. Acesse o n8n
2. Vá em **Workflows** → **Import from File**
3. Selecione `n8n_workflow_ai_agents_v115.json`
4. Configure as credenciais necessárias

### 4. Configurar AI Agents

Após importar, configure cada AI Agent:

1. **AI Agent - Orquestrador**:
   - Conecte ao **Chat Model Claude**
   - Conecte ao **Memory Buffer**
   - O prompt já está configurado

2. **AI Agent - Containers**:
   - Conecte ao **Anthropic Chat Model**
   - Conecte ao **Memory Buffer**
   - O prompt já está configurado

3. **AI Agent - Infraestrutura**:
   - Conecte ao **Anthropic Chat Model**
   - Conecte ao **Memory Buffer**
   - O prompt já está configurado

4. **AI Agent - Database**:
   - Conecte ao **Anthropic Chat Model**
   - Conecte ao **Memory Buffer**
   - O prompt já está configurado

5. **AI Agent - Fullstack**:
   - Conecte ao **Anthropic Chat Model**
   - Conecte ao **Memory Buffer**
   - O prompt já está configurado

## 🔄 Fluxo de Execução

### 1. Trigger Periódico
```
Monitoramento Periódico inicia (a cada 15 minutos)
```

### 2. Coleta de Dados
```
Executa health checks:
- API Health
- Métricas
- Frontend
- Conexões DB
```

### 3. Agregação
```
Agrega dados e detecta problemas
```

### 4. Decisão do Orquestrador
```
AI Agent - Orquestrador usa Claude.ai para:
- Analisar dados coletados
- Decidir quais agentes especializados chamar
- Priorizar problemas
```

### 5. Execução dos Agentes Especializados
```
Cada agente especializado:
- Recebe dados do orquestrador
- Faz troubleshooting (diagnóstico, evidências)
- Gera resolução (plano de execução com comandos)
- Retorna ambos: troubleshooting + resolution
```

### 6. Consolidação
```
Agrega respostas de todos os agentes
Salva relatório no banco
```

### 7. Notificação
```
Envia:
- Notificação Slack
- Email Gmail
- Aguarda aprovação
```

## 📊 Estrutura de Dados

### Resposta dos Agentes

Cada agente retorna JSON com:

```json
{
  "troubleshooting": {
    "diagnosis": {
      "summary": "Resumo executivo",
      "rootCause": "Causa raiz",
      "severity": "critical|high|medium|low"
    },
    "actionPlan": [...]
  },
  "resolution": {
    "executionPlan": [
      {
        "description": "Ação corretiva",
        "dockerCommands": ["comando1"],
        "sshCommands": ["ssh root@167.235.76.26 'comando1'"],
        "verification": "Como verificar",
        "rollback": "Como reverter"
      }
    ],
    "vpsConnection": {
      "host": "167.235.76.26",
      "user": "root",
      "instructions": "Instruções detalhadas"
    }
  }
}
```

## ✨ Características

1. ✅ **Foco na VPS**: Monitora APENAS a aplicação CredGestor na VPS 167.235.76.26
2. ✅ **4 Agentes Especializados**: Containers, Infraestrutura, Database, Fullstack
3. ✅ **Troubleshooting + Resolução**: Cada agente faz ambos
4. ✅ **Prompts Completos**: Todos os prompts dos especialistas incluídos
5. ✅ **Instruções VPS**: Cada agente inclui instruções de conexão SSH
6. ✅ **n8n 1.115**: Usa estrutura de AI Agents com Chat Model e Memory

## 🔍 Monitoramento

### Verificar Execuções

1. Acesse o n8n
2. Vá em **Executions**
3. Verifique:
   - Execuções do workflow
   - Respostas dos AI Agents
   - Relatórios salvos

### Logs Importantes

- **Orquestrador**: Decisões e coordenação
- **Agentes**: Troubleshooting + resolução

## 🆘 Troubleshooting

### AI Agent não responde

1. Verifique credenciais do Anthropic API
2. Verifique conexões do Chat Model
3. Verifique Memory Buffer configurado
4. Veja logs do agente

### Orquestrador não decide corretamente

1. Verifique se há problemas detectados
2. Verifique prompt do orquestrador
3. Veja logs do orquestrador
4. Verifique resposta do Claude.ai

## 📚 Documentação Relacionada

- `INSTRUCOES_CONEXAO_VPS.md` - Instruções de conexão SSH
- `N8N_WORKFLOW_UNIFICADO.md` - Documentação do workflow unificado anterior

## 🎯 Diferenciais

- ✅ **n8n 1.115**: Usa estrutura moderna de AI Agents
- ✅ **Foco VPS**: Monitora apenas CredGestor na VPS
- ✅ **4 Agentes**: Containers, Infraestrutura, Database, Fullstack
- ✅ **Prompts Completos**: Todos os prompts incluídos
- ✅ **Troubleshooting + Resolução**: Integrado em cada agente

---

**Versão**: 1.115  
**Data**: 2024-12-20  
**Status**: ✅ Pronto para uso
