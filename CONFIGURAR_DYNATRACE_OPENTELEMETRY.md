# 🔧 Configurar Dynatrace para OpenTelemetry

Este guia explica como configurar observabilidade utilizando OpenTelemetry com Dynatrace.

> 💡 **Novo:** Para configurar sua aplicação CredGestor especificamente, consulte o guia **[CONFIGURAR_APLICACAO_DYNATRACE.md](./CONFIGURAR_APLICACAO_DYNATRACE.md)** que contém instruções práticas e específicas para sua aplicação.

## 📋 Pré-requisitos

1. **Conta Dynatrace** ativa
2. **Environment ID** do Dynatrace
3. **API Token** do Dynatrace com permissões para ingerir dados OpenTelemetry

## 🔑 Obter Credenciais do Dynatrace

### 📍 Navegação na Interface do Dynatrace

Se você está visualizando a interface do Dynatrace:

1. **Menu Lateral Esquerdo**: Use para navegar entre seções
   - **Settings** - Configurações e integrações
   - **Hub** - Extensões e recursos adicionais
   - **Services** - Visualizar serviços instrumentados
   - **Distributed Tracing** - Ver traces

2. **Busca no Settings**: Use a barra de busca no topo do Settings para encontrar rapidamente:
   - "Dynatrace API"
   - "OpenTelemetry"
   - "Custom Data ingest"

3. **Hub**: No Settings → Hub, você encontrará:
   - **Dynatrace API** - Documentação e configuração da API
   - **Custom Data ingest via API** - Para ingestão de dados customizados
   - **Log ingestion API** - Para logs

### 1. Obter Environment ID

1. Acesse o Dynatrace: https://app.dynatrace.com
2. O **Environment ID** aparece na URL do navegador:
   - Exemplo: `https://xhg44629.apps.dynatrace.com` → Environment ID: `xhg44629`
   - Ou: `https://abc12345.live.dynatrace.com` → Environment ID: `abc12345`
3. Você também pode encontrar no canto superior direito, clicando no nome do ambiente
4. O Environment ID é a parte antes de `.apps.dynatrace.com` ou `.live.dynatrace.com`

### 2. Criar API Token

Existem duas formas de criar um token para OpenTelemetry:

#### Opção A: Via Dynatrace API (Recomendado para OpenTelemetry)

1. No Dynatrace, vá em **Settings** (menu lateral esquerdo)
2. Na barra de busca do Settings, procure por **"Dynatrace API"**
3. Ou navegue: **Settings** → **Integration** → **Platform as a Service** → **Dynatrace API**
4. Clique em **"Generate new token"** ou **"+ Add token"**
5. Configure:
   - **Token name**: `OpenTelemetry Integration`
   - **Token scope**: Selecione:
     - `Ingest OpenTelemetry traces`
     - `Ingest OpenTelemetry metrics`
     - `Ingest OpenTelemetry logs` (opcional)
6. Clique em **Generate**
7. **Copie o token** (você só verá ele uma vez!)
   - O token começa com `dt0c01.` ou `dt0c02.`

#### Opção B: Via Custom Data Ingest API

Se você estiver usando a opção "Custom Data ingest via API" (visível no Hub):

1. No Dynatrace, vá em **Settings** → **Hub**
2. Procure por **"Custom Data ingest via API"** no Hub
3. Siga as instruções para criar um token específico para ingestão de dados customizados
4. Este método é útil se você quiser mais controle sobre os dados enviados

**💡 Dica:** Para OpenTelemetry, a **Opção A** é mais recomendada, pois oferece suporte nativo para OTLP.

## 🤖 OneAgent vs OpenTelemetry

### O que é o OneAgent?

O **OneAgent** é o agente nativo do Dynatrace que:
- ✅ **Instrumentação automática** - Detecta e instrumenta automaticamente aplicações
- ✅ **Zero configuração** - Funciona sem código adicional
- ✅ **Suporte nativo** - Integração profunda com linguagens e frameworks
- ✅ **Métricas avançadas** - Coleta métricas de sistema, aplicação e infraestrutura automaticamente
- ✅ **Smartscape** - Mapeia automaticamente a arquitetura da aplicação

