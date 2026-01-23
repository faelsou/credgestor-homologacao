# 🚀 Guia Rápido: Criar Alertas no Grafana e Enviar para Slack

## 📋 Passo 1: Configurar Contact Point (Notificação do Slack)

### 1.1. Criar Contact Point

1. No Grafana, vá em **Alerting** → **Contact points** (no menu lateral)
2. Clique em **"+ New contact point"**
3. Configure:
   - **Name**: `Slack - CredGestor`
   - **Integration**: Selecione **"Slack"**
   - **Webhook URL**: Cole a URL do webhook do Slack
     ```
     YOUR_SLACK_WEBHOOK_URL_HERE
     ```
     > **Nota:** Substitua `YOUR_SLACK_WEBHOOK_URL_HERE` pela URL real do seu webhook do Slack
   - **Channel** (opcional): `#credgestor-alerts`
   - **Title**: `🚨 Alerta CredGestor - {{ .GroupLabels.alertname }}`
   - **Text**: 
     ```
     *{{ .CommonAnnotations.summary }}*
     
     {{ .CommonAnnotations.description }}
     
     *Severidade:* {{ .CommonLabels.severity }}
     *Componente:* {{ .CommonLabels.component }}
     ```
4. Clique em **"Test"** para verificar
5. Clique em **"Save contact point"**

## 📋 Passo 2: Criar Alert Rules

### 2.1. Criar Primeiro Alerta - Erro de Conexão no Login

1. Vá em **Alerting** → **Alert rules** (você já está aqui!)
2. Clique no botão **"+ New alert rule"** (canto superior direito)
3. Configure:

#### Aba "Set a query and alert condition"

**Query A**:
- **Data source**: Selecione seu Prometheus
- **Query**: 
  ```promql
  rate(login_connection_errors_total[5m])
  ```
- **Legend**: `Erros de Conexão Login`

**Alert condition**:
- **WHEN**: `last()`
- **OF**: `query(A, 5m, now)`
- **IS ABOVE**: `0`

#### Aba "Alert evaluation behavior"

- **Folder**: Crie ou selecione "CredGestor"
- **Evaluation group**: (deixe padrão ou crie "CredGestor Alerts")
- **Evaluate every**: `30s`
- **For**: `1m`

#### Aba "Add details"

- **Alert rule name**: `LoginConnectionError`
- **Summary**: `Erro de conexão durante login detectado`
- **Description**: 
  ```
  {{ $value }} erros de conexão durante login nos últimos 5 minutos.
  Tipo de erro: {{ $labels.error_type }}
  ```

#### Aba "Add annotations"

Adicione labels:
- **severity**: `critical`
- **component**: `authentication`

#### Aba "Notifications"

- **Contact point**: Selecione "Slack - CredGestor" (criado no passo 1)
- **Disable resolved message**: (deixe desmarcado para receber notificações de resolução)

4. Clique em **"Save rule"**

### 2.2. Criar Alerta - Erro em CRUD de Clientes

1. Clique novamente em **"+ New alert rule"**
2. Configure:

**Query A**:
```promql
rate(client_crud_errors_total[5m])
```

**Alert condition**:
- **WHEN**: `last()`
- **OF**: `query(A, 5m, now)`
- **IS ABOVE**: `0`

**Details**:
- **Alert rule name**: `ClientCRUDError`
- **Summary**: `Erro em operação CRUD de clientes`
- **Description**: 
  ```
  Erro em operação CRUD de clientes.
  Operação: {{ $labels.operation }}
  Tipo: {{ $labels.error_type }}
  Código: {{ $labels.error_code }}
  ```

**Labels**:
- **severity**: `high`
- **component**: `crud`
- **resource**: `clients`

**Notifications**: Selecione "Slack - CredGestor"

3. Clique em **"Save rule"**

### 2.3. Criar Alerta - Erro em CRUD de Empréstimos

1. **"+ New alert rule"**

**Query A**:
```promql
rate(loan_crud_errors_total[5m])
```

**Alert condition**: `last() OF query(A, 5m, now) IS ABOVE 0`

