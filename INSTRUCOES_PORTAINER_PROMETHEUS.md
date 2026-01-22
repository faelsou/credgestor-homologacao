# 📋 Instruções: Configurar Prometheus no Portainer

## 🎯 Passo a Passo

### 1. Criar o Docker Config para prometheus.yml

No Portainer:

1. Vá em **Configs** (no menu lateral)
2. Clique em **Add config**
3. Configure:
   - **Name**: `prometheus_config`
   - **Configuration**: Cole o conteúdo do arquivo `prometheus.yml` (ou `prometheus-simples.yml`)
4. Clique em **Create the config**

### 2. Criar/Editar o Stack do Prometheus

No Portainer:

1. Vá em **Stacks**
2. Se já existe um stack do Prometheus:
   - Clique no stack
   - Clique em **Editor** (se disponível)
   - OU clique em **Duplicate/Edit**
3. Se não existe, clique em **Add stack**

### 3. Cole o Docker Compose

Cole o conteúdo do arquivo `docker-compose-prometheus-portainer.yml` no editor.

**OU** se preferir usar volumes ao invés de configs, use esta versão:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      # Montar o arquivo de configuração
      - /var/www/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      # Volume para persistência de dados
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - prometheus_net

volumes:
  prometheus_data:
    driver: local

networks:
  prometheus_net:
    driver: bridge
```

### 4. Se usar Volumes (alternativa mais simples)

Se escolher usar volumes ao invés de configs:

1. **Crie o diretório na VPS**:
   ```bash
   sudo mkdir -p /var/www/prometheus
   ```

2. **Crie o arquivo prometheus.yml**:
   ```bash
   sudo nano /var/www/prometheus/prometheus.yml
   ```
   
3. **Cole o conteúdo** do arquivo `prometheus.yml` ou `prometheus-simples.yml`

4. **Ajuste as permissões**:
   ```bash
   sudo chmod 644 /var/www/prometheus/prometheus.yml
   sudo chown root:root /var/www/prometheus/prometheus.yml
   ```

### 5. Deploy do Stack

1. No Portainer, após colar o docker-compose.yml
2. Clique em **Deploy the stack**
3. Aguarde o container iniciar

### 6. Verificar

1. Acesse o Prometheus: `http://seu-ip:9090`
2. Vá em **Status** → **Targets**
3. Verifique se `credgestor-api` está **UP**

## 🔧 Editar Configuração

### Se usou Docker Config:

1. Vá em **Configs**
2. Encontre `prometheus_config`
3. Clique em **Update**
4. Edite o conteúdo
5. Reinicie o container do Prometheus

### Se usou Volume:

1. Edite o arquivo: `sudo nano /var/www/prometheus/prometheus.yml`
2. Recarregue o Prometheus:
   ```bash
   docker exec prometheus kill -HUP 1
   ```
   OU reinicie o container no Portainer

## 📝 Conteúdo do prometheus.yml

Use o conteúdo do arquivo `prometheus.yml` ou `prometheus-simples.yml` que foi criado.
