# 🤖 Workflow Multi-Agente Atualizado - CredGestor

## 📋 Resumo das Alterações

O workflow multi-agente foi atualizado para incluir:

1. ✅ **Agente Orquestrador com Claude.ai**: Usa Anthropic Claude para decisões inteligentes
2. ✅ **3 Sub-Agentes de Troubleshooting**: Infra, Banco de Dados, Desenvolvimento
3. ✅ **3 Agentes Resolutores**: Recebem plano de ação após troubleshooting
4. ✅ **Instruções de Conexão VPS**: Documentação completa para monitoramento

## 🏗️ Arquitetura Atualizada

```
┌─────────────────────────────────────────────────────────┐
│     Agente Orquestrador (com Claude.ai)                  │
│  - Monitora aplicação periodicamente                    │
│  - Usa Claude.ai para decisões inteligentes             │
│  - Coordena sub-agentes de troubleshooting              │
│  - Envia plano de ação para resolutores                 │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴───────┬──────────────┐
       │               │              │
       ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Troubleshooting Infra │ │ Troubleshooting DB │ │ Troubleshooting Dev │
│ - Diagnóstico        │ │ - Diagnóstico     │ │ - Diagnóstico       │
│ - Evidências         │ │ - Evidências      │ │ - Evidências       │
│ - Plano de Ação      │ │ - Plano de Ação   │ │ - Plano de Ação     │
└───────┬─────┘ └───────┬─────┘ └───────┬─────┘
        │              │              │
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Resolutor   │ │ Resolutor   │ │ Resolutor   │
│ Infra       │ │ Database    │ │ Dev         │
│ - Execução  │ │ - Execução  │ │ - Execução  │
│ - VPS       │ │ - SQL       │ │ - Código    │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 🔄 Fluxo Completo

### 1. Trigger Periódico
```
Agente Orquestrador inicia execução (a cada 15 minutos)
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
- Decidir quais sub-agentes chamar
- Priorizar problemas
```

### 4. Troubleshooting (Sub-Agentes)
```
Cada sub-agente especializado:
- Recebe tarefa do orquestrador
- Coleta dados específicos
- Analisa com Claude.ai
- Documenta evidências
- Gera plano de ação
- Retorna diagnóstico completo
```

### 5. Consolidação
```
Orquestrador:
- Recebe respostas de todos os sub-agentes
- Consolida análises
- Cria plano de ação unificado
- Salva relatório no banco
```

### 6. Envio para Resolutores
```
Orquestrador envia plano de ação para:
- Resolutor de Infra (se houver ações de infra)
- Resolutor de Database (se houver ações de DB)
- Resolutor de Dev (se houver ações de código)
```

### 7. Geração de Planos de Execução
```
Cada resolutor:
- Recebe plano de ação
- Valida ações com Claude.ai
- Gera comandos específicos
- Inclui instruções de conexão VPS
- Retorna plano de execução
```

### 8. Notificação
```
Orquestrador envia:
- Notificação Slack com troubleshooting + planos de execução
- Email Gmail
- Aguarda aprovação
```

## 📁 Arquivos Criados/Atualizados

### Novos Arquivos

1. **`n8n_workflow_resolutor_infra.json`**
   - Agente resolutor de infraestrutura
   - Webhook: `/webhook/resolutor-infra`
   - Gera comandos SSH para VPS

2. **`n8n_workflow_resolutor_database.json`**
   - Agente resolutor de banco de dados
   - Webhook: `/webhook/resolutor-database`
   - Gera queries SQL seguras

3. **`n8n_workflow_resolutor_dev.json`**
   - Agente resolutor de desenvolvimento
   - Webhook: `/webhook/resolutor-dev`
   - Gera mudanças de código e comandos de deploy

4. **`INSTRUCOES_CONEXAO_VPS.md`**
   - Documentação completa de conexão SSH
   - Comandos de monitoramento
   - Troubleshooting na VPS

### Arquivos Atualizados

1. **`n8n_workflow_orquestrador.json`**
   - Adicionado nó "Análise Inicial"
   - Adicionado nó "Preparar Prompt Claude"
   - Adicionado nó "Decisão com Claude AI"
   - Adicionado lógica para enviar para resolutores
   - Adicionado nós de processamento de respostas dos resolutores

## 🚀 Configuração

### Variáveis de Ambiente Necessárias

```bash
# LLM
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sua_chave_aqui

# Prompts (opcional, usa padrão se não definido)
PROMPT_INFRA_SPECIALIST=<conteúdo do prompt>
PROMPT_DEV_SPECIALIST=<conteúdo do prompt>
PROMPT_DB_SPECIALIST=<conteúdo do prompt>

# URLs dos Sub-Agentes de Troubleshooting
WORKFLOW_AGENTE_INFRA_URL=http://localhost:5678/webhook/agente-infra
WORKFLOW_AGENTE_DEV_URL=http://localhost:5678/webhook/agente-dev
WORKFLOW_AGENTE_DB_URL=http://localhost:5678/webhook/agente-database

