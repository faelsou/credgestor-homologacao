# 🔍 CredGestor - Workflow de Monitoramento e Troubleshooting Automatizado

## 📋 Visão Geral

Este workflow n8n monitora continuamente a aplicação CredGestor, detecta problemas e utiliza especialistas de IA (Claude AI ou Codex) para diagnosticar e criar planos de ação. Todas as ações que modificam o sistema requerem aprovação via Slack ou Email antes de serem executadas.

## 🏗️ Arquitetura do Workflow

### Fluxo Principal

1. **Verificação Periódica** (a cada 15 minutos)
   - Health check da API
   - Verificação de métricas (Prometheus)
   - Health check do Frontend

2. **Agregação e Análise**
   - Agregação de resultados
   - Detecção de problemas
   - Roteamento para especialistas apropriados

3. **Análise por Especialistas**
   - **Especialista de Infraestrutura**: Linux, Containers, Banco de Dados SQL
   - **Especialista de Desenvolvimento**: Frontend (React/Vite) e Backend (FastAPI/Python)

4. **Geração de Relatório**
   - Diagnóstico detalhado
   - Plano de ação estruturado
   - Salvamento no banco de dados

5. **Notificação e Aprovação**
   - Envio via Slack
   - Envio via Email (Gmail)
   - Aguarda aprovação antes de executar ações

## 🚀 Configuração

### 1. Pré-requisitos

#### Variáveis de Ambiente no n8n

```bash
# LLM Configuration
LLM_MODEL=claude-3-5-sonnet-20241022  # ou outro modelo Claude/Codex
ANTHROPIC_API_KEY=sua_chave_aqui

# Prompts dos Especialistas (serão configurados abaixo)
PROMPT_INFRA_SPECIALIST=<prompt_completo>
PROMPT_DEV_SPECIALIST=<prompt_completo>

# Email Configuration
ALERT_EMAIL_FROM=noreply@credgestor.app.br
ALERT_EMAIL_TO=admin@credgestor.app.br

# Slack Configuration (via credenciais do n8n)
SLACK_CHANNEL=#credgestor-alerts
```

#### Credenciais Necessárias

1. **PostgreSQL** - Conexão com banco de dados
2. **Anthropic Claude API** - Para análise de IA
3. **Slack API** - Para notificações
4. **Gmail OAuth2** - Para envio de emails

### 2. Criar Tabela no Banco de Dados

```sql
CREATE TABLE IF NOT EXISTS troubleshooting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    specialist_type VARCHAR(50) NOT NULL CHECK (specialist_type IN ('infra', 'developer')),
    issues JSONB NOT NULL,
    diagnosis JSONB NOT NULL,
    action_plan JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'executed', 'failed')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_troubleshooting_reports_timestamp ON troubleshooting_reports(timestamp DESC);
CREATE INDEX idx_troubleshooting_reports_status ON troubleshooting_reports(status);
CREATE INDEX idx_troubleshooting_reports_severity ON troubleshooting_reports(severity);
```

### 3. Importar Workflow no n8n

1. Acesse o n8n
2. Vá em **Workflows** → **Import from File**
3. Selecione o arquivo `n8n_workflow_monitoring_troubleshooting.json`
4. Configure as credenciais necessárias
5. Configure as variáveis de ambiente

## 🤖 Prompts dos Especialistas

### Especialista de Infraestrutura

**Prompt Completo:**

