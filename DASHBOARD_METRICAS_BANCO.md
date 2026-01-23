# Painéis de Métricas de Banco de Dados - Dashboard Grafana

## Resumo

Foram adicionados **8 novos painéis** ao dashboard do Grafana para monitorar as métricas de banco de dados implementadas.

## Painéis Adicionados

### 1. 🗄️ Status de Conexão com Banco
- **Tipo**: Stat
- **Métrica**: `db_connection_status`
- **Descrição**: Mostra se o banco está conectado (1) ou desconectado (0)
- **Posição**: Linha 36, Colunas 0-5

### 2. ❌ Erros de Conexão (5m)
- **Tipo**: Stat
- **Métrica**: `db_connection_errors_total`
- **Descrição**: Total de erros de conexão nos últimos 5 minutos
- **Posição**: Linha 36, Colunas 6-11

### 3. ⏱️ Timeouts (5m)
- **Tipo**: Stat
- **Métrica**: `db_timeouts_total`
- **Descrição**: Total de timeouts nos últimos 5 minutos
- **Posição**: Linha 36, Colunas 12-17

### 4. 🚨 Erros de Queries (5m)
- **Tipo**: Stat
- **Métrica**: `db_query_errors_total`
- **Descrição**: Total de erros em queries nos últimos 5 minutos
- **Posição**: Linha 36, Colunas 18-23

### 5. ⚡ Latência de Queries ao Banco (P50, P95, P99)
- **Tipo**: Time Series
- **Métrica**: `db_query_duration_seconds`
- **Descrição**: Latência de queries por tabela e operação (percentis 50, 95 e 99)
- **Posição**: Linha 40, Colunas 0-11 (altura 8)

### 6. 🚨 Taxa de Erros de Queries por Tabela
- **Tipo**: Time Series (Bars)
- **Métrica**: `db_query_errors_total`
- **Descrição**: Taxa de erros agrupados por tabela, operação e tipo de erro
- **Posição**: Linha 40, Colunas 12-23 (altura 8)

### 7. 🔌 Duração de Estabelecimento de Conexão
- **Tipo**: Time Series
- **Métrica**: `db_connection_duration_seconds`
- **Descrição**: Tempo para estabelecer conexão (P95 e P99)
- **Posição**: Linha 48, Colunas 0-11 (altura 8)

### 8. 🕐 Timestamps de Últimas Queries
- **Tipo**: Time Series
- **Métricas**: 
  - `db_last_successful_query_timestamp_seconds`
  - `db_last_failed_query_timestamp_seconds`
- **Descrição**: Timestamp da última query bem-sucedida e da última que falhou
- **Posição**: Linha 48, Colunas 12-23 (altura 8)

## Anotações Adicionadas

Foram adicionadas 3 novas anotações para alertas:

1. **Banco de Dados Desconectado**
   - Expressão: `db_connection_status == 0`
   - Cor: Vermelho
   - Alerta quando o banco está desconectado

2. **Timeouts no Banco de Dados**
   - Expressão: `increase(db_timeouts_total[5m]) > 0`
   - Cor: Laranja
   - Alerta quando há timeouts

3. **Muitos Erros de Conexão**
   - Expressão: `increase(db_connection_errors_total[5m]) > 5`
   - Cor: Vermelho
   - Alerta quando há mais de 5 erros de conexão em 5 minutos

## Como Usar

### 1. Importar o Dashboard no Grafana

```bash
# O arquivo já está atualizado: grafana-dashboard-sre-completo.json
# Importe via interface do Grafana ou API
```

### 2. Verificar Métricas

As métricas estarão disponíveis em:
- Endpoint: `http://localhost:8000/metrics`
- Procure por métricas que começam com `db_`

### 3. Configurar Alertas (Opcional)

Você pode criar alertas baseados nas anotações:

```promql
# Alerta: Banco desconectado
db_connection_status{job=~"credgestor.*|.*api.*"} == 0

# Alerta: Muitos timeouts
increase(db_timeouts_total{job=~"credgestor.*|.*api.*"}[5m]) > 5

# Alerta: Muitos erros de conexão
increase(db_connection_errors_total{job=~"credgestor.*|.*api.*"}[5m]) > 10
```

## Métricas Disponíveis

Todas as métricas implementadas em `backend/db_metrics.py`:

### Contadores
- `db_connection_errors_total{error_type, operation}`
- `db_query_errors_total{table, operation, error_type}`
- `db_timeouts_total{operation, timeout_type}`

### Histogramas
- `db_query_duration_seconds{table, operation}`
- `db_connection_duration_seconds`

### Gauges
- `db_connection_status` (1 = conectado, 0 = desconectado)
- `db_last_successful_query_timestamp_seconds`
- `db_last_failed_query_timestamp_seconds`

## Localização no Dashboard

Os painéis foram inseridos após a seção de métricas de sistema (CPU/Memória) e antes das métricas de negócio:

```
[Painéis de Sistema] (y: 20-32)
    ↓
[Novos Painéis de Banco] (y: 36-56)
    ↓
[Métricas de Negócio] (y: 60+)
```

## Próximos Passos

1. **Importar o dashboard atualizado no Grafana**
2. **Verificar se as métricas estão sendo coletadas**:
   ```bash
   curl http://localhost:8000/metrics | grep "db_"
   ```
3. **Configurar alertas** baseados nas anotações
4. **Ajustar thresholds** conforme necessário para seu ambiente

## Referências

- [MELHORIAS_IMPLEMENTADAS.md](./MELHORIAS_IMPLEMENTADAS.md) - Detalhes das implementações
- [DIAGNOSTICO_CONEXAO_BANCO.md](./DIAGNOSTICO_CONEXAO_BANCO.md) - Diagnóstico de problemas
- [backend/db_metrics.py](./backend/db_metrics.py) - Código das métricas
