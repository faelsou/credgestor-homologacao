#!/bin/bash

# Script para atualizar configuração do Prometheus para coletar métricas do CredGestor

PROMETHEUS_CONFIG="/var/www/findfruit/observability/prometheus/prometheus.yml"
BACKUP_FILE="${PROMETHEUS_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Criar backup
sudo cp "$PROMETHEUS_CONFIG" "$BACKUP_FILE"
echo "✅ Backup criado: $BACKUP_FILE"

# Usar Python para fazer a substituição correta
sudo python3 << 'PYTHON'
import re

config_file = '/var/www/findfruit/observability/prometheus/prometheus.yml'

# Ler o arquivo
with open(config_file, 'r') as f:
    content = f.read()

# Novo job com formatação correta
new_job = """  - job_name: 'credgestor-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    scheme: https
    tls_config:
      insecure_skip_verify: true
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['credgestor.app.br:443']
        labels:
          service: 'credgestor-api'
          environment: 'production'
"""

# Encontrar e substituir o job credgestor-api
# Procurar desde o comentário até o final do job
pattern = r'  # ===== CREDGESTOR / API FastAPI =====.*?- job_name: \'credgestor-api\'.*?environment: \'production\'\n'
replacement = f'  # ===== CREDGESTOR / API FastAPI =====\n{new_job}'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Salvar
with open(config_file, 'w') as f:
    f.write(content)

print("✅ Configuração atualizada")
PYTHON

# Validar YAML
if python3 -c "import yaml; yaml.safe_load(open('$PROMETHEUS_CONFIG'))" 2>/dev/null; then
    echo "✅ YAML válido"
    echo ""
    echo "Recarregando Prometheus..."
    docker service update --force observability_prometheus
    echo ""
    echo "✅ Pronto! Aguarde alguns segundos e verifique em: http://localhost:9090/targets"
else
    echo "❌ Erro no YAML. Restaurando backup..."
    sudo cp "$BACKUP_FILE" "$PROMETHEUS_CONFIG"
    echo "Backup restaurado"
    exit 1
fi
