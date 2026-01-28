# 🚀 Configurar Aplicação CredGestor no Dynatrace

Este guia explica como configurar sua aplicação **CredGestor** (Backend FastAPI + Frontend React) no Dynatrace para monitoramento completo.

## 📋 Estrutura da Aplicação

Sua aplicação CredGestor possui:

- **Backend**: FastAPI rodando na porta `8000`
  - Serviço: `credgestor-api`
  - URL: `https://credgestor.app.br/api`
  - Framework: Python/FastAPI

- **Frontend**: React + Vite rodando na porta `80` (Nginx)
  - Serviço: `credgestor-frontend`
  - URL: `https://credgestor.app.br`
  - Framework: Node.js/React

- **Infraestrutura**: Docker Swarm com Traefik como reverse proxy

## 🎯 Opções de Configuração

### Opção 1: OneAgent (Já Instalado) - Recomendado

Se você já instalou o OneAgent, ele deve detectar automaticamente sua aplicação. Siga os passos abaixo para garantir que está configurado corretamente.

### Opção 2: OpenTelemetry

Se preferir usar OpenTelemetry, consulte o guia `CONFIGURAR_DYNATRACE_OPENTELEMETRY.md`.

---

## 🔧 Configuração com OneAgent

### 1. Verificar Detecção Automática

O OneAgent deve detectar automaticamente:

1. **Acesse o Dynatrace**
2. Vá em **Services** (menu lateral)
3. Procure por:
   - `Python` ou `FastAPI` (backend)
   - `Nginx` ou `Node.js` (frontend)
   - `credgestor-api` (se configurado)

**Se você vê seus serviços, pule para a seção "Configurar Nomes e Tags"**

### 2. Se os Serviços Não Aparecerem

#### 2.1 Verificar OneAgent no Host

O OneAgent pode estar rodando de duas formas:

**Opção A: Como serviço systemd**
```bash
# Verificar se o OneAgent está rodando como serviço
sudo systemctl status dynatrace-oneagent

# Ver logs
sudo journalctl -u dynatrace-oneagent -f
```

**Opção B: Como processos do usuário (mais comum)**
```bash
# Verificar processos do OneAgent
ps aux | grep -i "oneagent\|dynatrace" | grep -v grep

# Você deve ver processos como:
# - oneagentwatchdog
# - oneagentos
# - oneagentnetwork
# - oneagentloganalytics
# - oneagentextensions

# Verificar se o OneAgent está instalado
ls -la /opt/dynatrace/oneagent

# Verificar processos da aplicação detectados
ps aux | grep -E "python|uvicorn|node|nginx"
```

**💡 Nota:** Se você vê processos do OneAgent rodando (mesmo que não seja como serviço systemd), o OneAgent está funcionando! O importante é que os processos estejam ativos.

#### 2.2 Verificar Host no Dynatrace

1. No Dynatrace, vá em **Infrastructure** → **Hosts**
2. Procure pelo seu servidor
3. Clique no host
4. Vá na aba **Processes**
5. Você deve ver processos como:
   - `python` (backend FastAPI)
   - `nginx` (frontend)
   - `uvicorn` (servidor ASGI)

**Se os processos aparecem mas não viram serviços, continue para a próxima seção.**

### 3. Configurar Detecção de Serviços

#### 3.1 Backend (FastAPI)

O OneAgent deve detectar automaticamente o FastAPI, mas você pode configurar:

1. No Dynatrace, vá em **Settings** → **Process and containers** → **Service detection**
2. Procure por regras de detecção para `Python`
3. Ou crie uma regra customizada:

**Criar Regra Customizada:**

1. Vá em **Settings** → **Process and containers** → **Service detection** → **Add detection rule**
2. Configure:
   - **Technology**: `Python`
   - **Process name**: `python` ou `uvicorn`
   - **Command line**: Contém `uvicorn` ou `backend.main:app`
   - **Service name**: `credgestor-api`
   - **Service technology**: `FastAPI`

