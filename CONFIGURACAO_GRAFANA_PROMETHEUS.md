# ✅ Configuração do Grafana com Prometheus

## 🎯 Status Atual

✅ **Prometheus funcionando**: `http://167.235.76.26:9090`
✅ **Métricas sendo coletadas**: `http_requests_total` está disponível
✅ **Dashboard criado**: `grafana-dashboard-sre-completo.json`

## 📋 Configurar Data Source no Grafana

### 1. Acessar Grafana

Acesse o Grafana (provavelmente em `http://167.235.76.26:3000` ou via Traefik)

### 2. Adicionar Data Source Prometheus

1. Vá em **Configuration** → **Data Sources** → **Add data source**
2. Selecione **Prometheus**
3. Configure:
   - **Name**: `Prometheus` (ou o nome que você preferir)
   - **URL**: `http://167.235.76.26:9090`
     - OU se o Grafana está na mesma rede Docker: `http://observability_prometheus:9090`
   - **Access**: Server (default)
4. Clique em **Save & Test**
5. Deve aparecer: ✅ "Data source is working"

### 3. Verificar Variável do Dashboard

O dashboard usa a variável `${DS_PROMETHEUS}`. Certifique-se de que:

1. O data source criado tem o nome exato que está na variável
2. OU edite a variável no dashboard para usar o nome correto

## 📊 Importar Dashboard

### 1. Importar Dashboard

1. Vá em **Dashboards** → **Import**
2. Clique em **Upload JSON file**
3. Selecione: `grafana-dashboard-sre-completo.json`
4. OU cole o conteúdo do arquivo
5. Clique em **Load**
6. Configure:
   - **Name**: CredGestor - Dashboard SRE Completo
   - **Folder**: (escolha uma pasta ou deixe "General")
   - **Prometheus**: Selecione o data source criado
   - **PostgreSQL**: Selecione o data source PostgreSQL (se tiver)
7. Clique em **Import**

### 2. Verificar Painéis

Após importar, os painéis devem começar a mostrar dados:

- ✅ **Status do Serviço**: Deve mostrar UP
- ✅ **Taxa de Sucesso**: Percentual de requisições bem-sucedidas
- ✅ **Latência P95**: Latência do percentil 95
- ✅ **Golden Signals**: Latência, Tráfego, Erros, Saturação
- ✅ **Métricas de Infraestrutura**: CPU, Memória
- ✅ **Métricas de Negócio**: Tenants, Usuários, Clientes

## 🔍 Verificar Queries

Se os painéis ainda mostrarem "No data", teste as queries no Grafana Explore:

### Query 1: Verificar se métricas estão disponíveis
```promql
http_requests_total
```

### Query 2: Taxa de requisições
```promql
sum(rate(http_requests_total[5m])) by (method, handler)
```

### Query 3: Latência P95
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)) * 1000
```

### Query 4: Erros
```promql
sum(rate(http_requests_total{status=~"[45].."}[5m])) by (status, handler)
```

## 🛠️ Troubleshooting

### Painéis mostram "No data"

1. **Verificar time range**:
   - Certifique-se de que o time range inclui o período de coleta
   - Tente: "Last 6 hours" ou "Last 1 hour"

2. **Verificar data source**:
   - Vá em **Dashboard Settings** → **Variables**
   - Verifique se `DS_PROMETHEUS` está apontando para o data source correto

3. **Testar queries no Explore**:
   - Vá em **Explore** → Selecione **Prometheus**
   - Execute: `http_requests_total`
   - Se retornar dados, o problema está nas queries do dashboard
   - Se não retornar, o problema está no data source

### Labels diferentes

Se as métricas usam labels diferentes, ajuste as queries:

- **Atual**: `handler`, `method`, `status`
- Se diferente, edite as queries no dashboard

### Prometheus não acessível do Grafana

Se o Grafana não consegue acessar `http://167.235.76.26:9090`:

1. **Verificar rede**:
   - Se ambos estão na mesma rede Docker, use: `http://observability_prometheus:9090`
   - Se em redes diferentes, use o IP externo: `http://167.235.76.26:9090`

2. **Verificar firewall**:
   ```bash
   sudo ufw status
   sudo netstat -tulpn | grep 9090
   ```

## 📝 Resumo da Configuração

✅ **Prometheus**: `http://167.235.76.26:9090` (funcionando)
✅ **Métricas**: `http_requests_total` (sendo coletadas)
✅ **Labels**: `handler`, `method`, `status` (corretos)
✅ **Dashboard**: `grafana-dashboard-sre-completo.json` (criado)
⏳ **Grafana**: Precisa configurar data source e importar dashboard

## 🎯 Próximos Passos

1. ✅ Configurar data source Prometheus no Grafana
2. ✅ Importar dashboard `grafana-dashboard-sre-completo.json`
3. ✅ Verificar se os painéis mostram dados
4. ✅ Ajustar time range se necessário
5. ✅ Testar queries no Explore se houver problemas

## 🔗 Links Úteis

- **Prometheus**: http://167.235.76.26:9090
- **Prometheus Targets**: http://167.235.76.26:9090/targets
- **Prometheus Graph**: http://167.235.76.26:9090/graph
- **API Metrics**: https://credgestor.app.br/api/metrics
