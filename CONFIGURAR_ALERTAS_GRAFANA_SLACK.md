# 🚨 Configurar Alertas no Grafana e Enviar para Slack

Este guia explica como configurar alertas no Grafana baseados nas métricas do Prometheus e enviar notificações para o Slack.

> **💡 Guia Rápido**: Para um passo a passo visual e direto, consulte: [GUIA_RAPIDO_ALERTAS_GRAFANA.md](./GUIA_RAPIDO_ALERTAS_GRAFANA.md)

## 📋 Visão Geral

O Grafana permite criar alertas baseados em queries do Prometheus e enviar notificações para diversos canais, incluindo Slack. Vamos configurar alertas para:

- **Erros de Login**: Conexão e autenticação
- **Erros de CRUD**: Clientes, Empréstimos, Parcelas
- **Erros de Banco de Dados**: Conexão e queries

## 🚀 Passo a Passo

### 1. Configurar Notificação do Slack no Grafana

#### 1.1. Criar Webhook no Slack (se ainda não tiver)

1. Acesse https://api.slack.com/apps
2. Clique em **"Create New App"** → **"From scratch"**
3. Dê um nome (ex: "CredGestor Grafana Alerts") e selecione o workspace
4. Vá em **"Incoming Webhooks"** → Ative **"Activate Incoming Webhooks"**
5. Clique em **"Add New Webhook to Workspace"**
6. Selecione o canal (ex: `#credgestor-alerts`)
7. Copie a **Webhook URL**

#### 1.2. Configurar Notification Channel no Grafana

1. Acesse o Grafana (ex: `https://grafana.findfruit.com.br` ou via Traefik)
2. Vá em **Alerting** → **Notification channels** (ou **Alerting** → **Contact points** no Grafana 9+)
3. Clique em **"New channel"** ou **"Add contact point"**
4. Configure:
   - **Name**: `Slack - CredGestor Alerts`
   - **Type**: `Slack`
   - **Webhook URL**: Cole a URL do webhook do Slack
   - **Channel**: `#credgestor-alerts` (opcional, pode ser definido no webhook)
   - **Title**: `🚨 Alerta CredGestor`
   - **Text**: (deixe padrão ou personalize)
5. Clique em **"Test"** para verificar se funciona
6. Clique em **"Save"**

### 2. Criar Alertas no Dashboard

#### Opção A: Criar Alertas Manualmente no Dashboard

1. **Acesse ou crie um Dashboard**:
   - Vá em **Dashboards** → **New** → **New Dashboard**
   - OU edite um dashboard existente

2. **Adicionar Painel com Alerta**:
   - Clique em **"Add visualization"** ou **"Add panel"**
   - Configure a query do Prometheus:
     ```promql
     # Exemplo: Erro de conexão no login
     rate(login_connection_errors_total[5m])
     ```
   - Configure o painel (tipo: Graph, Stat, etc.)

3. **Configurar Alerta**:
   - Clique na aba **"Alert"** no painel
   - Clique em **"Create Alert"**
   - Configure:
     - **Alert name**: `LoginConnectionError`
     - **Evaluate every**: `30s`
     - **For**: `1m`
     - **Conditions**:
       - **WHEN**: `last()`
       - **OF**: `query(A, 5m, now)`
       - **IS ABOVE**: `0`
     - **No Data & Error Handling**: Escolha a ação apropriada
   - Em **Notifications**, selecione o canal do Slack criado
   - Clique em **"Save"**

#### Opção B: Usar Alert Rules (Grafana 8+)

1. Vá em **Alerting** → **Alert rules**
2. Clique em **"New alert rule"**
3. Configure:
   - **Name**: `LoginConnectionError`
   - **Folder**: Escolha uma pasta (ex: "CredGestor")
   - **Evaluation group**: (deixe padrão ou crie um novo)
   - **Query**:
     ```promql
     rate(login_connection_errors_total[5m])
     ```
   - **Condition**: `WHEN last() OF query(A, 5m, now) IS ABOVE 0`
   - **For**: `1m`
   - **Annotations**:
     - **Summary**: `Erro de conexão durante login detectado`
     - **Description**: `{{ $value }} erros de conexão durante login nos últimos 5 minutos`
   - **Labels**:
     - `severity`: `critical`
     - `component`: `authentication`
4. Em **Notifications**, selecione o canal do Slack
5. Clique em **"Save"**

### 3. Alertas Recomendados

#### 3.1. Erro de Conexão no Login

**Query**:
```promql
rate(login_connection_errors_total[5m]) > 0
```

**Configuração**:
- **Name**: `LoginConnectionError`
- **Severity**: `critical`
- **For**: `1m`
- **Message**: `Erro de conexão durante login detectado`

#### 3.2. Taxa Alta de Erros de Login

**Query**:
```promql
rate(login_errors_total[5m]) > 0.1
```

**Configuração**:
- **Name**: `LoginErrorsHigh`
- **Severity**: `high`
- **For**: `2m`
- **Message**: `Taxa alta de erros de login: {{ $value }} erros/segundo`

#### 3.3. Erro em CRUD de Clientes

**Query**:
```promql
rate(client_crud_errors_total[5m]) > 0
```

**Configuração**:
- **Name**: `ClientCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de clientes. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

#### 3.4. Erro em CRUD de Empréstimos

**Query**:
```promql
rate(loan_crud_errors_total[5m]) > 0
```

**Configuração**:
- **Name**: `LoanCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de empréstimos. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

#### 3.5. Erro em CRUD de Parcelas

**Query**:
```promql
rate(installment_crud_errors_total[5m]) > 0
```