### Comparação: OneAgent vs OpenTelemetry

| Característica | OneAgent | OpenTelemetry |
|---------------|----------|---------------|
| **Configuração** | Instalação simples | Requer configuração de código |
| **Instrumentação** | Automática | Manual ou semi-automática |
| **Padrão** | Proprietário (Dynatrace) | Padrão aberto (CNCF) |
| **Vendor Lock-in** | Sim (Dynatrace) | Não (multi-vendor) |
| **Customização** | Limitada | Totalmente customizável |
| **Integração** | Apenas Dynatrace | Múltiplos backends |
| **Overhead** | Baixo | Baixo a médio |

### 🎯 Qual Usar?

#### Use OneAgent se:
- ✅ Você quer **zero configuração**
- ✅ Você usa **apenas Dynatrace**
- ✅ Você precisa de **instrumentação automática profunda**
- ✅ Você quer **Smartscape** (mapeamento automático de arquitetura)

#### Use OpenTelemetry se:
- ✅ Você quer **padrão aberto** (evitar vendor lock-in)
- ✅ Você precisa de **customização avançada**
- ✅ Você quer **múltiplos backends** (Dynatrace + Jaeger + Prometheus)
- ✅ Você já tem **instrumentação OpenTelemetry** no código

#### Use Ambos (Híbrido) se:
- ✅ Você quer **melhor dos dois mundos**
- ✅ Você tem **aplicações diferentes** com necessidades diferentes
- ✅ Você quer **redundância** e **comparação de dados**

## 🏗️ Arquitetura

### Com OneAgent Instalado

Se você já instalou o OneAgent, ele está coletando dados automaticamente:

```
┌─────────────┐
│  Backend    │──────▶ OneAgent ──────▶ Dynatrace
│  Frontend   │         (automático)
└─────────────┘
```

**O OneAgent já está funcionando!** Você pode:
- Ver dados no Dynatrace imediatamente
- Usar apenas OneAgent (sem OpenTelemetry)
- Ou combinar OneAgent + OpenTelemetry (híbrido)

### Com OpenTelemetry

Existem duas formas de enviar dados OpenTelemetry para o Dynatrace:

### Opção 1: Via OpenTelemetry Collector (Recomendado)

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Backend    │──────▶│  OTEL Collector  │──────▶│  Dynatrace   │
│  Frontend   │      │                  │      │              │
└─────────────┘      └──────────────────┘      └──────────────┘
```

**Vantagens:**
- Centraliza configuração
- Permite processar/enriquecer dados antes de enviar
- Mantém compatibilidade com outros backends (Jaeger, Prometheus)

### Opção 2: Direto para Dynatrace

```
┌─────────────┐      ┌──────────────┐
│  Backend    │──────▶│  Dynatrace   │
│  Frontend   │      │              │
└─────────────┘      └──────────────┘
```

**Vantagens:**
- Mais simples
- Menos latência
- Menos pontos de falha

### Opção 3: OneAgent + OpenTelemetry (Híbrido)

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Backend    │──────▶│  OTEL Collector  │──────▶│  Dynatrace   │
│  Frontend   │      │                  │      │              │
└─────────────┘      └──────────────────┘      └──────────────┘
       │                                              ▲
       └────────── OneAgent ─────────────────────────┘
```

**Vantagens:**
- Dados do OneAgent (automático) + OpenTelemetry (customizado)
- Redundância e validação cruzada
- Melhor cobertura de observabilidade

**⚠️ Atenção:** Pode haver duplicação de dados. Configure filtros no Dynatrace se necessário.

## 🔧 Configuração

### 🎯 Você Instalou o OneAgent?

Se você já instalou o OneAgent, você tem **3 opções**:

