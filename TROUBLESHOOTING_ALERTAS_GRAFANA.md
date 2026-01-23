# 🔧 Troubleshooting: Erro em Alertas do Grafana

## ❌ Erro: "[sse.dependencyError] did not execute expression [C] due to a failure of the dependent expression or query [A]"

Este erro significa que a expressão C (Threshold) está tentando usar a query A, mas a query A está falhando.

### 🔍 Soluções

#### 1. Verificar se a Query A está funcionando

1. Na **Seção 2**, certifique-se de que:
   - O **Data source** está correto (ex: `prometheus-credgestor`)
   - A **Query** está correta:
     ```promql
     rate(login_connection_errors_total[5m])
     ```
   - Clique em **"Run queries"** para testar
   - Verifique se há dados retornados (gráfico ou tabela deve aparecer)

#### 2. Verificar se a métrica existe

1. No Grafana, vá em **Explore**
2. Selecione o data source Prometheus
3. Execute a query:
   ```promql
   login_connection_errors_total
   ```
4. Se não retornar dados, a métrica pode não existir ainda (normal se não houve erros)

#### 3. Configurar Expressões Corretamente

**Opção A: Usar Threshold diretamente na Query A**

1. Na **Seção 2**, configure a **Query A**:
   - Data source: `prometheus-credgestor`
   - Query: `rate(login_connection_errors_total[5m])`
   - Clique em **"Run queries"** e verifique se retorna dados

2. Clique em **"Add expression"** → **"Threshold"**
3. Configure:
   - **Input**: Selecione `A` (não use reducer primeiro)
   - **Condition**: `IS ABOVE`
   - **Value**: `0`
4. Clique em **"Set 'C' as alert condition"**

**Opção B: Usar Reducer primeiro (se necessário)**

1. Configure **Query A** como acima
2. Clique em **"Add expression"** → **"Reduce"**
3. Configure:
   - **Input**: `A`
   - **Function**: `Last`
   - **Mode**: `Strict`
4. Clique em **"Add expression"** novamente → **"Threshold"**
5. Configure:
   - **Input**: Selecione o reducer criado (ex: `B`)
   - **Condition**: `IS ABOVE`
   - **Value**: `0`
6. Clique em **"Set 'C' as alert condition"**

#### 4. Verificar Data Source

1. Vá em **Connections** → **Data sources**
2. Verifique se o Prometheus está configurado:
   - **Name**: `prometheus-credgestor` (ou o nome que você está usando)
   - **URL**: Deve apontar para o Prometheus correto
   - Clique em **"Save & test"** - deve mostrar "Data source is working"

#### 5. Query Alternativa (se a métrica não existir)

Se a métrica ainda não existe (porque não houve erros), você pode usar uma query que sempre retorna algo:

```promql
# Em vez de:
rate(login_connection_errors_total[5m])

# Use (retorna 0 se não houver erros):
sum(rate(login_connection_errors_total[5m])) or vector(0)
```

Ou simplesmente aguarde até que ocorra um erro para que a métrica seja criada.

#### 6. Verificar se há dados no Prometheus

Execute no terminal:

```bash
# Verificar se a métrica existe
curl 'http://localhost:9092/api/v1/query?query=login_connection_errors_total'

# Verificar se há dados
curl 'http://localhost:9092/api/v1/query?query=rate(login_connection_errors_total[5m])'
```

Se não retornar dados, a métrica ainda não foi criada (normal se não houve erros).

### ✅ Solução Rápida Recomendada

1. **Na Seção 2**, configure:
   - **Query A**: `rate(login_connection_errors_total[5m])`
   - Clique em **"Run queries"**
   - Se aparecer "No data", isso é normal se não houve erros ainda

2. **Adicione uma expressão Threshold**:
   - Clique em **"Add expression"** → **"Threshold"**
   - **Input**: `A`
   - **Condition**: `IS ABOVE`
   - **Value**: `0`
   - Clique em **"Set 'C' as alert condition"**

3. **Configure "No data" handling**:
   - Na **Seção 4**, expanda **"Configure no data and error handling"**
   - **Alert state if no data**: Selecione `NoData` ou `OK` (não `Alerting`)

4. **Salve o alerta** mesmo com o erro (ele funcionará quando houver dados)

### 📝 Nota Importante

- O erro pode aparecer se a métrica ainda não existe (normal se não houve erros)
- O alerta funcionará quando ocorrer o primeiro erro e a métrica for criada
- Você pode salvar o alerta mesmo com o erro - ele será avaliado periodicamente

## 🔍 Outros Erros Comuns

### Erro: "Query returned no data"

**Solução**: 
- Verifique se a métrica existe no Prometheus
- Use `Explore` no Grafana para testar a query
- Se não houver dados, configure "No data" handling na Seção 4

### Erro: "Data source not found"

**Solução**:
- Verifique se o data source está configurado
- Vá em **Connections** → **Data sources**
- Certifique-se de que o nome do data source corresponde ao usado na query

### Alerta não dispara

**Solução**:
- Verifique se há dados na métrica
- Verifique o "Pending period" (pode estar muito longo)
- Verifique o threshold (pode estar muito alto)
- Use `Explore` para ver os valores atuais da métrica