#### 3.2 Frontend (React/Nginx)

Para o frontend, o OneAgent geralmente detecta o Nginx:

1. Vá em **Settings** → **Process and containers** → **Service detection**
2. Procure por regras de detecção para `Nginx`
3. Configure o nome do serviço como `credgestor-frontend`

### 4. Configurar Nomes de Serviços

Para garantir que os serviços apareçam com os nomes corretos:

#### 4.1 Via Configuração do OneAgent

Crie ou edite o arquivo de configuração do OneAgent:

```bash
# No servidor onde o OneAgent está instalado
sudo nano /opt/dynatrace/oneagent/agent/conf/custom.properties
```

Adicione:

```properties
# Backend - FastAPI
[com.dynatrace.oneagent.sdk.service.name]
python.uvicorn=credgestor-api

# Frontend - Nginx
[com.dynatrace.oneagent.sdk.service.name]
nginx=credgestor-frontend
```

Reinicie o OneAgent:

**Se for serviço systemd:**
```bash
sudo systemctl restart dynatrace-oneagent
```

**Se for processos do usuário:**
```bash
# O watchdog do OneAgent deve reiniciar automaticamente
# Ou reinicie o host para garantir que tudo reinicie
sudo reboot
```

#### 4.2 Via Variáveis de Ambiente (Docker)

Se sua aplicação roda em containers Docker, adicione variáveis de ambiente:

**No `docker-compose.yml`, adicione ao serviço `api`:**

```yaml
api:
  environment:
    # ... outras variáveis ...
    
    # Dynatrace OneAgent - Nome do Serviço
    DT_SERVICE_NAME: credgestor-api
    DT_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-0.1.0}
    DT_TAGS: environment=homologacao,service=backend
```

**Adicione ao serviço `site` (frontend):**

```yaml
site:
  environment:
    # ... outras variáveis ...
    
    # Dynatrace OneAgent - Nome do Serviço
    DT_SERVICE_NAME: credgestor-frontend
    DT_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-0.1.0}
    DT_TAGS: environment=homologacao,service=frontend
```

### 5. Configurar Tags e Metadados

Tags ajudam a organizar e filtrar serviços no Dynatrace:

#### 5.1 Tags no OneAgent

**Via variáveis de ambiente (recomendado para Docker):**

```yaml
# Backend
api:
  environment:
    DT_TAGS: environment=homologacao,service=backend,team=dev,application=credgestor

# Frontend
site:
  environment:
    DT_TAGS: environment=homologacao,service=frontend,team=dev,application=credgestor
```

**Via arquivo de configuração:**

```properties
# /opt/dynatrace/oneagent/agent/conf/custom.properties
[com.dynatrace.oneagent.sdk.tags]
environment=homologacao
service=backend
team=dev
application=credgestor
```

#### 5.2 Metadados Customizados

Adicione metadados para enriquecer os dados:

```yaml
# Backend
api:
  environment:
    DT_CUSTOM_PROP: "tenant_id=default,region=us-east-1,deployment=homologacao"
```

### 6. Configurar Process Groups

Process Groups agrupam processos relacionados:

1. No Dynatrace, vá em **Infrastructure** → **Processes**
2. Selecione os processos relacionados ao CredGestor
3. Clique em **Manage tags** ou **Create process group**
4. Configure:
   - **Name**: `CredGestor Application`
   - **Tags**: `application=credgestor,environment=homologacao`

### 7. Configurar Request Attributes

Request Attributes ajudam a filtrar e analisar requisições:

1. No Dynatrace, vá em **Settings** → **Server-side service monitoring** → **Request attributes**
2. Clique em **Add request attribute**
3. Configure atributos úteis:

**Exemplo: Tenant ID (se aplicável)**

- **Name**: `tenant_id`
- **Data type**: `Text`
- **Source**: `Request header` ou `Request parameter`
- **Key**: `X-Tenant-ID` ou `tenant_id`