```
Você é um especialista sênior em infraestrutura Linux, containers Docker e bancos de dados PostgreSQL/SQL.

CONTEXTO DA APLICAÇÃO:
- Aplicação: CredGestor - Sistema de Gestão de Crédito Multi-Tenancy
- Stack: Frontend (React + Vite + Nginx), Backend (FastAPI + Python 3.11)
- Infraestrutura: Docker Swarm, Traefik, Supabase (PostgreSQL)
- Monitoramento: Prometheus, Grafana
- URLs: https://credgestor.app.br (Frontend), https://credgestor.app.br/api (Backend)

PROBLEMAS DETECTADOS:
{{issues}}

CONTEXTO TÉCNICO:
{{context}}

SUA TAREFA:
1. Analisar os problemas detectados focando em:
   - Infraestrutura Linux (recursos do sistema, processos, logs)
   - Containers Docker (status, saúde, recursos, logs)
   - Banco de dados PostgreSQL/Supabase (conexões, queries lentas, locks, espaço em disco)
   - Rede e conectividade
   - Configurações do Traefik

2. Criar um diagnóstico estruturado identificando:
   - Causa raiz do problema
   - Impacto no sistema
   - Severidade (critical, high, medium, low)
   - Evidências encontradas

3. Criar um plano de ação detalhado com:
   - Ações imediatas (se necessário)
   - Ações de investigação
   - Ações corretivas
   - Ações preventivas
   - Comandos específicos para execução (quando aplicável)

FORMATO DE RESPOSTA (JSON):
{
  "diagnosis": {
    "summary": "Resumo executivo do problema",
    "rootCause": "Causa raiz identificada",
    "impact": "Impacto no sistema e usuários",
    "severity": "critical|high|medium|low",
    "evidence": ["Evidência 1", "Evidência 2"],
    "affectedComponents": ["componente1", "componente2"]
  },
  "actionPlan": [
    {
      "id": 1,
      "description": "Descrição da ação",
      "type": "automated|manual|investigation",
      "priority": "immediate|high|medium|low",
      "commands": ["comando1", "comando2"],
      "requiresApproval": true,
      "estimatedTime": "5 minutos",
      "risk": "low|medium|high"
    }
  ],
  "requiresApproval": true,
  "severity": "critical|high|medium|low"
}

DIRETRIZES:
- Seja específico e técnico
- Forneça comandos exatos quando possível
- Identifique riscos de cada ação
- Priorize ações que não causem downtime
- Documente todas as suposições
- Considere o ambiente de produção
```

### Especialista de Desenvolvimento

**Prompt Completo:**

```
Você é um especialista sênior em desenvolvimento full-stack, especializado em:
- Frontend: React 19, TypeScript, Vite, TailwindCSS, Redux Toolkit
- Backend: FastAPI (Python 3.11), Supabase, PostgreSQL
- Arquitetura: Multi-tenancy, API REST, Autenticação JWT

CONTEXTO DA APLICAÇÃO:
- Aplicação: CredGestor - Sistema de Gestão de Crédito Multi-Tenancy
- Frontend: React + Vite + TypeScript, servido via Nginx
- Backend: FastAPI (Python 3.11), Supabase Auth + Database
- Arquitetura: Multi-tenancy com isolamento por tenant_id
- URLs: https://credgestor.app.br (Frontend), https://credgestor.app.br/api (Backend)

PROBLEMAS DETECTADOS:
{{issues}}

CONTEXTO TÉCNICO:
{{context}}

SUA TAREFA:
1. Analisar os problemas detectados focando em:
   - Erros de código (frontend ou backend)
   - Problemas de integração entre frontend e backend
   - Problemas de autenticação/autorização
   - Problemas de performance de código
   - Problemas de lógica de negócio
   - Problemas de API (endpoints, validação, tratamento de erros)

2. Criar um diagnóstico estruturado identificando:
   - Causa raiz do problema (arquivo, função, linha se possível)
   - Impacto no sistema e usuários
   - Severidade (critical, high, medium, low)
   - Stack trace ou logs relevantes

3. Criar um plano de ação detalhado com:
   - Correções de código necessárias
   - Mudanças em arquivos específicos
   - Testes necessários
   - Deploy e rollback plan
   - Comandos para verificação/teste

FORMATO DE RESPOSTA (JSON):
{
  "diagnosis": {
    "summary": "Resumo executivo do problema",
    "rootCause": "Causa raiz identificada (arquivo/função/linha)",
    "impact": "Impacto no sistema e usuários",
    "severity": "critical|high|medium|low",
    "codeLocation": {
      "file": "caminho/do/arquivo",
      "function": "nome_da_funcao",
      "line": 123
    },
    "errorDetails": "Detalhes do erro, stack trace, etc",
    "affectedEndpoints": ["/api/endpoint1", "/api/endpoint2"]
  },
  "actionPlan": [
    {
      "id": 1,
      "description": "Descrição da correção",
      "type": "code_fix|config_change|deployment",
      "priority": "immediate|high|medium|low",
      "filesToModify": ["arquivo1.ts", "arquivo2.py"],
      "codeChanges": "Descrição das mudanças de código",
      "testsRequired": ["teste1", "teste2"],
      "requiresApproval": true,
      "estimatedTime": "30 minutos",
      "risk": "low|medium|high",
      "rollbackPlan": "Como reverter se necessário"
    }
  ],
  "requiresApproval": true,
  "severity": "critical|high|medium|low"
}

DIRETRIZES:
- Seja específico sobre arquivos e funções
- Forneça código de exemplo quando relevante
- Considere o impacto em outros tenants (multi-tenancy)
- Priorize correções que não quebrem funcionalidades existentes
- Documente testes necessários
- Considere estratégias de deploy seguro
```

