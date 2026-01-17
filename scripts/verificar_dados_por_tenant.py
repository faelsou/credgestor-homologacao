#!/usr/bin/env python3
"""
Script para verificar se os dados estão no tenant correto no banco
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
    sys.exit(1)

def main():
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    print("=" * 70)
    print("🔍 VERIFICAÇÃO DE DADOS POR TENANT NO BANCO")
    print("=" * 70)
    print()
    
    # Buscar todos os tenants
    print("📋 1. TENANTS E SEUS DADOS:")
    print("-" * 70)
    try:
        tenants_result = supabase.table("tenants").select("*").execute()
        tenants = tenants_result.data or []
        
        for tenant in tenants:
            tenant_id = tenant.get('id')
            tenant_name = tenant.get('name')
            tenant_email = tenant.get('email')
            
            print(f"\n🏢 Tenant: {tenant_name}")
            print(f"   ID: {tenant_id}")
            print(f"   Email: {tenant_email}")
            
            # Verificar clientes
            clients_result = supabase.table("clients").select("id, nome, cpf_cnpj").eq("tenant_id", tenant_id).execute()
            clients = clients_result.data or []
            print(f"   📋 Clientes: {len(clients)}")
            for client in clients:
                print(f"      - {client.get('nome')} (CPF: {client.get('cpf_cnpj')})")
            
            # Verificar empréstimos
            loans_result = supabase.table("loans").select("id").eq("tenant_id", tenant_id).execute()
            loans = loans_result.data or []
            print(f"   💰 Empréstimos: {len(loans)}")
            
            # Verificar parcelas
            installments_result = supabase.table("installments").select("id").eq("tenant_id", tenant_id).execute()
            installments = installments_result.data or []
            print(f"   📅 Parcelas: {len(installments)}")
            
            # Verificar usuários vinculados
            tu_result = supabase.table("tenant_users").select("email, role").eq("tenant_id", tenant_id).eq("ativo", True).execute()
            users = tu_result.data or []
            print(f"   👥 Usuários ativos: {len(users)}")
            for user in users:
                print(f"      - {user.get('email')} ({user.get('role')})")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 70)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 70)
    
    # Verificar especificamente os dois usuários mencionados
    print()
    print("📋 2. VERIFICAÇÃO ESPECÍFICA DOS USUÁRIOS:")
    print("-" * 70)
    
    users_to_check = ['cleitonmaxcar@hotmail.com', 'ancorecosmeticos@hotmail.com']
    
    for email in users_to_check:
        print(f"\n👤 Usuário: {email}")
        
        # Buscar tenant_id em tenant_users
        try:
            tu_result = supabase.table("tenant_users").select("tenant_id").eq("email", email).eq("ativo", True).execute()
            if tu_result.data:
                tenant_id_tu = tu_result.data[0].get('tenant_id')
                print(f"   tenant_id em tenant_users: {tenant_id_tu}")
                
                # Buscar tenant
                tenant_result = supabase.table("tenants").select("name, email").eq("id", tenant_id_tu).execute()
                if tenant_result.data:
                    tenant = tenant_result.data[0]
                    print(f"   Tenant: {tenant.get('name')} ({tenant.get('email')})")
                
                # Verificar clientes deste tenant
                clients_result = supabase.table("clients").select("nome, cpf_cnpj").eq("tenant_id", tenant_id_tu).execute()
                clients = clients_result.data or []
                print(f"   Clientes neste tenant: {len(clients)}")
                for client in clients:
                    print(f"      - {client.get('nome')} (CPF: {client.get('cpf_cnpj')})")
            else:
                print(f"   ⚠️  Usuário não encontrado em tenant_users")
        except Exception as e:
            print(f"   ❌ Erro ao verificar: {e}")

if __name__ == "__main__":
    main()