**Exemplo: User ID**

- **Name**: `user_id`
- **Data type**: `Text`
- **Source**: `Request header`
- **Key**: `X-User-ID`

### 8. Configurar Service-Level Objectives (SLOs)

Defina SLOs para monitorar a saúde da aplicação:

1. No Dynatrace, vá em **Service** → Selecione `credgestor-api`
2. Clique em **Service settings** → **SLO**
3. Configure:
   - **Availability**: 99.9%
   - **Performance**: P95 < 500ms
   - **Error rate**: < 0.1%

### 9. Configurar Alertas

Configure alertas para problemas críticos:

1. No Dynatrace, vá em **Settings** → **Anomaly detection** → **Service**
2. Configure alertas para:
   - **High error rate**
   - **Slow response time**
   - **Service unavailable**

## ✅ Status Atual da Sua Instalação

> 💡 **Dica Rápida:** Execute o script de verificação para ver o status completo:
> ```bash
> ./verificar-dynatrace.sh
> ```

Com base na verificação do seu sistema:

### ✅ OneAgent está instalado e rodando
- **Localização**: `/opt/dynatrace/oneagent`
- **Processos ativos**: 
  - `oneagentwatchdog` (processo principal)
  - `oneagentos` (monitoramento do sistema operacional)
  - `oneagentnetwork` (monitoramento de rede)
  - `oneagentloganalytics` (análise de logs)
  - `oneagentextensions` (extensões)
- **Modo**: Rodando como processos do usuário `dtuser` (não como serviço systemd)

### ✅ Aplicação está rodando
- **Backend (uvicorn)**: Processo detectado rodando na porta 8000
- **Frontend (nginx)**: Múltiplos processos nginx detectados

### ⚠️ Próximo passo
Verifique no Dynatrace se os serviços estão sendo detectados. Se não estiverem, siga as instruções abaixo para configurar nomes de serviços.

## 🔍 Verificação

### 1. Verificar Serviços

1. No Dynatrace, vá em **Services**
2. Você deve ver:
   - ✅ `credgestor-api` (Backend)
   - ✅ `credgestor-frontend` (Frontend)

### 2. Verificar Traces

1. Faça algumas requisições à sua API:
   ```bash
   curl https://credgestor.app.br/api/health
   ```

2. No Dynatrace, vá em **Distributed traces**
3. Filtre por serviço: `credgestor-api`
4. Você deve ver os traces aparecendo

### 3. Verificar Métricas

1. No Dynatrace, vá em **Services** → `credgestor-api`
2. Você deve ver:
   - ✅ **Response time**
   - ✅ **Throughput** (requisições/segundo)
   - ✅ **Error rate**
   - ✅ **Database queries** (se aplicável)

### 4. Verificar Smartscape

1. No Dynatrace, vá em **Smartscape**
2. Você deve ver:
   - ✅ Host com seus processos
   - ✅ Serviços `credgestor-api` e `credgestor-frontend`
   - ✅ Dependências entre serviços

## 📊 Dashboards Recomendados

Crie ou importe dashboards para monitorar sua aplicação:

### Dashboard Básico

1. No Dynatrace, vá em **Dashboards** → **Create dashboard**
2. Adicione widgets:
   - **Service response time** (credgestor-api)
   - **Service throughput** (credgestor-api)
   - **Error rate** (credgestor-api)
   - **Frontend page load time** (credgestor-frontend)

### Dashboard Avançado

Inclua:
- **Database performance** (se usar banco de dados)
- **External service calls** (Supabase, APIs externas)
- **User sessions** (frontend)
- **Custom metrics** (se configurado)

## 🐛 Troubleshooting

### Problema: Serviços não aparecem

**Soluções:**
1. Verifique se o OneAgent está rodando:
   ```bash
   # Se for serviço systemd
   sudo systemctl status dynatrace-oneagent
   
   # Ou verifique processos
   ps aux | grep -i "oneagent\|dynatrace" | grep -v grep
   ```
