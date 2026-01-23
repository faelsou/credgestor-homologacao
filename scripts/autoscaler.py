#!/usr/bin/env python3
"""
Docker Swarm Autoscaler
Monitora métricas de CPU via Prometheus e ajusta réplicas automaticamente
"""

import os
import time
import json
import logging
import requests
import docker
from typing import Dict, Optional

# Configuração de logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Variáveis de ambiente
PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090')
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '30'))
COOLDOWN_PERIOD = int(os.getenv('COOLDOWN_PERIOD', '60'))
METRIC_NAME = os.getenv('METRIC_NAME', 'container_cpu_usage_seconds_total')

# Cliente Docker
docker_client = docker.from_env()

# Cache de última ação por serviço
last_action: Dict[str, float] = {}


def get_service_labels(service_name: str) -> Optional[Dict[str, str]]:
    """Obtém labels de auto-scaling de um serviço"""
    try:
        service = docker_client.services.get(service_name)
        labels = service.attrs.get('Spec', {}).get('Labels', {})
        
        min_replicas = labels.get('com.docker.swarm.autoscale.min')
        max_replicas = labels.get('com.docker.swarm.autoscale.max')
        target_cpu = labels.get('com.docker.swarm.autoscale.target')
        
        # Debug: log se encontrar algum label mas não todos
        if min_replicas or max_replicas or target_cpu:
            logger.debug(f"Serviço {service_name} - Labels encontrados: min={min_replicas}, max={max_replicas}, target={target_cpu}")
        
        if min_replicas and max_replicas and target_cpu:
            return {
                'min': int(min_replicas),
                'max': int(max_replicas),
                'target': int(target_cpu)
            }
    except docker.errors.NotFound:
        logger.warning(f"Serviço {service_name} não encontrado")
    except Exception as e:
        logger.error(f"Erro ao obter labels do serviço {service_name}: {e}")
    
    return None


def get_cpu_usage(service_name: str) -> Optional[float]:
    """Obtém uso de CPU de um serviço via Prometheus"""
    try:
        # Query Prometheus para CPU média do serviço
        query = f'avg(rate({METRIC_NAME}{{name=~".*{service_name}.*"}}[1m])) * 100'
        
        response = requests.get(
            f'{PROMETHEUS_URL}/api/v1/query',
            params={'query': query},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('data', {}).get('result'):
                value = float(data['data']['result'][0]['value'][1])
                return value
        
        # Fallback: usar métrica alternativa
        query_alt = f'container_cpu_usage_seconds_total{{name=~".*{service_name}.*"}}'
        response = requests.get(
            f'{PROMETHEUS_URL}/api/v1/query',
            params={'query': query_alt},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('data', {}).get('result'):
                # Calcular média se houver múltiplos containers
                values = [float(r['value'][1]) for r in data['data']['result']]
                if values:
                    return sum(values) / len(values) * 100
        
    except Exception as e:
        logger.warning(f"Erro ao obter CPU do serviço {service_name}: {e}")
    
    return None


def get_current_replicas(service_name: str) -> int:
    """Obtém número atual de réplicas de um serviço"""
    try:
        service = docker_client.services.get(service_name)
        return service.attrs.get('Spec', {}).get('Mode', {}).get('Replicated', {}).get('Replicas', 1)
    except Exception as e:
        logger.error(f"Erro ao obter réplicas do serviço {service_name}: {e}")
        return 1


def scale_service(service_name: str, replicas: int):
    """Escala um serviço para o número de réplicas especificado"""
    try:
        service = docker_client.services.get(service_name)
        service.update(replicas=replicas)
        logger.info(f"Serviço {service_name} escalado para {replicas} réplicas")
        return True
    except Exception as e:
        logger.error(f"Erro ao escalar serviço {service_name}: {e}")
        return False


def should_scale(service_name: str) -> bool:
    """Verifica se pode escalar (cooldown)"""
    if service_name not in last_action:
        return True
    
    elapsed = time.time() - last_action[service_name]
    return elapsed >= COOLDOWN_PERIOD


def process_service(service_name: str):
    """Processa um serviço para auto-scaling"""
    # Obter configuração de auto-scaling
    config = get_service_labels(service_name)
    if not config:
        return
    
    # Verificar cooldown
    if not should_scale(service_name):
        return
    
    # Obter métricas atuais
    cpu_usage = get_cpu_usage(service_name)
    if cpu_usage is None:
        logger.warning(f"Não foi possível obter CPU do serviço {service_name}")
        return
    
    current_replicas = get_current_replicas(service_name)
    target_cpu = config['target']
    min_replicas = config['min']
    max_replicas = config['max']
    
    logger.info(
        f"Serviço {service_name}: CPU={cpu_usage:.2f}%, "
        f"Target={target_cpu}%, Réplicas={current_replicas}, "
        f"Min={min_replicas}, Max={max_replicas}"
    )
    
    # Calcular réplicas desejadas baseado na CPU
    if cpu_usage > target_cpu:
        # CPU acima do target, precisa escalar para cima
        desired_replicas = min(
            max_replicas,
            max(min_replicas, int(current_replicas * (cpu_usage / target_cpu)))
        )
    elif cpu_usage < target_cpu * 0.7:  # 70% do target para evitar oscilação
        # CPU abaixo do target, pode escalar para baixo
        desired_replicas = max(
            min_replicas,
            int(current_replicas * (cpu_usage / target_cpu))
        )
    else:
        # CPU dentro do range aceitável
        return
    
    # Escalar se necessário
    if desired_replicas != current_replicas:
        if scale_service(service_name, desired_replicas):
            last_action[service_name] = time.time()


def main():
    """Loop principal do autoscaler"""
    logger.info("Iniciando Docker Swarm Autoscaler")
    logger.info(f"Prometheus URL: {PROMETHEUS_URL}")
    logger.info(f"Check Interval: {CHECK_INTERVAL}s")
    logger.info(f"Cooldown Period: {COOLDOWN_PERIOD}s")
    
    while True:
        try:
            # Listar todos os serviços
            services = docker_client.services.list()
            logger.debug(f"Encontrados {len(services)} serviços no cluster")
            
            services_with_autoscale = []
            for service in services:
                service_name = service.name
                config = get_service_labels(service_name)
                if config:
                    services_with_autoscale.append(service_name)
                    logger.info(f"Serviço com auto-scaling detectado: {service_name} (min={config['min']}, max={config['max']}, target={config['target']}%)")
                    process_service(service_name)
            
            if not services_with_autoscale:
                logger.warning("Nenhum serviço com labels de auto-scaling encontrado. Verifique se os labels estão configurados corretamente.")
            
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Interrompendo autoscaler...")
            break
        except Exception as e:
            logger.error(f"Erro no loop principal: {e}", exc_info=True)
            time.sleep(CHECK_INTERVAL)


if __name__ == '__main__':
    main()
