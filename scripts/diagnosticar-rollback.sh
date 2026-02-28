#!/bin/bash
# Script para diagnosticar rollback do Docker Swarm

echo "🔍 DIAGNÓSTICO DE ROLLBACK DO DOCKER SWARM"
echo "=========================================="
echo ""

# 1. Verificar status dos serviços
echo "📊 1. Status dos Serviços:"
echo "---------------------------"
docker service ls
echo ""

# 2. Ver detalhes dos serviços com problemas
echo "📋 2. Detalhes dos Serviços (últimas 5 tarefas):"
echo "------------------------------------------------"
for service in $(docker service ls --format "{{.Name}}" | grep credgestor); do
    echo ""
    echo "🔹 Serviço: $service"
    docker service ps $service --no-trunc --format "table {{.Name}}\t{{.CurrentState}}\t{{.Error}}\t{{.DesiredState}}" | head -6
done
echo ""

# 3. Ver logs de erro dos serviços
echo "📝 3. Logs de Erro (últimas 50 linhas):"
echo "----------------------------------------"
for service in $(docker service ls --format "{{.Name}}" | grep credgestor); do
    echo ""
    echo "🔹 Logs do serviço: $service"
    echo "---"
    docker service logs $service --tail 50 2>&1 | grep -i "error\|exception\|traceback\|failed\|fatal" || echo "Nenhum erro encontrado nos logs recentes"
done
echo ""

# 4. Verificar imagens disponíveis
echo "🖼️  4. Imagens Docker Disponíveis:"
echo "-----------------------------------"
docker images | grep -E "credgestor|faelsouz" | head -10
echo ""

# 5. Verificar recursos do sistema
echo "💻 5. Recursos do Sistema:"
echo "-------------------------"
echo "Memória:"
free -h
echo ""
echo "Disco:"
df -h / | tail -1
echo ""

# 6. Verificar containers em execução
echo "🐳 6. Containers em Execução:"
echo "-----------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | head -10
echo ""

# 7. Verificar health checks
echo "🏥 7. Health Checks:"
echo "-------------------"
for service in $(docker service ls --format "{{.Name}}" | grep credgestor); do
    echo ""
    echo "🔹 Health check do serviço: $service"
    docker service inspect $service --format '{{range .Spec.TaskTemplate.ContainerSpec.Healthcheck}}{{.Test}}{{end}}' 2>/dev/null || echo "Health check não configurado"
done
echo ""

# 8. Verificar rede
echo "🌐 8. Rede Docker:"
echo "----------------"
docker network ls | grep -E "network_public|overlay"
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Verifique os logs de erro acima"
echo "   2. Se necessário, veja logs completos: docker service logs <servico> --tail 200"
echo "   3. Para reiniciar um serviço: docker service update --force <servico>"
echo "   4. Para fazer rollback: docker service rollback <servico>"