1. **Usar apenas OneAgent** (mais simples, já está funcionando)
2. **Usar apenas OpenTelemetry** (desabilitar OneAgent, usar OpenTelemetry)
3. **Usar ambos** (OneAgent + OpenTelemetry em conjunto)

#### Opção A: Usar Apenas OneAgent (Recomendado se já instalou)

Se você instalou o OneAgent e está satisfeito com a instrumentação automática:

✅ **Você não precisa fazer mais nada!** O OneAgent já está coletando dados.

**Verificar se está funcionando:**
1. Acesse o Dynatrace
2. Vá em **Services** (menu lateral)
3. Procure pelo seu serviço (ex: `credgestor-api`)
4. Você deve ver métricas, traces e logs aparecendo automaticamente

**Vantagens:**
- Zero configuração adicional
- Instrumentação automática profunda
- Smartscape (mapeamento automático de arquitetura)

#### Opção B: Desabilitar OneAgent e Usar Apenas OpenTelemetry

Se você prefere usar apenas OpenTelemetry (padrão aberto):

1. **Desabilitar OneAgent** (se necessário):
   ```bash
   # No servidor onde o OneAgent está instalado
   sudo systemctl stop dynatrace-oneagent
   sudo systemctl disable dynatrace-oneagent
   ```

2. **Seguir as configurações abaixo** para OpenTelemetry

#### Opção C: Usar Ambos (Híbrido)

Para usar OneAgent + OpenTelemetry juntos:

1. **Manter OneAgent ativo** (já está funcionando)
2. **Configurar OpenTelemetry** (seguir instruções abaixo)
3. **Configurar filtros no Dynatrace** para evitar duplicação (opcional)

**⚠️ Nota:** Com ambos ativos, você pode ver dados duplicados. O Dynatrace geralmente consegue lidar com isso, mas você pode configurar filtros se necessário.

---

## 🔧 Configuração do OpenTelemetry

### Opção 1A: Configurar via OpenTelemetry Collector (usando exporter Dynatrace)

Esta opção usa o exporter específico do Dynatrace, que oferece melhor integração.

### Opção 1B: Configurar via OpenTelemetry Collector (usando OTLP)

Esta opção usa o exporter OTLP padrão para enviar dados ao Dynatrace. É mais simples e não requer a imagem `contrib`.

### Opção 1: Configurar via OpenTelemetry Collector (Exporter Dynatrace)

#### 1.1 Atualizar `otel-collector-config.yaml` (Exporter Dynatrace)

Adicione o exporter do Dynatrace ao arquivo de configuração:

```yaml
exporters:
  # ... outros exporters existentes ...
  
  # Exporter para Dynatrace (requer imagem contrib)
  dynatrace:
    endpoint: https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp
    api_key: ${DYNATRACE_API_KEY}
    tags:
      - key: environment
        value: production
      - key: service.name
        from_attribute: service.name
```

**Substitua:**
- `{ENVIRONMENT_ID}` pelo seu Environment ID do Dynatrace
- `${DYNATRACE_API_KEY}` pela variável de ambiente (não coloque o token diretamente no arquivo!)

**⚠️ Requer:** Imagem `otel/opentelemetry-collector-contrib` (não a imagem básica)

#### 1.1B Atualizar `otel-collector-config.yaml` (Exporter OTLP - Alternativa Simples)

Se preferir não usar a imagem contrib, use o exporter OTLP padrão:

```yaml
exporters:
  # ... outros exporters existentes ...
  
  # Exporter OTLP para Dynatrace (usa imagem padrão)
  otlp/dynatrace:
    endpoint: https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp
    headers:
      Api-Token: ${DYNATRACE_API_KEY}
    tls:
      insecure: false  # Dynatrace usa HTTPS
```

**Substitua:**
- `{ENVIRONMENT_ID}` pelo seu Environment ID do Dynatrace
- `${DYNATRACE_API_KEY}` pela variável de ambiente

**✅ Vantagem:** Funciona com a imagem padrão `otel/opentelemetry-collector`

#### 1.2 Adicionar ao Pipeline

