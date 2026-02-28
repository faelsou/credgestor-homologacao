#!/bin/bash
# Script para corrigir o modelo LLM do agente

set -e

echo "🔧 Corrigindo modelo LLM do agente..."
echo ""

# Verificar se o serviço existe
if ! docker service ls | grep -q "agent_agent"; then
    echo "❌ Serviço agent_agent não encontrado!"
    exit 1
fi

echo "📋 Status atual do serviço:"
docker service ps agent_agent --no-trunc --format "table {{.Name}}\t{{.CurrentState}}\t{{.Error}}" | head -5
echo ""

# Atualizar variável de ambiente
echo "🔄 Atualizando variável LLM_MODEL para claude-3-5-sonnet..."
docker service update \
  --env-rm LLM_MODEL \
  --env-add LLM_MODEL=claude-3-5-sonnet \
  agent_agent

echo ""
echo "⏳ Aguardando atualização do serviço..."
sleep 10

echo ""
echo "📋 Novo status do serviço:"
docker service ps agent_agent --no-trunc --format "table {{.Name}}\t{{.CurrentState}}\t{{.Error}}" | head -5

echo ""
echo "📝 Últimos logs (aguarde alguns segundos para ver se o erro foi corrigido):"
docker service logs agent_agent --tail 30 | grep -E "LLM|modelo|Modelo|Error|Erro" | tail -10 || echo "Nenhum erro relacionado a LLM encontrado nos logs recentes"

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "💡 Para ver logs em tempo real:"
echo "   docker service logs agent_agent -f"