**Configuração**:
- **Name**: `InstallmentCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de parcelas. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

#### 3.6. Erro de Conexão com Banco de Dados

**Query**:
```promql
rate(db_connection_errors_total[5m]) > 0
```

**Configuração**:
- **Name**: `DatabaseConnectionError`
- **Severity**: `critical`
- **For**: `1m`
- **Message**: `Erro de conexão com banco de dados. Tipo: {{ $labels.error_type }}`

#### 3.7. Taxa Alta de Erros em Queries

**Query**:
```promql
rate(db_query_errors_total[5m]) > 0.5
```

**Configuração**:
- **Name**: `DatabaseQueryError`
- **Severity**: `high`
- **For**: `2m`
- **Message**: `Taxa alta de erros em queries. Tabela: {{ $labels.table }}, Operação: {{ $labels.operation }}`

### 4. Personalizar Mensagens do Slack

No Grafana, você pode personalizar as mensagens enviadas para o Slack usando templates:

#### 4.1. Template de Mensagem Personalizado

No **Notification channel** do Slack, configure:

**Title**:
```
🚨 {{ .GroupLabels.alertname }} - CredGestor
```

**Message**:
```
*{{ .CommonAnnotations.summary }}*

{{ .CommonAnnotations.description }}

*Severidade:* {{ .CommonLabels.severity }}
*Componente:* {{ .CommonLabels.component }}
{{ if .CommonLabels.resource }}*Recurso:* {{ .CommonLabels.resource }}{{ end }}
{{ if .CommonLabels.operation }}*Operação:* {{ .CommonLabels.operation }}{{ end }}
{{ if .CommonLabels.error_type }}*Tipo de Erro:* {{ .CommonLabels.error_type }}{{ end }}

*Valor:* {{ .CommonAnnotations.value }}
*Dashboard:* {{ .ExternalURL }}
```

### 5. Testar Alertas

#### 5.1. Testar Notificação

1. No Grafana, vá em **Alerting** → **Notification channels**
2. Clique no canal do Slack
3. Clique em **"Test"**
4. Verifique se a mensagem chegou no Slack

#### 5.2. Simular Alerta

1. Crie um alerta de teste com threshold muito baixo
2. Ou use o comando para gerar métricas de teste:
   ```bash
   # Simular erro de login (fazer requisição com credenciais inválidas)
   curl -X POST https://credgestor.app.br/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "teste@teste.com", "senha": "senha_errada"}'
   ```

### 6. Gerenciar Alertas

#### 6.1. Ver Alertas Ativos

1. Vá em **Alerting** → **Alert rules**
2. Veja todos os alertas configurados
3. Veja o status de cada alerta (firing, pending, etc.)

#### 6.2. Ver Histórico de Alertas

1. Vá em **Alerting** → **Alert history**
2. Veja todos os alertas que foram disparados
3. Veja quando foram resolvidos

#### 6.3. Silenciar Alertas

1. Vá em **Alerting** → **Silences**
2. Clique em **"New silence"**
3. Configure:
   - **Matchers**: Selecione os alertas a silenciar
   - **Duration**: Tempo de silêncio
   - **Comment**: Motivo do silêncio
4. Clique em **"Create"**

### 7. Integração com Alertmanager (Opcional)

Se você também está usando o Alertmanager (como configurado anteriormente), pode integrar com o Grafana:

1. No Grafana, vá em **Alerting** → **Alert managers**
2. Clique em **"Add external Alertmanager"**
3. Configure:
   - **Name**: `Alertmanager`
   - **URL**: `http://alertmanager:9093` (ou a URL do seu Alertmanager)
4. Clique em **"Save"**

Agora os alertas do Grafana também serão enviados para o Alertmanager, que pode rotear para diferentes canais.

## 📊 Dashboard de Alertas

Você pode criar um dashboard específico para monitorar os alertas:

1. Crie um novo dashboard
2. Adicione painéis para:
   - **Alertas Ativos**: Query do Grafana
   - **Histórico de Alertas**: Query do Grafana
   - **Métricas de Alertas**: Queries do Prometheus

## 🔧 Troubleshooting

### Alertas não estão disparando

1. **Verificar se as métricas existem**:
   ```bash
   curl http://localhost:9092/api/v1/query?query=login_errors_total
   ```

2. **Verificar condições do alerta**:
   - As condições estão corretas?
   - O threshold está adequado?
   - O tempo "For" não é muito curto?

3. **Verificar logs do Grafana**:
   ```bash
   docker logs grafana | grep -i alert
   ```

### Notificações não estão chegando no Slack

1. **Testar webhook**:
   ```bash
   curl -X POST SUA_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text": "Teste de alerta"}'
   ```

2. **Verificar configuração do canal**:
   - A URL do webhook está correta?
   - O canal existe no Slack?
   - O bot tem permissões?

3. **Verificar logs do Grafana**:
   ```bash
   docker logs grafana | grep -i slack
   ```

## ✅ Checklist

- [ ] Webhook do Slack criado
- [ ] Notification channel configurado no Grafana
- [ ] Alertas criados no dashboard ou como Alert Rules
- [ ] Teste de notificação realizado com sucesso
- [ ] Alertas testados com dados reais
- [ ] Mensagens personalizadas configuradas
- [ ] Dashboard de alertas criado (opcional)

## 📚 Referências

- [Grafana Alerting Documentation](https://grafana.com/docs/grafana/latest/alerting/)
- [Grafana Slack Integration](https://grafana.com/docs/grafana/latest/alerting/notifications/slack/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
