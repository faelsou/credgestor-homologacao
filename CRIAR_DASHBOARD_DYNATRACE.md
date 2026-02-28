# 📊 Criar Dashboard no Dynatrace para CredGestor

Este guia explica como criar dashboards personalizados no Dynatrace para monitorar métricas e traces da aplicação CredGestor.

## 🎯 Objetivo

Criar dashboards que mostrem:
- **Métricas de Performance**: Response time, throughput, error rate
- **Traces**: Distributed traces da aplicação
- **Health Status**: Status dos serviços (backend e frontend)
- **Database Performance**: Se aplicável
- **Custom Metrics**: Métricas específicas da aplicação

## 📋 Pré-requisitos

1. Acesso ao Dynatrace
2. Serviços detectados no Dynatrace:
   - `credgestor-api` (backend)
   - `credgestor-frontend` (frontend)
3. Dados sendo coletados (OneAgent ou OpenTelemetry funcionando)

## 🚀 Criar Dashboard Básico

### Passo 1: Acessar Dashboards

1. No Dynatrace, clique em **Dashboards** no menu lateral
2. Clique em **Create dashboard** (botão no canto superior direito)
3. Dê um nome: `CredGestor - Monitoramento Principal`
4. Clique em **Create**

### Passo 2: Adicionar Widgets de Métricas

#### Widget 1: Response Time do Backend

1. Clique em **Add widget** → **Time series**
2. Configure:
   - **Title**: `Response Time - Backend`
   - **Metric**: Selecione `Service response time`
   - **Service**: Selecione `credgestor-api` (ou o nome do seu serviço)
   - **Aggregation**: `Average` ou `P95` (recomendado)
   - **Time frame**: `Last 1 hour` ou `Last 24 hours`
3. Clique em **Save**

#### Widget 2: Throughput (Requisições por Segundo)

1. Clique em **Add widget** → **Time series**
2. Configure:
   - **Title**: `Throughput - Backend`
   - **Metric**: Selecione `Service request count`
   - **Service**: Selecione `credgestor-api`
   - **Aggregation**: `Sum`
   - **Unit**: `Requests per second`
3. Clique em **Save**

#### Widget 3: Error Rate

1. Clique em **Add widget** → **Time series**
2. Configure:
   - **Title**: `Error Rate - Backend`
   - **Metric**: Selecione `Service failure rate`
   - **Service**: Selecione `credgestor-api`
   - **Aggregation**: `Average`
   - **Unit**: `Percent`
3. Clique em **Save**

#### Widget 4: Response Time do Frontend

1. Clique em **Add widget** → **Time series**
2. Configure:
   - **Title**: `Response Time - Frontend`
   - **Metric**: Selecione `Service response time`
   - **Service**: Selecione `credgestor-frontend` (ou `nginx`)
   - **Aggregation**: `Average` ou `P95`
3. Clique em **Save**

### Passo 3: Adicionar Widget de Traces

#### Widget 5: Distributed Traces

1. Clique em **Add widget** → **Distributed traces**
2. Configure:
   - **Title**: `Traces Recentes - CredGestor`
   - **Service**: Selecione `credgestor-api`
   - **Time frame**: `Last 1 hour`
   - **Show**: `Top 10 traces`
3. Clique em **Save**

#### Widget 6: Trace Analysis

1. Clique em **Add widget** → **Trace analysis**
2. Configure:
   - **Title**: `Análise de Traces`
   - **Service**: Selecione `credgestor-api`
   - **Show**: `Slowest traces` ou `Failed traces`
3. Clique em **Save**

### Passo 4: Adicionar Widgets de Status

#### Widget 7: Service Health

1. Clique em **Add widget** → **Service health**
2. Configure:
   - **Title**: `Status dos Serviços`
   - **Services**: Selecione `credgestor-api` e `credgestor-frontend`
   - **Show**: `Health status` e `Response time`
3. Clique em **Save**

#### Widget 8: Service List

1. Clique em **Add widget** → **Service list**
2. Configure:
   - **Title**: `Serviços CredGestor`
   - **Filter**: `Service name contains "credgestor"`
   - **Columns**: Response time, Error rate, Throughput
3. Clique em **Save**

## 📈 Dashboard Avançado

### Adicionar Métricas Customizadas

Se você configurou métricas customizadas via OpenTelemetry:

1. Clique em **Add widget** → **Time series**
2. Configure:
   - **Title**: `Métrica Customizada`
   - **Metric**: Selecione sua métrica customizada
   - **Service**: Selecione o serviço relacionado
