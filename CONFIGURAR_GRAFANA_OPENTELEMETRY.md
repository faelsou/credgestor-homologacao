# 🔧 Configurar Grafana para OpenTelemetry

## ⚠️ Problemas Identificados

1. **Prometheus Data Source:** Não consegue resolver `otel-collector`
2. **Jaeger Data Source:** Tentando conectar via IPv6 `[::1]` e falhando

## ✅ Soluções

### 1. Configurar Prometheus Data Source

⚠️ **IMPORTANTE:** O exporter Prometheus do OpenTelemetry Collector **não implementa a API REST do Prometheus**. Ele apenas expõe `/metrics`, não `/api/v1/query`.

**Solução:** Use o Prometheus real que já está rodando no projeto.

**URL Correta:**
```
http://167.235.76.26:9090
```

**Passos:**
1. Vá em **Connections** → **Data sources** → **prometheus-otel**
2. No campo **"Prometheus server URL"**, altere de:
   ```
   http://otel-collector:8889
   ```
   Para:
   ```
   http://167.235.76.26:9090
   ```
3. Clique em **"Save & test"**

**Por quê?** 
- O OpenTelemetry Collector expõe apenas `/metrics` (formato Prometheus), não a API REST completa
- O Prometheus real na porta 9090 já está coletando métricas da API e tem a API REST completa
- Este Prometheus já está configurado para coletar métricas do `credgestor-api`

### 2. Configurar Jaeger Data Source

**URL Correta:**
```
http://167.235.76.26:16686
```

**Passos:**
1. Vá em **Connections** → **Data sources** → **jaeger**
2. No campo **"URL"**, altere de:
   ```
   http://localhost:16686
   ```
   Para:
   ```
   http://167.235.76.26:16686
   ```
3. Clique em **"Save & test"**

**Por quê?** O Grafana está tentando conectar via IPv6 `[::1]` quando usa `localhost`. Usar o IP explícito força IPv4 e funciona corretamente.

## 🔍 Verificação

Após configurar, teste cada data source:

### Testar Prometheus:
1. Clique em **"Save & test"** no Prometheus data source
2. Deve aparecer: ✅ **"Data source is working"**

### Testar Jaeger:
1. Clique em **"Save & test"** no Jaeger data source
2. Deve aparecer: ✅ **"Data source is working"**

## 📊 Usar os Data Sources

### Explorar Traces no Jaeger:
1. Vá em **Explore** (ícone de bússola)
2. Selecione **Jaeger** como data source
3. Selecione o serviço: **credgestor-api**
4. Clique em **"Run query"**
5. Veja os traces!

### Explorar Métricas no Prometheus:
1. Vá em **Explore**
2. Selecione **Prometheus** (prometheus-otel) como data source
3. Digite uma query, por exemplo:
   ```
   http_requests_total
   ```
   Ou:
   ```
   rate(http_requests_total[5m])
   ```
4. Clique em **"Run query"**

**Métricas disponíveis:**
- `http_requests_total` - Total de requisições HTTP
- `http_request_duration_seconds` - Duração das requisições
- `http_requests_inprogress` - Requisições em progresso
- Métricas do banco de dados (se configuradas)

## 🎯 Dashboards Recomendados

Após configurar os data sources, importe estes dashboards:

### Para Jaeger:
- [Jaeger - Search](https://grafana.com/grafana/dashboards/13332)

### Para Prometheus (OpenTelemetry):
- [OpenTelemetry Collector](https://grafana.com/grafana/dashboards/14459)
- [OpenTelemetry Service](https://grafana.com/grafana/dashboards/14460)

## 📝 Resumo das URLs

| Serviço | URL no Grafana | Descrição |
|---------|----------------|-----------|
| **Jaeger** | `http://167.235.76.26:16686` | Interface web para traces |
| **Prometheus** | `http://167.235.76.26:9090` | Prometheus real (métricas da API) |

**Nota:** O OpenTelemetry Collector na porta 8889 expõe apenas `/metrics`, não a API REST. Use o Prometheus na porta 9090 que já está coletando métricas da API.

## ⚠️ Nota Importante

Se o IP do servidor mudar, você precisará atualizar essas URLs no Grafana. Para evitar isso, você pode:

1. **Usar DNS interno** (se disponível)
2. **Criar um alias** no `/etc/hosts` do container do Grafana
3. **Usar variáveis de ambiente** no Grafana (se configurado)

## ✅ Checklist

- [ ] Prometheus data source configurado com IP do host
- [ ] Jaeger data source configurado com IP do host
- [ ] Ambos os data sources testados e funcionando
- [ ] Dashboards importados (opcional)

---

**Após essas configurações, o Grafana estará totalmente integrado com OpenTelemetry! 🎉**
