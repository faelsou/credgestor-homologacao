# 📊 Como Importar Dashboard no Grafana

## 🎯 Dashboard Customizado para CredGestor

Criei um dashboard específico para Docker Swarm + OpenTelemetry: `grafana-dashboard-credgestor-opentelemetry.json`

## 📥 Como Importar

### Opção 1: Via Interface Web

1. **Acesse o Grafana**
2. Vá em **Dashboards** → **Import**
3. Clique em **"Upload JSON file"**
4. Selecione o arquivo: `grafana-dashboard-credgestor-opentelemetry.json`
5. Selecione o data source: **Prometheus** (prometheus-otel)
6. Clique em **Import**

### Opção 2: Via Portainer (se Grafana estiver em container)

1. **Copiar arquivo para o container:**
   ```bash
   docker cp grafana-dashboard-credgestor-opentelemetry.json <container-grafana>:/tmp/
   ```

2. **Importar via API do Grafana:**
   ```bash
   # Obter API key do Grafana primeiro
   curl -X POST http://localhost:3000/api/dashboards/db \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <sua-api-key>" \
     -d @grafana-dashboard-credgestor-opentelemetry.json
   ```

## 📋 Painéis Incluídos

O dashboard inclui:

1. **API Status** - Mostra se a API está UP ou DOWN
2. **Request Rate** - Taxa de requisições por segundo por método HTTP
3. **Latency p95** - Latência do percentil 95 por endpoint
4. **Error Rate** - Taxa de erros 5xx por endpoint
5. **Total Requests** - Total de requisições na última hora
6. **Requests by Status Code** - Requisições agrupadas por código de status

## 🔧 Configuração Necessária

Antes de importar, certifique-se de que:

- ✅ Prometheus data source configurado: `http://167.235.76.26:9090`
- ✅ Jaeger data source configurado: `http://167.235.76.26:16686`
- ✅ Backend enviando métricas para o Prometheus

## 🎨 Personalizar Dashboard

Após importar, você pode:

1. **Editar painéis:** Clique em um painel → **Edit**
2. **Adicionar painéis:** Clique em **Add** → **Visualization**
3. **Adicionar variáveis:** Para filtrar por tenant, serviço, etc.
4. **Configurar alertas:** Clique em um painel → **Alert**

## 📚 Outros Dashboards Úteis

### Para Docker Swarm:

- **ID: 179** - Docker Swarm Dashboard
- **ID: 14282** - Docker Container & Host Metrics

### Para OpenTelemetry:

- **ID: 14459** - OpenTelemetry Collector
- **ID: 14460** - OpenTelemetry Service Metrics

### Para Jaeger:

- Use o **Explore** do Grafana com data source Jaeger
- Ou importe: **ID: 13332** - Jaeger Search Dashboard

## ⚠️ Nota sobre Dashboard Kubernetes

O dashboard "CredGestor-jaeguer" que você está vendo é para **Kubernetes**, não Docker Swarm. Por isso mostra "No data".

**Solução:**
- Use o dashboard customizado que criei
- Ou importe dashboards específicos para Docker Swarm
- Ou crie seus próprios painéis usando Explore

---

**O dashboard customizado está pronto para uso com Docker Swarm! 🎉**
