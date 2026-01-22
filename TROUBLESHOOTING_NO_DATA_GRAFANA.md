# 🔍 Troubleshooting: "No data" no Dashboard Grafana

## ✅ Verificações Iniciais

### 1. Verificar se o Prometheus está coletando métricas

```bash
# Verificar targets
curl -s "http://167.235.76.26:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job == "credgestor-api")'

# Verificar métricas disponíveis
curl -s "http://167.235.76.26:9090/api/v1/query?query=http_requests_total" | jq '.data.result | length'
```

### 2. Verificar Data Source no Grafana

1. Vá em **Connections** → **Data sources** → **prometheus-credgestor**
2. Verifique:
   - **URL**: `http://167.235.76.26:9090`
   - **Access**: `Server (default)`
   - Clique em **Save & test** - deve mostrar "Data source is working"

### 3. Verificar Variáveis do Dashboard

No dashboard, verifique as variáveis no topo:
- **DS_PROMETHEUS**: Deve estar selecionado como `prometheus-credgestor`
- **DS_POSTGRES**: Deve estar selecionado como `grafana-postgresql-datasource-supabase-credgestor`

### 4. Verificar Time Range

1. No canto superior direito do dashboard, verifique o **time range**
2. Tente mudar para **"Last 1 hour"** ou **"Last 6 hours"**
3. Clique no botão de **refresh** (🔄)

## 🔧 Problemas Comuns e Soluções

### Problema 1: Data Source não conecta

**Sintoma**: Erro ao testar o data source

**Solução**:
```bash
# Verificar se o Prometheus está acessível
curl http://167.235.76.26:9090/api/v1/status/config

# Se não acessível, verificar firewall/rede
```

### Problema 2: Queries retornam null

**Sintoma**: Queries no Grafana retornam "No data"

**Solução**: Testar query diretamente no Prometheus:
```bash
# Testar query básica
curl -s "http://167.235.76.26:9090/api/v1/query?query=http_requests_total" | jq '.data.result | length'

# Se retornar 0, o Prometheus não está coletando métricas
# Verificar configuração em /var/www/prometheus/prometheus.yml
```

### Problema 3: Time Range muito curto

**Sintoma**: Dashboard mostra dados apenas em alguns momentos

**Solução**:
1. Aumentar o time range para **"Last 6 hours"** ou **"Last 24 hours"**
2. Verificar se há dados históricos no Prometheus:
```bash
curl -s "http://167.235.76.26:9090/api/v1/query_range?query=up{job=\"credgestor-api\"}&start=$(date -d '6 hours ago' +%s)&end=$(date +%s)&step=15s" | jq '.data.result | length'
```

### Problema 4: Labels incorretos nas queries

**Sintoma**: Queries com filtros não retornam dados

**Solução**: Verificar labels disponíveis:
```bash
# Ver labels de uma métrica
curl -s "http://167.235.76.26:9090/api/v1/query?query=http_requests_total" | jq -r '.data.result[0].metric | to_entries[] | "\(.key)=\(.value)"'

# Verificar se o job está correto
curl -s "http://167.235.76.26:9090/api/v1/label/job/values" | jq '.data'
```

## 🧪 Testar Queries Manualmente

### No Grafana Explore:

1. Vá em **Explore** (menu lateral)
2. Selecione o data source: **prometheus-credgestor**
3. Teste estas queries:

```promql
# Status do serviço
up{job="credgestor-api"}

# Total de requisições
http_requests_total{job="credgestor-api"}

# Taxa de requisições
sum(rate(http_requests_total{job="credgestor-api"}[5m]))

# Latência P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="credgestor-api"}[5m])) by (le)) * 1000
```

### Se as queries funcionarem no Explore mas não no Dashboard:

1. Verifique se a variável `DS_PROMETHEUS` está configurada corretamente
2. Edite o painel e verifique se o data source está selecionado
3. Tente usar o data source diretamente (sem variável) para testar

## 📊 Verificar Métricas da API

```bash
# Verificar se a API está expondo métricas
curl -s "https://credgestor.app.br/api/metrics" | grep "^http_requests_total" | head -5

# Verificar se o Prometheus está coletando
curl -s "http://167.235.76.26:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job == "credgestor-api")'
```

## 🔄 Recarregar Dashboard

1. No dashboard, clique em **Settings** (⚙️)
2. Vá em **Variables**
3. Para cada variável, clique em **Update** e depois **Save dashboard**
4. Recarregue a página (F5)

## 🆘 Se Nada Funcionar

1. **Exportar dashboard atual** (Settings → JSON Model)
2. **Criar novo dashboard** e importar o JSON
3. **Verificar logs do Prometheus**:
```bash
docker logs <container_prometheus> --tail 100
```

4. **Verificar logs do Grafana**:
```bash
docker logs <container_grafana> --tail 100
```
