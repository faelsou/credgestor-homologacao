#!/bin/bash
# Script para configurar variáveis de ambiente do WhatsApp - Evolution API

# IMPORTANTE: Substitua "SUA_INSTANCIA" pelo nome da sua instância na Evolution API
# Você pode encontrar o nome da instância no painel da Evolution API

export WHATSAPP_API_INSTANCE="SUA_INSTANCIA"  # <-- ALTERE AQUI
export AUTHENTICATION_API_KEY="CN4AnbOtY79Wv6wNyx88cdoKXqugcINi"
export WHATSAPP_TOKEN="F9B1087501F5-4FB3-96A0-4B1015E146C2"

# OU use URL completa:
# export WHATSAPP_API_URL="https://api.evolutionapi.com/v1/message/sendText/CredGestor"

echo "✅ Variáveis de ambiente configuradas!"
echo ""
echo "Para usar, execute:"
echo "   source scripts/configurar_whatsapp.sh"
echo "   .venv/bin/python3 scripts/ai_agent_vencimentos_diarios.py"
echo ""
echo "⚠️  IMPORTANTE: Altere 'SUA_INSTANCIA' pelo nome real da sua instância!"