**Details**:
- **Name**: `LoanCRUDError`
- **Summary**: `Erro em operação CRUD de empréstimos`
- **Description**: `Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

**Labels**: `severity=high`, `component=crud`, `resource=loans`

**Notifications**: "Slack - CredGestor"

### 2.4. Criar Alerta - Erro em CRUD de Parcelas

1. **"+ New alert rule"**

**Query A**:
```promql
rate(installment_crud_errors_total[5m])
```

**Alert condition**: `last() OF query(A, 5m, now) IS ABOVE 0`

**Details**:
- **Name**: `InstallmentCRUDError`
- **Summary**: `Erro em operação CRUD de parcelas`
- **Description**: `Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

**Labels**: `severity=high`, `component=crud`, `resource=installments`

**Notifications**: "Slack - CredGestor"

### 2.5. Criar Alerta - Erro de Banco de Dados

1. **"+ New alert rule"**

**Query A**:
```promql
rate(db_connection_errors_total[5m])
```

**Alert condition**: `last() OF query(A, 5m, now) IS ABOVE 0`

**Details**:
- **Name**: `DatabaseConnectionError`
- **Summary**: `Erro de conexão com banco de dados`
- **Description**: `Tipo: {{ $labels.error_type }}, Operação: {{ $labels.operation }}`

**Labels**: `severity=critical`, `component=database`

**Notifications**: "Slack - CredGestor"

## 📋 Passo 3: Verificar Alertas

1. Volte para **Alerting** → **Alert rules**
2. Você deve ver todos os alertas criados
3. Verifique o status:
   - **Normal**: Alerta configurado, mas não disparado
   - **Pending**: Alerta detectado, aguardando tempo "For"
   - **Firing**: Alerta ativo, enviando notificações

## 📋 Passo 4: Testar Alertas

### 4.1. Testar Notificação

1. Vá em **Alerting** → **Contact points**
2. Clique em "Slack - CredGestor"
3. Clique em **"Test"**
4. Verifique se a mensagem chegou no Slack

### 4.2. Simular Erro para Disparar Alerta

```bash
# Simular erro de login
curl -X POST https://credgestor.app.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@teste.com", "senha": "senha_errada"}'
```

Aguarde 1-2 minutos e verifique:
- O alerta aparece como "Firing" no Grafana
- A notificação chegou no Slack

## 📊 Resumo dos Alertas Criados

| Nome | Query | Severidade | For |
|------|-------|------------|-----|
| `LoginConnectionError` | `rate(login_connection_errors_total[5m]) > 0` | critical | 1m |
| `ClientCRUDError` | `rate(client_crud_errors_total[5m]) > 0` | high | 1m |
| `LoanCRUDError` | `rate(loan_crud_errors_total[5m]) > 0` | high | 1m |
| `InstallmentCRUDError` | `rate(installment_crud_errors_total[5m]) > 0` | high | 1m |
| `DatabaseConnectionError` | `rate(db_connection_errors_total[5m]) > 0` | critical | 1m |

## 🔧 Troubleshooting

### Alertas não aparecem na lista

1. Verifique se o Prometheus está configurado como data source
2. Verifique se as métricas existem:
   ```bash
   curl 'http://localhost:9092/api/v1/query?query=login_connection_errors_total'
   ```

### Notificações não chegam no Slack

1. Teste o contact point: **Alerting** → **Contact points** → **Test**
2. Verifique a URL do webhook
3. Verifique os logs do Grafana

### Alertas não disparam

1. Verifique se há dados nas métricas
2. Ajuste o threshold se necessário
3. Verifique o tempo "For" (pode estar muito longo)

## ✅ Checklist

- [ ] Contact point do Slack criado e testado
- [ ] Alerta `LoginConnectionError` criado
- [ ] Alerta `ClientCRUDError` criado
- [ ] Alerta `LoanCRUDError` criado
- [ ] Alerta `InstallmentCRUDError` criado
- [ ] Alerta `DatabaseConnectionError` criado
- [ ] Teste de notificação realizado
- [ ] Alerta testado com erro simulado

## 📚 Próximos Passos

- Adicionar mais alertas (consulte `grafana-alert-examples.md`)
- Criar dashboard de alertas
- Configurar silences para manutenção
- Integrar com Alertmanager (opcional)