3. Clique em **Save**

### Adicionar Database Performance

Se sua aplicação usa banco de dados:

1. Clique em **Add widget** → **Database queries**
2. Configure:
   - **Title**: `Database Performance`
   - **Service**: Selecione `credgestor-api`
   - **Show**: `Slow queries` ou `Query count`
3. Clique em **Save**

### Adicionar External Service Calls

Para monitorar chamadas a APIs externas (ex: Supabase):

1. Clique em **Add widget** → **External service calls**
2. Configure:
   - **Title**: `Chamadas Externas`
   - **Service**: Selecione `credgestor-api`
   - **Show**: `Response time` e `Error rate`
3. Clique em **Save**

## 🎨 Organizar Dashboard

### Organizar Widgets

1. **Arraste e solte** os widgets para reorganizar
2. **Redimensione** arrastando os cantos dos widgets
3. **Agrupe** widgets relacionados próximos uns dos outros

### Layout Recomendado

```
┌─────────────────────┬─────────────────────┐
│ Response Time       │ Throughput          │
│ Backend             │ Backend             │
├─────────────────────┼─────────────────────┤
│ Error Rate          │ Service Health     │
│ Backend             │                     │
├─────────────────────┴─────────────────────┤
│ Distributed Traces                        │
│ (Widget grande)                           │
├───────────────────────────────────────────┤
│ Service List                              │
│ (Lista de serviços)                       │
└───────────────────────────────────────────┘
```

### Adicionar Seções

1. Clique em **Add section** (se disponível)
2. Dê um nome à seção: `Performance`, `Traces`, `Health`, etc.
3. Arraste widgets para as seções apropriadas

## 🔍 Dashboard de Traces Detalhado

Crie um dashboard específico para análise de traces:

### Widget 1: Trace List

1. Clique em **Add widget** → **Trace list**
2. Configure:
   - **Title**: `Traces - CredGestor API`
   - **Service**: `credgestor-api`
   - **Filter**: Opcional (ex: `status:failed`)
   - **Columns**: Duration, Status, Service, Endpoint
3. Clique em **Save**

### Widget 2: Trace Waterfall

1. Clique em **Add widget** → **Trace waterfall**
2. Configure:
   - **Title**: `Waterfall View`
   - **Service**: `credgestor-api`
   - **Show**: `Last 20 traces`
3. Clique em **Save**

### Widget 3: Trace Statistics

1. Clique em **Add widget** → **Trace statistics**
2. Configure:
   - **Title**: `Estatísticas de Traces`
   - **Service**: `credgestor-api`
   - **Show**: `Duration distribution`, `Status breakdown`
3. Clique em **Save**

## 📊 Métricas Específicas da Aplicação

### Métricas HTTP

Adicione widgets para métricas HTTP específicas:

1. **HTTP Status Codes**:
   - Widget: **Time series**
   - Metric: `Service HTTP status codes`
   - Service: `credgestor-api`
   - Group by: `Status code`

2. **HTTP Methods**:
   - Widget: **Time series**
   - Metric: `Service HTTP methods`
   - Service: `credgestor-api`
   - Group by: `HTTP method`

### Métricas de Endpoints

1. **Top Endpoints**:
   - Widget: **Top list**
   - Metric: `Service request count`
   - Service: `credgestor-api`
   - Group by: `Request path`
   - Show: `Top 10`

2. **Slowest Endpoints**:
   - Widget: **Top list**
   - Metric: `Service response time`
   - Service: `credgestor-api`
   - Group by: `Request path`
   - Sort: `Descending`
   - Show: `Top 10`

## 🎯 Dashboard de Performance

Crie um dashboard focado em performance:

### Widgets Essenciais

1. **Response Time (P50, P95, P99)**
   - Mostra percentis de latência
   - Importante para entender a experiência do usuário

2. **Throughput**
   - Requisições por segundo
   - Identifica picos de tráfego

3. **Error Rate**
   - Taxa de erros
   - Alerta para problemas

4. **Database Query Time**
   - Se aplicável
   - Identifica queries lentas

5. **External Service Calls**
   - Latência de chamadas externas
   - Identifica dependências lentas

## 🔔 Adicionar Alertas ao Dashboard

Você pode adicionar indicadores visuais de alertas:

1. **Widget de Alertas**:
   - Widget: **Problems**
   - Configure para mostrar problemas relacionados aos serviços CredGestor

2. **Thresholds Visuais**:
   - Configure cores nos widgets:
     - Verde: < 200ms
     - Amarelo: 200-500ms
     - Vermelho: > 500ms

