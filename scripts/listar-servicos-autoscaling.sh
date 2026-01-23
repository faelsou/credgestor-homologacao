#!/bin/bash
# Script para listar todos os serviços Docker Swarm com auto-scaling configurado

echo "🔍 Procurando serviços com auto-scaling configurado..."
echo ""

# Listar todos os serviços
services=$(docker service ls --format "{{.Name}}")

found=0

for service_name in $services; do
    # Verificar se o serviço tem labels de auto-scaling
    min=$(docker service inspect "$service_name" --format '{{index .Spec.Labels "com.docker.swarm.autoscale.min"}}' 2>/dev/null)
    max=$(docker service inspect "$service_name" --format '{{index .Spec.Labels "com.docker.swarm.autoscale.max"}}' 2>/dev/null)
    target=$(docker service inspect "$service_name" --format '{{index .Spec.Labels "com.docker.swarm.autoscale.target"}}' 2>/dev/null)
    
    if [ -n "$min" ] && [ -n "$max" ] && [ -n "$target" ]; then
        # Obter número atual de réplicas
        replicas=$(docker service inspect "$service_name" --format '{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null)
        
        echo "✅ Serviço: $service_name"
        echo "   📊 Réplicas atuais: $replicas"
        echo "   📈 Configuração:"
        echo "      - Mínimo: $min réplicas"
        echo "      - Máximo: $max réplicas"
        echo "      - Target CPU: $target%"
        echo ""
        found=$((found + 1))
    fi
done

if [ $found -eq 0 ]; then
    echo "❌ Nenhum serviço com auto-scaling configurado encontrado."
    echo ""
    echo "💡 Para adicionar auto-scaling a um serviço, adicione os seguintes labels no docker-compose.yml:"
    echo "   - com.docker.swarm.autoscale.min=1"
    echo "   - com.docker.swarm.autoscale.max=5"
    echo "   - com.docker.swarm.autoscale.target=80"
else
    echo "📋 Total: $found serviço(s) com auto-scaling configurado"
fi