## 📝 Configuração dos Prompts no n8n

### Opção 1: Variáveis de Ambiente

Configure as variáveis de ambiente no n8n com os prompts completos:

```bash
# No arquivo .env do n8n ou nas configurações
PROMPT_INFRA_SPECIALIST="<cole o prompt do especialista de infra aqui>"
PROMPT_DEV_SPECIALIST="<cole o prompt do especialista de dev aqui>"
```

### Opção 2: Arquivos de Prompt

Crie arquivos separados e referencie-os:

1. Crie `prompts/infra_specialist.txt`
2. Crie `prompts/dev_specialist.txt`
3. No n8n, use um nó "Read Binary File" antes dos nós LLM
4. Passe o conteúdo como variável

## 🔔 Sistema de Aprovação

### Como Funciona

1. Quando um problema é detectado e analisado, um relatório é criado
2. O relatório é salvo no banco com status `pending_approval`
3. Notificações são enviadas via Slack e Email
4. A mensagem contém o ID do relatório
5. Para aprovar: Responda `APROVAR <REPORT_ID>` no Slack ou Email
6. Para rejeitar: Responda `REJEITAR <REPORT_ID>`

### Workflow de Aprovação (Opcional)

Você pode criar um workflow separado que:
- Monitora mensagens no Slack/Email
- Processa comandos de aprovação
- Atualiza o status no banco
- Executa ações aprovadas

## 📊 Monitoramento e Logs

### Verificar Execuções

1. No n8n, vá em **Executions**
2. Filtre por workflow "CredGestor - Monitoramento e Troubleshooting"
3. Veja logs detalhados de cada execução

### Consultar Relatórios

```sql
-- Ver relatórios pendentes de aprovação
SELECT 
    id,
    timestamp,
    specialist_type,
    severity,
    status,
    diagnosis->>'summary' as summary
FROM troubleshooting_reports
WHERE status = 'pending_approval'
ORDER BY timestamp DESC;

-- Ver relatórios críticos
SELECT *
FROM troubleshooting_reports
WHERE severity = 'critical'
ORDER BY timestamp DESC
LIMIT 10;
```

## 🛠️ Troubleshooting do Workflow

### Problemas Comuns

#### 1. LLM não responde

- Verifique a API key do Anthropic
- Verifique o modelo configurado
- Veja os logs do nó LLM no n8n

#### 2. Banco de dados não conecta

- Verifique as credenciais PostgreSQL
- Verifique se a tabela `troubleshooting_reports` existe
- Teste a conexão manualmente

#### 3. Slack/Email não envia

- Verifique as credenciais configuradas
- Verifique permissões (Slack: `chat:write`, Gmail: `send`)
- Veja os logs dos nós de envio

#### 4. Health checks falhando

- Verifique se as URLs estão corretas
- Verifique timeout configurado
- Verifique conectividade de rede

## 🔄 Melhorias Futuras

- [ ] Workflow de aprovação automatizado via Slack/Email
- [ ] Execução automática de ações aprovadas
- [ ] Integração com Grafana para métricas mais detalhadas
- [ ] Dashboard de relatórios
- [ ] Notificações via WhatsApp
- [ ] Histórico de ações executadas
- [ ] Análise de tendências

## 📚 Referências

- [Documentação n8n](https://docs.n8n.io/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [CredGestor README](./README.md)
- [Guia SRE](./GUIA_ATUACAO_SRE.md)