## 📝 Exemplo Completo: Dashboard "CredGestor - Overview"

### Estrutura do Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ CredGestor - Overview                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ Response     │ │ Throughput   │ │ Error Rate   │     │
│ │ Time (P95)   │ │ (req/s)      │ │ (%)          │     │
│ │ Backend      │ │ Backend      │ │ Backend      │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Service Health                                    │  │
│ │ [credgestor-api] [credgestor-frontend]           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Distributed Traces - Last Hour                    │  │
│ │ [Lista de traces com duração e status]            │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌──────────────┐ ┌──────────────┐                      │
│ │ Top          │ │ Slowest      │                      │
│ │ Endpoints    │ │ Endpoints    │                      │
│ └──────────────┘ └──────────────┘                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Personalização Visual

### Cores e Temas

1. Clique no ícone de **Settings** do dashboard
2. Configure:
   - **Theme**: Light ou Dark
   - **Color scheme**: Personalize cores

### Tamanhos de Widget

- **Small**: Para métricas simples
- **Medium**: Para gráficos de linha
- **Large**: Para listas e tabelas
- **Full width**: Para traces e análises detalhadas

## 📱 Compartilhar Dashboard

### Compartilhar com a Equipe

1. Clique em **Share** (canto superior direito)
2. Configure:
   - **Access**: `Team` ou `Public`
   - **Permissions**: `View` ou `Edit`
3. Copie o link ou envie por email

### Exportar Dashboard

1. Clique em **Settings** → **Export**
2. Salve como JSON (para backup ou importar em outro ambiente)

## 🔄 Atualização Automática

Os dashboards são atualizados automaticamente em tempo real. Você pode:

1. **Configurar refresh rate**: 
   - Settings → Auto-refresh
   - Escolha: `30s`, `1min`, `5min`, etc.

2. **Time range**:
   - Configure o período padrão: `Last 1 hour`, `Last 24 hours`, etc.

## ✅ Checklist: Dashboard Completo

- [ ] Dashboard criado com nome descritivo
- [ ] Widget de Response Time (Backend) adicionado
- [ ] Widget de Throughput adicionado
- [ ] Widget de Error Rate adicionado
- [ ] Widget de Service Health adicionado
- [ ] Widget de Distributed Traces adicionado
- [ ] Widget de Top Endpoints adicionado
- [ ] Widget de Slowest Endpoints adicionado
- [ ] Dashboard organizado e visualmente agradável
- [ ] Dashboard compartilhado com a equipe
- [ ] Auto-refresh configurado

## 🐛 Troubleshooting

### Problema: Widgets não mostram dados

**Soluções:**
1. Verifique se o serviço está selecionado corretamente
2. Verifique o time range (pode estar olhando para período sem dados)
3. Verifique se o OneAgent/OpenTelemetry está coletando dados
4. Aguarde alguns minutos (dados podem demorar para aparecer)

### Problema: Métricas não aparecem

**Soluções:**
1. Verifique se o serviço está sendo detectado no Dynatrace
2. Faça algumas requisições à aplicação
3. Verifique se há dados no período selecionado
4. Verifique filtros aplicados

### Problema: Traces não aparecem

**Soluções:**
1. Verifique se há requisições sendo feitas à aplicação
2. Verifique o time range
3. Verifique filtros de serviço
4. Aguarde alguns minutos após fazer requisições

## 📚 Recursos Adicionais

### Templates de Dashboard

O Dynatrace oferece templates pré-configurados:

1. Vá em **Dashboards** → **Browse templates**
2. Procure por:
   - `Application Performance`
   - `Microservices`
   - `API Monitoring`

### Métricas Disponíveis

Para ver todas as métricas disponíveis:

1. Vá em **Settings** → **Metrics**
2. Procure por métricas relacionadas a:
   - `service.response.time`
   - `service.request.count`
   - `service.failure.rate`
   - `service.database.query.time`

### Documentação Oficial

- [Dynatrace Dashboards](https://www.dynatrace.com/support/help/observe-and-explore/dashboards)
- [Creating Custom Dashboards](https://www.dynatrace.com/support/help/observe-and-explore/dashboards/create-dashboards)
- [Widget Types](https://www.dynatrace.com/support/help/observe-and-explore/dashboards/widgets)

---

**Seu dashboard está pronto para monitorar a aplicação CredGestor! 🎉**

Para mais informações sobre configuração da aplicação, consulte `CONFIGURAR_APLICACAO_DYNATRACE.md`.