2. Verifique processos da aplicação no host: `ps aux | grep -E "python|uvicorn|nginx"`
3. Verifique se o OneAgent está instalado: `ls -la /opt/dynatrace/oneagent`
4. Aguarde alguns minutos (detecção pode demorar)
5. Se o OneAgent estiver rodando como processos (não serviço), reinicie o host ou reinicie os processos:
   ```bash
   # Reiniciar processos do OneAgent (se necessário)
   sudo killall oneagentos oneagentwatchdog
   # O watchdog deve reiniciar automaticamente
   ```

### Problema: Nome do serviço está errado

**Soluções:**
1. Configure `DT_SERVICE_NAME` nas variáveis de ambiente
2. Ou edite o arquivo de configuração do OneAgent
3. Reinicie o serviço/container

### Problema: Traces não aparecem

**Soluções:**
1. Faça requisições à aplicação
2. Verifique se o serviço está ativo no Dynatrace
3. Verifique filtros de tempo (pode estar olhando para o passado)
4. Verifique se há erros nos logs do OneAgent

### Problema: Frontend não aparece

**Soluções:**
1. O Nginx pode aparecer como serviço separado
2. Configure `DT_SERVICE_NAME=credgestor-frontend` no container do frontend
3. Ou configure via regras de detecção de serviço

## 📝 Exemplo Completo: docker-compose.yml

Aqui está um exemplo de como adicionar configurações do Dynatrace ao seu `docker-compose.yml`:

```yaml
services:
  # Backend FastAPI
  api:
    image: faelsouz/credgestor-homologacao-backend:${DOCKER_VERSION:-latest}
    environment:
      # ... outras variáveis existentes ...
      
      # Dynatrace OneAgent Configuration
      DT_SERVICE_NAME: credgestor-api
      DT_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-0.1.0}
      DT_TAGS: environment=homologacao,service=backend,team=dev,application=credgestor
      DT_CUSTOM_PROP: "deployment=docker-swarm,region=homologacao"
    
    # ... resto da configuração ...

  # Frontend React
  site:
    image: faelsouz/credgestor-homologacao-frontend:${DOCKER_VERSION:-latest}
    environment:
      # ... outras variáveis existentes ...
      
      # Dynatrace OneAgent Configuration
      DT_SERVICE_NAME: credgestor-frontend
      DT_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-0.1.0}
      DT_TAGS: environment=homologacao,service=frontend,team=dev,application=credgestor
    
    # ... resto da configuração ...
```

## ✅ Checklist

- [ ] OneAgent instalado e rodando
- [ ] Host aparecendo no Dynatrace (Infrastructure → Hosts)
- [ ] Processos detectados (Python, Nginx)
- [ ] Serviços aparecendo (credgestor-api, credgestor-frontend)
- [ ] Nomes de serviços configurados corretamente
- [ ] Tags configuradas (environment, service, team)
- [ ] Traces aparecendo ao fazer requisições
- [ ] Métricas sendo coletadas (response time, throughput, error rate)
- [ ] Smartscape mostrando arquitetura
- [ ] Alertas configurados (opcional)
- [ ] Dashboard criado (opcional)

## 🎯 Próximos Passos

Após configurar a aplicação:

1. **Monitorar métricas** regularmente
2. **Configurar alertas** para problemas críticos
3. **Analisar traces** para otimizar performance
4. **Usar Smartscape** para entender dependências
5. **Criar dashboards** personalizados para sua equipe
   - 📊 Consulte o guia: **[CRIAR_DASHBOARD_DYNATRACE.md](./CRIAR_DASHBOARD_DYNATRACE.md)**

---

**Sua aplicação CredGestor está configurada no Dynatrace! 🎉**

Para mais informações sobre OpenTelemetry, consulte `CONFIGURAR_DYNATRACE_OPENTELEMETRY.md`.