**Se usar exporter Dynatrace:**
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_http/jaeger, dynatrace, debug]  # Adicione 'dynatrace'
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, dynatrace, debug]  # Adicione 'dynatrace'
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [dynatrace, debug]  # Adicione 'dynatrace'
```

**Se usar exporter OTLP:**
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_http/jaeger, otlp/dynatrace, debug]  # Adicione 'otlp/dynatrace'
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, otlp/dynatrace, debug]  # Adicione 'otlp/dynatrace'
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/dynatrace, debug]  # Adicione 'otlp/dynatrace'
```

#### 1.3 Configurar Variável de Ambiente

No `docker-compose.yml`, adicione a variável de ambiente para o OpenTelemetry Collector:

```yaml
otel-collector:
  environment:
    DYNATRACE_API_KEY: ${DYNATRACE_API_KEY}
```

E no arquivo `.env`:

```bash
DYNATRACE_API_KEY=dt0c01.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Opção 2: Configurar Direto para Dynatrace

#### 2.1 Backend (FastAPI)

No `docker-compose.yml`, atualize as variáveis de ambiente do serviço `api`:

```yaml
api:
  environment:
    # ... outras variáveis ...
    
    # Dynatrace Configuration
    OTEL_EXPORTER_OTLP_ENDPOINT: https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp
    OTEL_EXPORTER_OTLP_HEADERS: Api-Token=${DYNATRACE_API_TOKEN}
    OTEL_TRACES_EXPORTER: otlp
    OTEL_METRICS_EXPORTER: otlp
    OTEL_LOGS_EXPORTER: otlp
```

**Substitua `{ENVIRONMENT_ID}` pelo seu Environment ID.**

#### 2.2 Frontend (React)

No arquivo `.env` ou nas variáveis de ambiente do build:

```bash
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp
VITE_OTEL_EXPORTER_OTLP_HEADERS=Api-Token=${DYNATRACE_API_TOKEN}
```

**Substitua `{ENVIRONMENT_ID}` pelo seu Environment ID.**

## 📝 Exemplo Completo: Configuração via Collector

### Opção A: Usando Exporter Dynatrace (Requer imagem contrib)

#### 1. Atualizar `otel-collector-config.yaml`

```yaml
# Configuração do OpenTelemetry Collector
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  
  memory_limiter:
    limit_mib: 512
    check_interval: 1s

exporters:
  # Exporter OTLP HTTP para Jaeger (mantém compatibilidade)
  otlp_http/jaeger:
    endpoint: http://jaeger:4318
    tls:
      insecure: true
  
  # Exporter para Prometheus (mantém compatibilidade)
  prometheus:
    endpoint: "0.0.0.0:8889"
  
  # Exporter para Dynatrace (requer imagem contrib)
  dynatrace:
    endpoint: https://abc12345.live.dynatrace.com/api/v2/otlp
    api_key: ${DYNATRACE_API_KEY}
    tags:
      - key: environment
        value: production
      - key: deployment.environment
        from_attribute: deployment.environment
  
  # Exporter de debug
  debug:
    verbosity: normal

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_http/jaeger, dynatrace, debug]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, dynatrace, debug]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [dynatrace, debug]
```

### Opção B: Usando Exporter OTLP (Funciona com imagem padrão)

#### 1. Atualizar `otel-collector-config.yaml`

```yaml
# Configuração do OpenTelemetry Collector
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  
  memory_limiter:
    limit_mib: 512
    check_interval: 1s

