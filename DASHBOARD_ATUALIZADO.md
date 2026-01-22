# ✅ Dashboard Grafana Atualizado

## 🔧 O que foi corrigido:

1. **Queries simplificadas**: Todas as queries que usavam regex `job=~"credgestor.*|.*api.*"` foram atualizadas para usar `job="credgestor-api"` diretamente
2. **URLs corretas**: As variáveis do dashboard já estavam configuradas com as URLs corretas:
   - Prometheus: `http://167.235.76.26:9090`
   - API: `https://credgestor.app.br`

## 📋 Próximos passos no Grafana:

### 1. Reimportar o Dashboard

1. No Grafana, vá em **Dashboards** → **Import**
2. Faça upload do arquivo atualizado: `/var/www/credgestor-homologacao/grafana-dashboard-sre-completo.json`
3. OU edite o dashboard existente:
   - Clique em **Settings** (⚙️) no dashboard
   - Vá em **JSON Model**
   - Cole o conteúdo do arquivo atualizado
   - Clique em **Save changes**

### 2. Verificar Variáveis

Após reimportar, verifique as variáveis no topo do dashboard:

1. **DS_PROMETHEUS**: Deve estar selecionado como `prometheus-credgestor`
2. **DS_POSTGRES**: Deve estar selecionado como `grafana-postgresql-datasource-supabase-credgestor`
3. **PROMETHEUS_URL**: Deve mostrar `http://167.235.76.26:9090` (não `localhost`)
4. **API_URL**: Deve mostrar `https://credgestor.app.br` (não `localhost`)

Se as URLs ainda mostrarem `localhost`:
- Clique no dropdown da variável
- Selecione ou digite a URL correta
- Clique em **Update**

### 3. Ajustar Time Range

1. No canto superior direito, ajuste o time range para **"Last 6 hours"** ou **"Last 24 hours"**
2. Clique no botão de **refresh** (🔄) ou aguarde o refresh automático (30s)

### 4. Verificar Data Source

1. Vá em **Connections** → **Data sources** → **prometheus-credgestor**
2. Verifique:
   - **URL**: `http://167.235.76.26:9090`
   - **Access**: `Server (default)`
3. Clique em **Save & test** - deve mostrar "Data source is working"

## 🧪 Testar Queries

No Grafana **Explore**, teste estas queries para verificar se funcionam:

```promql
# Status do serviço
up{job="credgestor-api"}

# Total de requisições
http_requests_total{job="credgestor-api"}

# Taxa de requisições
sum(rate(http_requests_total{job="credgestor-api"}[5m]))

# Latência por handler
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="credgestor-api"}[5m])) by (le, handler)) * 1000
```

Se essas queries funcionarem no Explore, o dashboard deve funcionar também.

## 📊 Painéis que devem funcionar agora:

✅ **Status do Serviço** - Já estava funcionando
✅ **Taxa de Sucesso (SLO)** - Já estava funcionando  
✅ **Latência P95** - Já estava funcionando
✅ **Taxa de Requisições (RPS)** - Já estava funcionando
🔄 **Golden Signal: Latência por Handler** - Agora deve funcionar
🔄 **Golden Signal: Tráfego por Handler** - Agora deve funcionar
🔄 **Golden Signal: Taxa de Erros** - Agora deve funcionar
🔄 **Golden Signal: Saturação** - Agora deve funcionar

## 🔄 Se ainda mostrar "No data":

1. **Limpar cache do navegador**: Pressione `Ctrl+F5` (ou `Cmd+Shift+R` no Mac)
2. **Verificar logs do Prometheus**: 
   ```bash
   docker logs <container_prometheus> --tail 50
   ```
3. **Verificar se há dados históricos**:
   ```bash
   curl -s "http://167.235.76.26:9090/api/v1/query_range?query=up{job=\"credgestor-api\"}&start=$(date -d '6 hours ago' +%s)&end=$(date +%s)&step=15s" | jq '.data.result | length'
   ```
4. **Executar diagnóstico**:
   ```bash
   /var/www/credgestor-homologacao/scripts/diagnosticar-grafana.sh
   ```

## 📝 Notas:

- As queries agora são mais específicas e diretas, o que deve melhorar a performance
- O dashboard está configurado para refresh automático a cada 30 segundos
- Se você tiver múltiplos jobs no futuro, pode voltar a usar regex, mas por enquanto `job="credgestor-api"` é mais eficiente
