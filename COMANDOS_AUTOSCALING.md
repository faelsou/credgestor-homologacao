# 📋 Comandos Úteis para Auto-Scaling

## 🔍 Verificar Serviços com Auto-Scaling

### Listar todos os serviços com auto-scaling configurado:
```bash
./scripts/listar-servicos-autoscaling.sh
```

### Verificar um serviço específico:
```bash
# Ver labels de autoscaling
docker service inspect credgestor_api --format '{{json .Spec.Labels}}' | python3 -m json.tool | grep autoscale

# Ver configuração completa
docker service inspect credgestor_api --format '{{range $k, $v := .Spec.Labels}}{{printf "%s=%s\n" $k $v}}{{end}}' | grep autoscale
```

### Verificar réplicas atuais:
```bash
docker service ps credgestor_api --no-trunc
docker service inspect credgestor_api --format '{{.Spec.Mode.Replicated.Replicas}}'
```

## 📊 Monitorar Auto-Scaling

### Ver logs do autoscaler:
```bash
# Logs em tempo real
docker service logs -f autoscaler_autoscaler

# Últimas 50 linhas
docker service logs --tail 50 autoscaler_autoscaler

# Filtrar apenas mensagens sobre um serviço específico
docker service logs autoscaler_autoscaler | grep credgestor_api
```

### Ver status do autoscaler:
```bash
docker service ps autoscaler_autoscaler
```

## 🧪 Testar Auto-Scaling

### Gerar carga para testar escalonamento:
```bash
# Usar Apache Bench (ab)
ab -n 10000 -c 100 https://credgestor.app.br/api/health

# Ou usar curl em loop
for i in {1..1000}; do curl -s https://credgestor.app.br/api/health > /dev/null & done
```

### Monitorar réplicas em tempo real durante o teste:
```bash
watch -n 2 'docker service ps credgestor_api --no-trunc'
```

### Ver métricas de CPU via Prometheus:
```bash
# Query para CPU do serviço
curl "http://localhost:9090/api/v1/query?query=container_cpu_usage_seconds_total{name=~'.*credgestor_api.*'}"
```

## ⚙️ Gerenciar Auto-Scaling

### Escalar manualmente (se necessário):
```bash
# Escalar para 3 réplicas
docker service scale credgestor_api=3

# Voltar para 1 réplica
docker service scale credgestor_api=1
```

### Atualizar configuração de auto-scaling:
1. Edite o `docker-compose.yml`
2. Ajuste os labels:
   ```yaml
   labels:
     - com.docker.swarm.autoscale.min=1
     - com.docker.swarm.autoscale.max=10  # Aumentar máximo
     - com.docker.swarm.autoscale.target=70  # Reduzir target
   ```
3. Faça redeploy:
   ```bash
   docker stack deploy -c docker-compose.yml credgestor
   ```

### Reiniciar o autoscaler:
```bash
docker service update --force autoscaler_autoscaler
```

## 🐛 Troubleshooting

### Verificar se o autoscaler está detectando o serviço:
```bash
docker service logs autoscaler_autoscaler | grep "detectado"
```

### Verificar conexão com Prometheus:
```bash
# Do container do autoscaler
docker exec $(docker ps -q -f name=autoscaler) curl -s http://prometheus_prometheus:9090/api/v1/query?query=up
```

### Verificar se métricas de CPU estão disponíveis:
```bash
curl "http://localhost:9090/api/v1/query?query=container_cpu_usage_seconds_total" | python3 -m json.tool
```

## 📝 Exemplos de Uso

### Verificar status completo:
```bash
echo "=== Serviços com Auto-Scaling ==="
./scripts/listar-servicos-autoscaling.sh

echo ""
echo "=== Status do Autoscaler ==="
docker service ps autoscaler_autoscaler

echo ""
echo "=== Últimas ações do Autoscaler ==="
docker service logs --tail 10 autoscaler_autoscaler
```

### Monitorar durante carga:
```bash
# Terminal 1: Gerar carga
ab -n 50000 -c 200 https://credgestor.app.br/api/health

# Terminal 2: Monitorar réplicas
watch -n 1 'echo "Réplicas: $(docker service inspect credgestor_api --format "{{.Spec.Mode.Replicated.Replicas}}")" && docker service ps credgestor_api --no-trunc | head -10'

# Terminal 3: Ver logs do autoscaler
docker service logs -f autoscaler_autoscaler
```