exporters:
  # Exporter OTLP HTTP para Jaeger (mantém compatibilidade)
  otlp_http/jaeger:
    endpoint: http://jaeger:4318
    tls:
      insecure: true
  
  # Exporter para Prometheus (mantém compatibilidade)
  prometheus:
    endpoint: "0.0.0.0:8889"
  
  # Exporter OTLP para Dynatrace (usa imagem padrão)
  otlp/dynatrace:
    endpoint: https://abc12345.live.dynatrace.com/api/v2/otlp
    headers:
      Api-Token: ${DYNATRACE_API_KEY}
    tls:
      insecure: false
  
  # Exporter de debug
  debug:
    verbosity: normal

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_http/jaeger, otlp/dynatrace, debug]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, otlp/dynatrace, debug]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/dynatrace, debug]
```

**⚠️ Substitua `abc12345` pelo seu Environment ID do Dynatrace**

### 2. Atualizar `docker-compose.yml`

**Se usar exporter Dynatrace (Opção A):**
⚠️ **IMPORTANTE:** O exporter Dynatrace não está incluído na imagem padrão. Você precisa usar a imagem **contrib**:

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest  # ⚠️ Use 'contrib'
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
  environment:
    DYNATRACE_API_KEY: ${DYNATRACE_API_KEY}
  ports:
    - "4317:4317"   # OTLP gRPC
    - "4318:4318"   # OTLP HTTP
    - "8889:8889"   # Prometheus metrics
  networks:
    - network_public
```

**Se usar exporter OTLP (Opção B):**
✅ Funciona com a imagem padrão:

```yaml
otel-collector:
  image: otel/opentelemetry-collector:latest  # ✅ Imagem padrão funciona
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
  environment:
    DYNATRACE_API_KEY: ${DYNATRACE_API_KEY}
  ports:
    - "4317:4317"   # OTLP gRPC
    - "4318:4318"   # OTLP HTTP
    - "8889:8889"   # Prometheus metrics
  networks:
    - network_public
```

**Diferença:**
- `otel/opentelemetry-collector` - Imagem básica (OTLP funciona, exporter Dynatrace não)
- `otel/opentelemetry-collector-contrib` - Imagem com exporters adicionais (inclui exporter Dynatrace)

### 3. Adicionar ao `.env`

```bash
# Dynatrace Configuration
DYNATRACE_API_KEY=dt0c01.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## ✅ Verificação

### 🔍 Verificar se OneAgent Está Funcionando

Se você instalou o OneAgent, verifique se está coletando dados:

#### 1. Verificar Status do OneAgent no Servidor

```bash
# Verificar se o serviço está rodando
sudo systemctl status dynatrace-oneagent

# Ver logs do OneAgent
sudo journalctl -u dynatrace-oneagent -f

# Verificar processos do OneAgent
ps aux | grep oneagent
```

#### 2. Verificar no Dynatrace

1. Acesse o Dynatrace
2. Vá em **Infrastructure** → **Hosts** (menu lateral)
3. Procure pelo seu servidor/host
4. Você deve ver:
   - ✅ Status: **Active**
   - ✅ Métricas sendo coletadas
   - ✅ Processos detectados

#### 3. Verificar Services

1. No Dynatrace, vá em **Services** (menu lateral)
2. Procure pelo seu serviço (ex: `credgestor-api`, `python`, `node`, etc.)
3. Você deve ver:
   - ✅ Traces aparecendo
   - ✅ Métricas de performance
   - ✅ Logs (se configurado)

#### 4. Verificar Smartscape

1. No Dynatrace, vá em **Smartscape** (menu lateral)
2. Você deve ver um mapa da arquitetura com:
   - Hosts
   - Processos
   - Serviços
   - Dependências

**Se você vê dados no Dynatrace, o OneAgent está funcionando! 🎉**

### 1. Verificar Logs do Collector (Apenas se usar OpenTelemetry)

```bash
docker logs otel-collector
```

Procure por mensagens como:
- ✅ `"Exporting traces to Dynatrace"`
- ✅ `"Exporting metrics to Dynatrace"`

### 2. Verificar OpenTelemetry no Dynatrace

Se você configurou OpenTelemetry (além ou ao invés do OneAgent):

1. Acesse o Dynatrace: https://app.dynatrace.com
2. Vá em **Observe and explore** → **Services**
3. Procure pelo serviço `credgestor-api` (ou o nome configurado em `OTEL_SERVICE_NAME`)
4. Você deve ver:
   - **Traces** aparecendo em tempo real
   - **Métricas** sendo coletadas
   - **Logs** (se configurado)

**💡 Dica:** Se você está usando OneAgent + OpenTelemetry, você pode ver o mesmo serviço aparecendo duas vezes ou com dados duplicados. Isso é normal e o Dynatrace geralmente consegue lidar com isso.

### 3. Testar Traces

1. Faça algumas requisições à sua API
2. No Dynatrace, vá em **Observe and explore** → **Distributed traces**
3. Filtre por serviço: `credgestor-api`
4. Você deve ver os traces aparecendo

## 🎯 Endpoints do Dynatrace

O Dynatrace aceita dados OTLP nos seguintes endpoints:

### Traces
```
https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp/v1/traces
```

### Metrics
```
https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp/v1/metrics
```

### Logs
```
https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp/v1/logs
```

### Endpoint Unificado (Recomendado)
```
https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp
```

## 🔐 Autenticação

O Dynatrace usa o header `Api-Token` para autenticação:

```
Api-Token: dt0c01.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Formato do token:**
- Sempre começa com `dt0c01.` ou `dt0c02.`
- Seguido de uma string alfanumérica longa

