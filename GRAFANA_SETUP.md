# 📊 Guia de Configuração do Grafana - CredGestor

Este guia explica como configurar e importar o dashboard de métricas do CredGestor no Grafana, seguindo as melhores práticas de SRE e DevOps.

## 📋 Pré-requisitos

1. **Grafana instalado e acessível** em `https://grafana.findfruit.com.br`
2. **Prometheus** (opcional, para métricas de infraestrutura e API)
3. **Acesso ao PostgreSQL/Supabase** para métricas de negócio

## 🚀 Passo a Passo

### 1. Importar o Dashboard

1. Acesse o Grafana: `https://grafana.findfruit.com.br`
2. Vá em **Dashboards** → **Import**
3. Clique em **Upload JSON file**
4. Selecione o arquivo `grafana-dashboard-credgestor.json`
5. Clique em **Load**
6. Configure os Data Sources (veja seção abaixo)
7. Clique em **Import**

### 2. Configurar Data Sources

#### 2.1. PostgreSQL (Supabase)

✅ **Data Source já criado!** 

O dashboard está configurado para usar o data source: `grafana-postgresql-datasource-supabase-credgestor`

Se você precisar criar um novo data source ou ajustar:

1. Vá em **Configuration** → **Data Sources** → **Add data source**
2. Selecione **PostgreSQL**
3. Configure:
   - **Name**: `grafana-postgresql-datasource-supabase-credgestor` (ou ajuste o dashboard para usar outro nome)
   - **Host**: URL do seu Supabase (ex: `aws-1-us-east-2.pooler.supabase.com:6543`)
   - **Database**: `postgres`
   - **User**: `postgres` (ou seu usuário)
   - **Password**: Sua senha do Supabase
   - **SSL Mode**: `require`
   - **Max open**: `100`
   - **Max idle**: `100`
   - **Max lifetime**: `14400`
4. Clique em **Save & Test**

**Nota**: Se você usar um nome diferente para o data source, você precisará atualizar o dashboard ou selecionar o data source correto na variável `DS_POSTGRES` ao importar.

#### 2.2. Prometheus (Stack Observability)

✅ **Você já tem um stack "observability" configurado com Prometheus, cAdvisor e node_exporter!**

Para configurar o data source do Prometheus:

1. Vá em **Configuration** → **Data Sources** → **Add data source**
2. Selecione **Prometheus**
3. Configure:
   - **Name**: `Prometheus` (ou o nome que você definiu na variável)
   - **URL**: 
     - Se o Grafana está no mesmo stack: `http://observability_prometheus:9090`
     - Se acessando externamente: `http://localhost:9090` ou `http://seu-ip-vps:9090`
4. Clique em **Save & Test**

**Importante**: O dashboard já está configurado para usar:
- **cAdvisor** para métricas de containers Docker (labels: `container_label_com_docker_swarm_service_name=~"credgestor.*"`)
- **node_exporter** para métricas de sistema/host

📖 **Consulte os guias**:
- `GRAFANA_OBSERVABILITY_STACK.md` - Guia específico para seu stack observability
- `GRAFANA_PROMETHEUS_SETUP.md` - Guia geral de configuração do Prometheus

**Nota**: Se não tiver Prometheus, os painéis que dependem dele não funcionarão, mas os painéis de PostgreSQL continuarão funcionando.

### 3. Configurar Prometheus (Opcional)

Se você quiser coletar métricas de infraestrutura e API, você precisa configurar o Prometheus.

#### 3.1. Adicionar Instrumentação no FastAPI

Adicione o `prometheus-fastapi-instrumentator` ao seu backend:

```bash
pip install prometheus-fastapi-instrumentator
```

