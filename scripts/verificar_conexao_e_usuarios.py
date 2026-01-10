#!/usr/bin/env python3
"""
Script para verificar conexão com banco de dados e listar usuários/tenants
"""

import os
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

try:
    from backend.settings import get_settings
    from backend.supabase_client import get_supabase_admin_client
except ImportError as e:
    print(f"❌ Erro ao importar módulos: {e}")
    print("   Certifique-se de estar no diretório raiz do projeto")
    sys.exit(1)


def verificar_configuracao():
    """Verifica se as configurações estão corretas"""
    print("🔍 Verificando configuração...")
    
    try:
        settings = get_settings()
        
        print(f"  ✅ SUPABASE_URL: {'✅ Configurado' if settings.supabase_url else '❌ Não configurado'}")
        print(f"  ✅ SUPABASE_SERVICE_ROLE_KEY: {'✅ Configurado' if settings.supabase_service_role_key else '❌ Não configurado'}")
        print(f"  ✅ SUPABASE_ANON_KEY: {'✅ Configurado' if settings.supabase_anon_key else '❌ Não configurado'}")
        print(f"  ✅ DEFAULT_TENANT_ID: {settings.default_tenant_id or 'Não configurado'}")
        
        if not settings.supabase_url or not settings.supabase_service_role_key:
            print("\n❌ Configuração incompleta!")
            print("   Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Erro ao verificar configuração: {e}")
        return False


def testar_conexao():
    """Testa conexão com o Supabase"""
    print("\n🔌 Testando conexão com banco de dados...")
    
    try:
        supabase = get_supabase_admin_client()
        
        # Tenta fazer uma query simples
        response = supabase.table("tenants").select("id, name").limit(1).execute()
        
        if response.error:
            print(f"❌ Erro na conexão: {response.error}")
            return False
        
        print("✅ Conexão estabelecida com sucesso!")
        return True
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return False


def listar_tenants():
    """Lista todos os tenants"""
    print("\n📋 Listando tenants...")
    
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table("tenants").select("id, name, created_at").execute()
        
        if response.error:
            print(f"❌ Erro ao listar tenants: {response.error}")
            return
        
        tenants = response.data or []
        
        if not tenants:
            print("  ⚠️  Nenhum tenant encontrado")
            print("  💡 Crie um tenant via Supabase Dashboard ou API")
            return
        
        print(f"  ✅ Encontrados {len(tenants)} tenant(s):\n")
        for tenant in tenants:
            print(f"    📌 ID: {tenant.get('id')}")
            print(f"       Nome: {tenant.get('name')}")
            print(f"       Criado em: {tenant.get('created_at', 'N/A')}")
            print()
    except Exception as e:
        print(f"❌ Erro ao listar tenants: {e}")


def listar_tenant_users():
    """Lista usuários vinculados a tenants"""
    print("\n👤 Listando usuários vinculados a tenants...")
    
    try:
        supabase = get_supabase_admin_client()
        response = supabase.table("tenant_users").select("id, tenant_id, email, created_at").execute()
        
        if response.error:
            print(f"  ⚠️  Tabela 'tenant_users' não encontrada ou erro: {response.error}")
            print("  💡 Isso é normal se você estiver usando apenas Supabase Auth")
            return
        
        users = response.data or []
        
        if not users:
            print("  ⚠️  Nenhum usuário encontrado na tabela tenant_users")
            print("  💡 Usuários são criados no Supabase Auth, não nesta tabela")
            return
        
        print(f"  ✅ Encontrados {len(users)} usuário(s):\n")
        for user in users:
            print(f"    📌 ID: {user.get('id')}")
            print(f"       Email: {user.get('email')}")
            print(f"       Tenant ID: {user.get('tenant_id')}")
            print(f"       Criado em: {user.get('created_at', 'N/A')}")
            print()
    except Exception as e:
        print(f"❌ Erro ao listar usuários: {e}")


def instrucoes_login():
    """Mostra instruções para fazer login"""
    print("\n📝 Como fazer login:\n")
    print("  1. Crie um usuário no Supabase Dashboard:")
    print("     - Acesse: https://app.supabase.com")
    print("     - Vá em Authentication > Users > Add User")
    print("     - Preencha email e senha")
    print("     - Adicione tenant_id no User Metadata ou App Metadata")
    print()
    print("  2. Faça login via API:")
    print("     curl -X POST http://localhost:8000/auth/login \\")
    print("       -H 'Content-Type: application/json' \\")
    print("       -d '{")
    print('         "email": "seu-email@exemplo.com",')
    print('         "senha": "sua-senha",')
    print('         "tenant_id": "uuid-do-tenant"')
    print("       }'")
    print()
    print("  3. Ou use o frontend:")
    print("     - Acesse: http://localhost:3000")
    print("     - Faça login com email e senha")
    print()


def main():
    """Função principal"""
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DE CONEXÃO E USUÁRIOS - CredGestor")
    print("=" * 60)
    
    # Verificar configuração
    if not verificar_configuracao():
        print("\n❌ Verificação de configuração falhou!")
        sys.exit(1)
    
    # Testar conexão
    if not testar_conexao():
        print("\n❌ Teste de conexão falhou!")
        sys.exit(1)
    
    # Listar tenants
    listar_tenants()
    
    # Listar usuários
    listar_tenant_users()
    
    # Instruções
    instrucoes_login()
    
    print("=" * 60)
    print("✅ Verificação concluída!")
    print("=" * 60)


if __name__ == "__main__":
    main()