## 📊 Atributos Importantes

O Dynatrace usa os seguintes atributos do OpenTelemetry:

### Resource Attributes
- `service.name` - Nome do serviço (obrigatório)
- `service.version` - Versão do serviço
- `deployment.environment` - Ambiente (production, staging, etc.)

### Span Attributes
- `http.method` - Método HTTP
- `http.status_code` - Status HTTP
- `http.url` - URL da requisição
- `db.system` - Sistema de banco de dados
- `db.operation` - Operação do banco

## 🐛 Troubleshooting

### Problema: Traces não aparecem no Dynatrace

**Soluções:**
1. Verifique se o `DYNATRACE_API_KEY` está configurado corretamente
2. Verifique se o Environment ID está correto na URL
3. Verifique os logs do collector: `docker logs otel-collector`
4. Teste a conectividade:
   ```bash
   curl -X POST https://{ENVIRONMENT_ID}.live.dynatrace.com/api/v2/otlp/v1/traces \
     -H "Api-Token: ${DYNATRACE_API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   ```

### Problema: Erro 401 Unauthorized

**Causa:** Token inválido ou sem permissões

**Solução:**
1. Verifique se o token tem as permissões corretas
2. Gere um novo token no Dynatrace
3. Verifique se o token não expirou

### Problema: Erro 404 Not Found

**Causa:** Environment ID incorreto ou endpoint errado

**Solução:**
1. Verifique o Environment ID na URL do Dynatrace
2. Use o endpoint unificado: `/api/v2/otlp`

### Problema: Métricas não aparecem

**Soluções:**
1. Verifique se `OTEL_METRICS_EXPORTER=otlp` está configurado
2. Verifique se o exporter de métricas está no pipeline
3. Aguarde alguns minutos (métricas podem demorar para aparecer)

### Problema: OneAgent não está coletando dados

**Soluções:**
1. Verifique se o serviço está rodando:
   ```bash
   sudo systemctl status dynatrace-oneagent
   ```
2. Verifique os logs:
   ```bash
   sudo journalctl -u dynatrace-oneagent -f
   ```
3. Verifique se o OneAgent está conectado ao Dynatrace:
   - No Dynatrace, vá em **Infrastructure** → **Hosts**
   - Procure pelo seu servidor
   - Status deve ser **Active**
4. Reinicie o OneAgent se necessário:
   ```bash
   sudo systemctl restart dynatrace-oneagent
   ```

### Problema: Dados duplicados (OneAgent + OpenTelemetry)

**Causa:** Ambos OneAgent e OpenTelemetry estão enviando dados do mesmo serviço

**Soluções:**
1. **Opção 1:** Desabilitar OneAgent para serviços específicos (via configuração do OneAgent)
2. **Opção 2:** Usar apenas OneAgent OU apenas OpenTelemetry (não ambos)
3. **Opção 3:** Configurar filtros no Dynatrace para evitar duplicação
4. **Opção 4:** Aceitar a duplicação (o Dynatrace geralmente consegue lidar com isso)

