#!/bin/bash
# Script para consultar dados de um usuário específico por email
# Uso: ./consultar_usuario_por_email.sh email@exemplo.com

if [ -z "$1" ]; then
    echo "❌ Erro: Email não informado"
    echo "Uso: $0 email@exemplo.com"
    exit 1
fi

EMAIL="$1"

echo "============================================================================"
echo "🔍 CONSULTANDO DADOS DO USUÁRIO: $EMAIL"
echo "============================================================================"
echo ""

# Verifica se está conectado ao Supabase ou PostgreSQL
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  Variáveis de ambiente DATABASE_URL ou SUPABASE_DB_URL não configuradas"
    echo "   Configure uma delas para usar este script"
    exit 1
fi

DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

echo "📋 Consultando em auth.users..."
psql "$DB_URL" -c "
SELECT 
    'AUTH.USERS' as tabela,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmado,
    created_at,
    raw_user_meta_data->>'name' as nome_metadata,
    raw_user_meta_data->>'tenant_id' as tenant_id_metadata,
    raw_app_meta_data->>'role' as role_metadata
FROM auth.users
WHERE email = '$EMAIL';
"

echo ""
echo "📋 Consultando em public.users..."
psql "$DB_URL" -c "
SELECT 
    'PUBLIC.USERS' as tabela,
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE email = '$EMAIL';
"

echo ""
echo "📋 Consultando em public.tenant_users..."
psql "$DB_URL" -c "
SELECT 
    'PUBLIC.TENANT_USERS' as tabela,
    tu.id,
    tu.tenant_id,
    tu.user_id,
    tu.email,
    tu.role,
    tu.ativo,
    t.name as tenant_nome,
    tu.created_at
FROM public.tenant_users tu
LEFT JOIN public.tenants t ON t.id = tu.tenant_id
WHERE tu.email = '$EMAIL';
"

echo ""
echo "✅ Consulta concluída!"
