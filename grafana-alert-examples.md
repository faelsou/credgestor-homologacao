# 📋 Exemplos de Queries para Alertas no Grafana

Este arquivo contém exemplos de queries PromQL que podem ser usadas para criar alertas no Grafana.

## 🔐 Alertas de Autenticação

### Erro de Conexão no Login

```promql
rate(login_connection_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `LoginConnectionError`
- **Severity**: `critical`
- **For**: `1m`
- **Message**: `Erro de conexão durante login detectado`

### Taxa Alta de Erros de Login

```promql
rate(login_errors_total[5m]) > 0.1
```

**Configuração do Alerta**:
- **Name**: `LoginErrorsHigh`
- **Severity**: `high`
- **For**: `2m`
- **Message**: `Taxa alta de erros de login: {{ $value }} erros/segundo`

### Erros de Login por Tipo

```promql
sum by (error_type) (rate(login_errors_total[5m])) > 0
```

**Configuração do Alerta**:
- **Name**: `LoginErrorByType`
- **Severity**: `medium`
- **For**: `1m`
- **Message**: `Erro de login do tipo {{ $labels.error_type }}`

## 💾 Alertas de CRUD

### Erro em CRUD de Clientes

```promql
rate(client_crud_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `ClientCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de clientes. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

### Taxa Alta de Erros em CRUD de Clientes

```promql
rate(client_crud_errors_total[5m]) > 0.5
```

**Configuração do Alerta**:
- **Name**: `ClientCRUDErrorHigh`
- **Severity**: `critical`
- **For**: `2m`
- **Message**: `Taxa alta de erros em CRUD de clientes: {{ $value }} erros/segundo`

### Erro em CRUD de Empréstimos

```promql
rate(loan_crud_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `LoanCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de empréstimos. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

### Erro em CRUD de Parcelas

```promql
rate(installment_crud_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `InstallmentCRUDError`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Erro em operação CRUD de parcelas. Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

### Erro em Qualquer Operação CRUD

```promql
rate(crud_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `CRUDErrorAny`
- **Severity**: `medium`
- **For**: `1m`
- **Message**: `Erro em operação CRUD. Tabela: {{ $labels.table }}, Operação: {{ $labels.operation }}, Tipo: {{ $labels.error_type }}`

### Taxa Alta de Erros em CRUD

```promql
rate(crud_errors_total[5m]) > 1
```

**Configuração do Alerta**:
- **Name**: `CRUDErrorHigh`
- **Severity**: `critical`
- **For**: `2m`
- **Message**: `Taxa alta de erros em operações CRUD: {{ $value }} erros/segundo`

## 🗄️ Alertas de Banco de Dados

### Erro de Conexão com Banco de Dados

```promql
rate(db_connection_errors_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `DatabaseConnectionError`
- **Severity**: `critical`
- **For**: `1m`
- **Message**: `Erro de conexão com banco de dados. Tipo: {{ $labels.error_type }}`

### Taxa Alta de Erros em Queries

```promql
rate(db_query_errors_total[5m]) > 0.5
```

**Configuração do Alerta**:
- **Name**: `DatabaseQueryError`
- **Severity**: `high`
- **For**: `2m`
- **Message**: `Taxa alta de erros em queries. Tabela: {{ $labels.table }}, Operação: {{ $labels.operation }}`

### Timeout em Operações de Banco

```promql
rate(db_timeouts_total[5m]) > 0
```

**Configuração do Alerta**:
- **Name**: `DatabaseTimeout`
- **Severity**: `high`
- **For**: `1m`
- **Message**: `Timeout em operações de banco de dados. Operação: {{ $labels.operation }}, Tipo: {{ $labels.timeout_type }}`

### Status de Conexão com Banco

```promql
db_connection_status == 0
```

**Configuração do Alerta**:
- **Name**: `DatabaseDisconnected`
- **Severity**: `critical`
- **For**: `30s`
- **Message**: `Banco de dados desconectado`

## 📊 Alertas Combinados

### Taxa de Erro Geral (Login + CRUD + DB)

```promql
(
  rate(login_errors_total[5m]) +
  rate(crud_errors_total[5m]) +
  rate(db_connection_errors_total[5m]) +
  rate(db_query_errors_total[5m])
) > 1
```

**Configuração do Alerta**:
- **Name**: `HighErrorRate`
- **Severity**: `critical`
- **For**: `2m`
- **Message**: `Taxa alta de erros no sistema: {{ $value }} erros/segundo`

### Erros por Componente

```promql
sum by (component) (
  rate(login_errors_total[5m]) +
  rate(crud_errors_total[5m]) +
  rate(db_connection_errors_total[5m])
) > 0.5
```

**Configuração do Alerta**:
- **Name**: `ErrorByComponent`
- **Severity**: `high`
- **For**: `2m`
- **Message**: `Taxa alta de erros no componente {{ $labels.component }}: {{ $value }} erros/segundo`

## 🎯 Como Usar

1. **Copie a query** que deseja usar
2. **No Grafana**, crie um novo painel ou edite um existente
3. **Cole a query** no campo de query do Prometheus
4. **Configure o alerta** conforme as instruções acima
5. **Adicione notificação** para o Slack

## 📝 Notas

- Ajuste os thresholds (`> 0`, `> 0.1`, etc.) conforme sua necessidade
- Ajuste o tempo "For" conforme a criticidade do alerta
- Use labels para filtrar alertas específicos (ex: por tenant, por operação)
- Combine queries para criar alertas mais complexos