**💡 Recomendação:** Se você instalou o OneAgent e está funcionando bem, considere usar apenas ele. Adicione OpenTelemetry apenas se precisar de customização específica ou múltiplos backends.

## 📚 Recursos Adicionais

### Documentação Oficial

- [Dynatrace OpenTelemetry Documentation](https://www.dynatrace.com/support/help/extend-dynatrace/opentelemetry)
- [Dynatrace OTLP Endpoint](https://www.dynatrace.com/support/help/extend-dynatrace/opentelemetry/opentelemetry-ingestion/ingest-otlp-traces)
- [Dynatrace API Documentation](https://www.dynatrace.com/support/help/dynatrace-api) - Acesse via **Settings** → **Hub** → **Dynatrace API**
- [Custom Data Ingest via API](https://www.dynatrace.com/support/help/dynatrace-api/environment-api/events/post-event) - Para dados customizados

### Recursos Técnicos

- [OpenTelemetry Collector Dynatrace Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/dynatraceexporter)
- [Dynatrace Hub](https://www.dynatrace.com/hub/) - Extensões e integrações

### Acesso Rápido no Dynatrace

Para acessar rapidamente a documentação da API no Dynatrace:
1. Vá em **Settings** (menu lateral)
2. Use a busca e digite **"Dynatrace API"**
3. Clique no resultado para ver a documentação completa
4. Ou navegue: **Settings** → **Hub** → procure por **"Dynatrace API"**

## ✅ Checklist

### Se você instalou o OneAgent:

- [ ] OneAgent instalado e rodando
- [ ] Serviço `dynatrace-oneagent` ativo (`sudo systemctl status dynatrace-oneagent`)
- [ ] Host aparecendo no Dynatrace (Infrastructure → Hosts)
- [ ] Services aparecendo no Dynatrace (Services)
- [ ] Traces aparecendo automaticamente
- [ ] Smartscape mostrando arquitetura
- [ ] Decidido: usar apenas OneAgent OU adicionar OpenTelemetry

### Se você vai usar OpenTelemetry (com ou sem OneAgent):

- [ ] Conta Dynatrace criada
- [ ] Environment ID obtido
- [ ] API Token criado com permissões corretas
- [ ] `otel-collector-config.yaml` atualizado com exporter Dynatrace
- [ ] Variável `DYNATRACE_API_KEY` configurada no `.env`
- [ ] Docker Compose atualizado (se necessário)
- [ ] Collector reiniciado
- [ ] Traces aparecendo no Dynatrace
- [ ] Métricas aparecendo no Dynatrace
- [ ] Logs aparecendo no Dynatrace (se configurado)

### Se você vai usar ambos (OneAgent + OpenTelemetry):

- [ ] OneAgent funcionando (verificado acima)
- [ ] OpenTelemetry configurado (verificado acima)
- [ ] Filtros configurados no Dynatrace (se necessário, para evitar duplicação)
- [ ] Dados aparecendo corretamente (sem duplicação excessiva)

---

## 🎯 Resumo: OneAgent vs OpenTelemetry

### ✅ Use apenas OneAgent se:
- Você quer **zero configuração**
- Instrumentação automática é suficiente
- Você usa apenas Dynatrace

### ✅ Use apenas OpenTelemetry se:
- Você quer **padrão aberto**
- Você precisa de **customização avançada**
- Você quer **múltiplos backends** (Dynatrace + Jaeger + Prometheus)

### ✅ Use ambos se:
- Você quer **melhor dos dois mundos**
- Você tem necessidades específicas que requerem ambos

**💡 Recomendação Final:** Se você já instalou o OneAgent e está funcionando, **comece usando apenas ele**. Adicione OpenTelemetry apenas se precisar de funcionalidades específicas que o OneAgent não oferece.

---

**Após essas configurações, o Dynatrace estará recebendo dados! 🎉**