# URLs dos Agentes Resolutores
WORKFLOW_RESOLUTOR_INFRA_URL=http://localhost:5678/webhook/resolutor-infra
WORKFLOW_RESOLUTOR_DEV_URL=http://localhost:5678/webhook/resolutor-dev
WORKFLOW_RESOLUTOR_DB_URL=http://localhost:5678/webhook/resolutor-database

# Email
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br
```

### Ordem de Importação dos Workflows

1. **Sub-Agentes de Troubleshooting** (devem estar ativos primeiro):
   - `n8n_workflow_agente_infra.json`
   - `n8n_workflow_agente_dev.json`
   - `n8n_workflow_agente_database.json`

2. **Agentes Resolutores**:
   - `n8n_workflow_resolutor_infra.json`
   - `n8n_workflow_resolutor_database.json`
   - `n8n_workflow_resolutor_dev.json`

3. **Agente Orquestrador** (por último):
   - `n8n_workflow_orquestrador.json`

### Ordem de Ativação

1. Ative os **sub-agentes de troubleshooting** primeiro
2. Ative os **agentes resolutores**
3. Por último, ative o **orquestrador**

## 📊 Estrutura de Dados

### Payload para Resolutores

```json
{
  "troubleshootingSessionId": "session_1234567890_abc123",
  "sessionId": "resolver_1234567890_infra",
  "timestamp": "2024-12-20T10:00:00Z",
  "actionPlan": [
    {
      "id": 1,
      "description": "Reiniciar serviço API",
      "type": "automated",
      "commands": ["docker service update --force credgestor_api"],
      "requiresApproval": true
    }
  ],
  "diagnosis": {
    "summary": "Problema identificado...",
    "rootCause": "Causa raiz...",
    "impact": "Alto"
  },
  "issues": [...],
  "context": {...}
}
```

### Resposta dos Resolutores

```json
{
  "resolver": {
    "name": "Resolutor de Infraestrutura",
    "version": "1.0"
  },
  "sessionId": "resolver_1234567890_infra",
  "timestamp": "2024-12-20T10:00:15Z",
  "validation": {
    "safeToExecute": true,
    "risks": ["risco1", "risco2"],
    "recommendations": ["recomendação1"]
  },
  "executionPlan": [
    {
      "id": 1,
      "actionId": "id_do_plano_original",
      "description": "Reiniciar serviço API",
      "commands": ["docker service update --force credgestor_api"],
      "sshCommands": ["ssh root@167.235.76.26 'docker service update --force credgestor_api'"],
      "expectedResult": "Serviço reiniciado com sucesso",
      "verification": "docker service ls | grep credgestor_api",
      "rollback": "docker service rollback credgestor_api",
      "priority": "immediate"
    }
  ],
  "vpsConnection": {
    "host": "167.235.76.26",
    "user": "root",
    "instructions": "Instruções detalhadas de conexão SSH"
  },
  "requiresApproval": true
}
```

## 🔍 Monitoramento

### Verificar Execuções

1. Acesse o n8n
2. Vá em **Executions**
3. Verifique:
   - Execuções do orquestrador
   - Execuções dos sub-agentes de troubleshooting
   - Execuções dos resolutores

### Logs Importantes

- **Orquestrador**: Decisões e coordenação
- **Sub-Agentes**: Diagnósticos e evidências
- **Resolutores**: Planos de execução e comandos

## 🆘 Troubleshooting

### Resolutor não responde

1. Verifique se o workflow está ativo
2. Verifique se o webhook está acessível
3. Veja logs do resolutor
4. Verifique timeout configurado (60 segundos)

### Orquestrador não chama resolutores

1. Verifique se há plano de ação consolidado
2. Verifique se há ações para enviar
3. Veja logs do orquestrador
4. Verifique URLs dos webhooks dos resolutores

### Claude.ai não responde

1. Verifique `ANTHROPIC_API_KEY` configurada
2. Verifique conectividade com API
3. Veja logs de erro do HTTP Request
4. Verifique limite de tokens

## 📚 Documentação Relacionada

- `N8N_ARQUITETURA_MULTI_AGENTE.md` - Arquitetura original
- `INSTRUCOES_CONEXAO_VPS.md` - Instruções de conexão
- `RESUMO_MULTI_AGENTE.md` - Resumo da arquitetura

## ✨ Melhorias Implementadas

1. ✅ **Decisões Inteligentes**: Orquestrador usa Claude.ai para decidir quais agentes chamar
2. ✅ **Troubleshooting Documentado**: Sub-agentes documentam evidências e problemas
3. ✅ **Planos de Execução**: Resolutores geram comandos específicos e seguros
4. ✅ **Instruções VPS**: Documentação completa para monitoramento
5. ✅ **Separação de Responsabilidades**: Troubleshooting vs Resolução

## 🎯 Próximos Passos

- [ ] Implementar execução automática de ações aprovadas
- [ ] Adicionar histórico de execuções
- [ ] Dashboard de monitoramento dos agentes
- [ ] Notificações mais detalhadas
- [ ] Integração com sistema de aprovação

---

**Versão**: 2.0  
**Data**: 2024-12-20  
**Status**: ✅ Pronto para uso
