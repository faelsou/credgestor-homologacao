#!/usr/bin/env python3
"""
Script para debugar isolamento de dados por tenant
Verifica se os dados estão realmente isolados no banco
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
    print("🔍 VERIFICAÇÃO DE ISOLAMENTO DE DADOS POR TENANT")
    print("=" * 70)
    print()
    
    # 1. Listar tenants e usuários
    print("📋 1. TENANTS E USUÁRIOS:")
    print("-" * 70)
    try:
        result = supabase.table("tenants").select("*, tenant_users(*)").execute()
        for tenant in result.data:
            tenant_users = tenant.get('tenant_users', [])
            active_users = [tu for tu in tenant_users if tu.get('ativo', False)]
            print(f"Tenant: {tenant.get('name')} (ID: {tenant.get('id')})")
            print(f"  Usuários: {len(active_users)}")
            for tu in active_users:
                print(f"    - {tu.get('email')} (Role: {tu.get('role')})")
            print()
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    # 2. Verificar clientes por tenant
    print("📋 2. CLIENTES POR TENANT:")
    print("-" * 70)
    try:
        result = supabase.table("clients").select("tenant_id, nome, cpf_cnpj").execute()
        tenants_clients = {}
        for client in result.data:
            tenant_id = client.get('tenant_id')
            if tenant_id:
                if tenant_id not in tenants_clients:
                    tenants_clients[tenant_id] = []
                tenants_clients[tenant_id].append(client.get('nome', 'Sem nome'))
        
        for tenant_id, clients in tenants_clients.items():
            # Buscar nome do tenant
            tenant_result = supabase.table("tenants").select("name").eq("id", tenant_id).execute()
            tenant_name = tenant_result.data[0].get('name') if tenant_result.data else 'Desconhecido'
            print(f"Tenant: {tenant_name} ({tenant_id})")
            print(f"  Total de clientes: {len(clients)}")
            for client_name in clients[:5]:  # Mostrar apenas os 5 primeiros
                print(f"    - {client_name}")
            if len(clients) > 5:
                print(f"    ... e mais {len(clients) - 5} clientes")
            print()
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    # 3. Verificar se há clientes sem tenant_id
    print("📋 3. CLIENTES SEM TENANT_ID:")
    print("-" * 70)
    try:
        result = supabase.table("clients").select("id, nome, cpf_cnpj, tenant_id").is_("tenant_id", "null").execute()
        if result.data:
            print(f"⚠️  ENCONTRADOS {len(result.data)} CLIENTES SEM TENANT_ID:")
            for client in result.data:
                print(f"    - {client.get('nome')} ({client.get('cpf_cnpj')})")
        else:
            print("✅ Nenhum cliente sem tenant_id")
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    # 4. Verificar empréstimos por tenant
    print("📋 4. EMPRÉSTIMOS POR TENANT:")
    print("-" * 70)
    try:
        result = supabase.table("loans").select("tenant_id").execute()
        tenants_loans = {}
        for loan in result.data:
            tenant_id = loan.get('tenant_id')
            if tenant_id:
                tenants_loans[tenant_id] = tenants_loans.get(tenant_id, 0) + 1
        
        for tenant_id, count in tenants_loans.items():
            tenant_result = supabase.table("tenants").select("name").eq("id", tenant_id).execute()
            tenant_name = tenant_result.data[0].get('name') if tenant_result.data else 'Desconhecido'
            print(f"Tenant: {tenant_name} ({tenant_id})")
            print(f"  Total de empréstimos: {count}")
        print()
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    # 5. Verificar parcelas por tenant
    print("📋 5. PARCELAS POR TENANT:")
    print("-" * 70)
    try:
        result = supabase.table("installments").select("tenant_id").execute()
        tenants_installments = {}
        for inst in result.data:
            tenant_id = inst.get('tenant_id')
            if tenant_id:
                tenants_installments[tenant_id] = tenants_installments.get(tenant_id, 0) + 1
        
        for tenant_id, count in tenants_installments.items():
            tenant_result = supabase.table("tenants").select("name").eq("id", tenant_id).execute()
            tenant_name = tenant_result.data[0].get('name') if tenant_result.data else 'Desconhecido'
            print(f"Tenant: {tenant_name} ({tenant_id})")
            print(f"  Total de parcelas: {count}")
        print()
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    # 6. Verificar se há dados com tenant_id inválido
    print("📋 6. VERIFICAR DADOS COM TENANT_ID INVÁLIDO:")
    print("-" * 70)
    try:
        # Buscar todos os tenant_ids válidos
        tenants_result = supabase.table("tenants").select("id").execute()
        valid_tenant_ids = {t.get('id') for t in tenants_result.data}
        
        # Verificar clientes
        clients_result = supabase.table("clients").select("id, nome, tenant_id").execute()
        invalid_clients = [c for c in clients_result.data if c.get('tenant_id') and c.get('tenant_id') not in valid_tenant_ids]
        if invalid_clients:
            print(f"⚠️  {len(invalid_clients)} clientes com tenant_id inválido")
        else:
            print("✅ Todos os clientes têm tenant_id válido")
    except Exception as e:
        print(f"❌ Erro: {e}")
    print()
    
    print("=" * 70)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 70)

if __name__ == "__main__":
    main()