Adicione no `backend/main.py`:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# Após criar o app FastAPI
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)
```

#### 3.2. Configurar Prometheus para coletar métricas

Crie um arquivo `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'credgestor-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
```

#### 3.3. Adicionar ao docker-compose.yml

```yaml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - network_public
```

### 4. Métricas Disponíveis no Dashboard

O dashboard inclui os seguintes painéis:

#### 📈 Métricas de API (requer Prometheus)
- **Taxa de Requisições por Endpoint (RPS)**: Requisições por segundo por endpoint
- **Latência (p50, p95, p99)**: Percentis de latência
- **Taxa de Erros (4xx, 5xx)**: Erros HTTP por status code
- **Status API**: Status de saúde da API

#### 💻 Métricas de Infraestrutura (requer Prometheus)
- **CPU Disponível**: Percentual de CPU disponível
- **Memória Disponível**: Percentual de memória disponível
- **Utilização de Recursos**: Gráfico de CPU e memória ao longo do tempo

#### 💼 Métricas de Negócio (PostgreSQL/Supabase)
- **Tenants Ativos**: Número de tenants ativos
- **Usuários Ativos**: Número de usuários ativos
- **Total de Clientes**: Total de clientes cadastrados
- **Total de Empréstimos**: Total de empréstimos
- **Crescimento (Clientes e Empréstimos)**: Gráfico de crescimento nos últimos 7 dias
- **Parcelas Vencidas**: Número de parcelas vencidas
- **Valor Total Vencido**: Valor total em parcelas vencidas
- **Status de Parcelas**: Distribuição de parcelas (pagas, vencidas, pendentes)
- **Atividade de Login**: Logins bem-sucedidos e falhos
- **Top 10 Tenants por Volume**: Ranking dos maiores tenants

#### 🗄️ Métricas de Banco de Dados (PostgreSQL/Supabase)
- **Conexões Ativas no Banco**: Número de conexões ativas
- **Tamanho do Banco de Dados**: Tamanho total do banco

## 🔧 Ajustes Personalizados

### Modificar Queries SQL

As queries SQL podem ser ajustadas conforme necessário. Algumas considerações:

1. **Filtros por Tenant**: As queries já filtram apenas tenants ativos
2. **Períodos**: Ajuste os intervalos (`INTERVAL '7 days'`) conforme necessário
3. **Campos**: Verifique se os nomes das colunas correspondem ao seu schema

### Adicionar Novos Painéis

Para adicionar novos painéis:

1. No Grafana, clique em **Edit** no dashboard
2. Clique em **Add** → **Visualization**
3. Configure o painel conforme necessário
4. Salve o dashboard

## 📊 Melhores Práticas SRE Implementadas

### Golden Signals
- ✅ **Latency**: Latência p50, p95, p99
- ✅ **Traffic**: Taxa de requisições (RPS)
- ✅ **Errors**: Taxa de erros 4xx/5xx
- ✅ **Saturation**: CPU e memória

### RED Method
- ✅ **Rate**: Requisições por segundo
- ✅ **Errors**: Taxa de erros
- ✅ **Duration**: Tempo de resposta

### USE Method
- ✅ **Utilization**: CPU e memória
- ✅ **Saturation**: Limites de recursos
- ✅ **Errors**: Erros de sistema

## 🚨 Alertas Recomendados

Configure alertas no Grafana para:

1. **API Down**: `up{job="credgestor-api"} == 0`
2. **Alta Taxa de Erros**: `rate(http_requests_total{status=~"5.."}[5m]) > 0.1`
3. **Alta Latência**: `histogram_quantile(0.95, ...) > 1000`
4. **CPU Alta**: `100 - (avg(rate(container_cpu_usage_seconds_total...)) * 100) < 20`
5. **Memória Baixa**: `100 - ((container_memory_usage_bytes... / container_spec_memory_limit_bytes...) * 100) < 10`
6. **Parcelas Vencidas**: `COUNT(installments WHERE status != 'paid' AND due_date < CURRENT_DATE) > 100`

## 📝 Notas Importantes

1. **Segurança**: Certifique-se de que as credenciais do banco de dados estão protegidas
2. **Performance**: Queries complexas podem impactar o desempenho do banco. Considere índices adequados
3. **Atualização**: O dashboard atualiza automaticamente a cada 30 segundos
4. **Timezone**: O dashboard usa o timezone do navegador

## 🔗 Links Úteis

- [Documentação do Grafana](https://grafana.com/docs/grafana/latest/)
- [Documentação do Prometheus](https://prometheus.io/docs/)
- [PostgreSQL Data Source](https://grafana.com/docs/grafana/latest/datasources/postgres/)

## 🆘 Troubleshooting

### ⚠️ Todos os Painéis Mostram "No Data"?

**Consulte o guia completo**: `GRAFANA_TROUBLESHOOTING.md`

**Solução rápida**:
1. Verifique se os Data Sources estão configurados: **Configuration** → **Data Sources**
2. Teste cada data source: Clique em **Save & Test**
3. Verifique as variáveis do dashboard: ⚙️ → **Variables** → Selecione os data sources corretos
4. Teste queries no **Explore** antes de usar no dashboard

### Painéis não aparecem
- Verifique se os Data Sources estão configurados corretamente
- Teste a conexão com o banco de dados
- Verifique se as queries SQL estão corretas para seu schema

### Métricas de Prometheus não aparecem
- **Consulte o guia**: `GRAFANA_PROMETHEUS_SETUP.md` para descobrir quais métricas estão disponíveis
- **Consulte o guia**: `GRAFANA_OBSERVABILITY_STACK.md` para configuração específica do seu stack
- Verifique se o Prometheus está rodando
- Verifique se a API está expondo `/metrics` (se aplicável)
- Verifique se o Prometheus está coletando métricas do job/target correto
- **Ajuste os labels nas queries**: As queries usam `container_label_com_docker_swarm_service_name=~"credgestor.*"` - ajuste conforme seus labels reais
- Use o **Explore** do Grafana para testar queries antes de adicionar ao dashboard

### Queries SQL falham
- Verifique se os nomes das tabelas e colunas estão corretos
- Verifique se você tem permissões para ler as tabelas
- Verifique se os filtros por tenant estão corretos
- Teste queries simples primeiro no **Explore**
