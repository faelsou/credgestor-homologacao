# 🔧 Resolver "No data" no Dashboard Grafana

## ✅ Status Confirmado

- ✅ **Prometheus funcionando**: `http://167.235.76.26:9090`
- ✅ **Job configurado**: `credgestor-api` está UP
- ✅ **Métricas coletadas**: `http_requests_total` disponível
- ❌ **Dashboard mostra "No data"**

## 🔍 Diagnóstico Rápido

### 1. Verificar Data Source no Grafana

1. Vá em **Dashboard Settings** (ícone de engrenagem) → **Variables**
2. Verifique se `DS_PROMETHEUS` está configurado
3. Clique em `DS_PROMETHEUS` e verifique:
   - **Data source options**: Deve listar o Prometheus
   - **Current**: Deve estar selecionado o data source correto

**Se não estiver configurado:**
1. Vá em **Configuration** → **Data Sources**
2. Verifique se existe um data source chamado **"Prometheus"**
3. Se não existir, crie:
   - **Name**: `Prometheus`
   - **URL**: `http://167.235.76.26:9090`
   - **Save & Test**

### 2. Testar Query no Grafana Explore

1. Vá em **Explore** (menu lateral)
2. Selecione o data source **Prometheus**
3. Execute a query:
   ```promql
   http_requests_total{job="credgestor-api"}
   ```
4. Se retornar dados → O problema está nas queries do dashboard
5. Se não retornar → O problema está no data source

### 3. Verificar Time Range

O dashboard está configurado para "Last 6 hours". Se não houver dados recentes:

1. No canto superior direito do dashboard, clique no seletor de tempo
2. Altere para: **"Last 1 hour"** ou **"Last 15 minutes"**
3. Verifique se os dados aparecem

### 4. Ajustar Queries (se necessário)

Se o job tiver um nome diferente, você pode:

**Opção A: Ajustar variável do dashboard**
1. Vá em **Dashboard Settings** → **Variables**
2. Edite `DS_PROMETHEUS`
3. Certifique-se de que está selecionando o data source correto

**Opção B: Simplificar queries (temporário para teste)**

Edite um painel e teste com query mais simples:
```promql
# Teste simples
http_requests_total

# Se funcionar, use:
http_requests_total{job="credgestor-api"}
```

## 🛠️ Solução Passo a Passo

### Passo 1: Verificar Data Source

```bash
# No terminal, teste se o Prometheus está acessível
curl http://167.235.76.26:9090/api/v1/query?query=http_requests_total
```

Se retornar dados, o Prometheus está OK.

### Passo 2: Configurar Data Source no Grafana

1. **Configuration** → **Data Sources** → **Add data source**
2. Selecione **Prometheus**
3. Configure:
   - **Name**: `Prometheus` (exatamente este nome, ou ajuste a variável)
   - **URL**: `http://167.235.76.26:9090`
   - **Access**: Server (default)
4. **Save & Test** → Deve aparecer ✅ "Data source is working"

### Passo 3: Verificar Variável do Dashboard

1. No dashboard, clique em **Dashboard Settings** (engrenagem)
2. Vá em **Variables**
3. Verifique `DS_PROMETHEUS`:
   - Deve estar selecionado o data source **Prometheus**
   - Se não estiver, selecione e salve

### Passo 4: Testar Query Simples

1. Vá em **Explore**
2. Selecione **Prometheus**
3. Execute:
   ```promql
   http_requests_total{job="credgestor-api"}
   ```
4. Se retornar dados, volte ao dashboard e aguarde alguns segundos

### Passo 5: Ajustar Time Range

1. No dashboard, canto superior direito
2. Altere para: **"Last 1 hour"**
3. Clique em **Apply**

## 🔍 Queries de Teste

Teste estas queries no Grafana Explore para verificar:

### Teste 1: Métricas básicas
```promql
http_requests_total
```

### Teste 2: Com filtro de job
```promql
http_requests_total{job="credgestor-api"}
```

### Teste 3: Taxa de requisições
```promql
sum(rate(http_requests_total{job="credgestor-api"}[5m]))
```

### Teste 4: Status do serviço
```promql
up{job="credgestor-api"}
```

## ⚠️ Problemas Comuns

### Problema 1: Data Source não encontrado

**Sintoma**: Variável `DS_PROMETHEUS` mostra "No options"

**Solução**:
1. Crie o data source com o nome exato "Prometheus"
2. OU edite a variável para usar o nome do seu data source

### Problema 2: Queries retornam vazio

**Sintoma**: Explore mostra dados, mas dashboard não

**Solução**:
1. Verifique o time range (pode estar muito curto)
2. Verifique se as queries usam o label correto: `job="credgestor-api"`
3. Teste com query mais simples primeiro

### Problema 3: Time range sem dados

**Sintoma**: "No data" mesmo com queries funcionando

**Solução**:
1. Altere o time range para incluir quando as métricas foram coletadas
2. Use "Last 1 hour" ou "Last 6 hours"
3. Verifique se há dados no Prometheus: `http://167.235.76.26:9090/graph`

## 📝 Checklist Rápido

- [ ] Data source Prometheus criado no Grafana
- [ ] Data source URL: `http://167.235.76.26:9090`
- [ ] Data source testado e funcionando
- [ ] Variável `DS_PROMETHEUS` aponta para o data source correto
- [ ] Query testada no Explore retorna dados
- [ ] Time range ajustado (Last 1 hour ou Last 6 hours)
- [ ] Dashboard salvo e recarregado

## 🎯 Solução Rápida

Se nada funcionar, teste este painel simples:

1. **Adicione um novo painel** no dashboard
2. **Query**: `http_requests_total{job="credgestor-api"}`
3. **Visualization**: Table ou Time series
4. Se este painel funcionar, o problema está nas queries complexas
5. Se não funcionar, o problema está no data source

## 📚 Referências

- **Prometheus**: http://167.235.76.26:9090
- **Prometheus Targets**: http://167.235.76.26:9090/targets
- **API Metrics**: https://credgestor.app.br/api/metrics
