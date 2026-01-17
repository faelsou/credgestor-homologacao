#!/usr/bin/env python3
"""
Script para verificar os metadados dos usuários (tenant_id) via API do Supabase
Os metadados não são acessíveis via SQL direto, precisam ser acessados via API
"""

import os
import sys
import requests
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
    print("🔍 VERIFICAÇÃO DE METADADOS DOS USUÁRIOS (tenant_id)")
    print("=" * 70)
    print()
    print("⚠️  NOTA: user_metadata e app_metadata não são colunas SQL.")
    print("   Eles são acessados via API do Supabase Auth.")
    print()
    
    # Buscar usuários através da tabela tenant_users e depois verificar metadados
    print("📋 USUÁRIOS E SEUS METADADOS:")
    print("-" * 70)
    try:
        # Primeiro, buscar emails da tabela tenant_users
        tu_result = supabase.table("tenant_users").select("email, tenant_id, user_id").execute()
        tenant_users_emails = {tu.get('email') for tu in tu_result.data if tu.get('email')}
        
        if not tenant_users_emails:
            print("⚠️  Nenhum email encontrado em tenant_users")
            print("   Tentando buscar usuários diretamente via API...")
            # Tentar buscar via API admin como fallback
            try:
                admin_response = supabase.auth.admin.list_users()
                if hasattr(admin_response, 'users') and admin_response.users:
                    tenant_users_emails = {user.email for user in admin_response.users if hasattr(user, 'email') and user.email}
            except Exception as e:
                print(f"   ⚠️  Erro ao buscar via admin API: {e}")
        
        if not tenant_users_emails:
            print("❌ Nenhum usuário encontrado")
            return
        
        print(f"📧 Encontrados {len(tenant_users_emails)} emails para verificar")
        print()
        
        # Buscar metadados de cada usuário individualmente via API REST
        users = []
        users_by_email = {}  # Para evitar duplicatas
        headers = {
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        }
        
        for email in tenant_users_emails:
            # Evitar buscar o mesmo email múltiplas vezes
            if email in users_by_email:
                continue
                
            try:
                # Buscar usuário por email usando API REST direta
                search_url = f"{SUPABASE_URL}/auth/v1/admin/users"
                search_params = {"email": email}
                search_response = requests.get(search_url, params=search_params, headers=headers)
                
                if search_response.status_code == 200:
                    response_data = search_response.json()
                    users_list = response_data.get('users', [])
                    if users_list:
                        user_data = users_list[0]  # Pega o primeiro usuário encontrado
                        users_by_email[email] = user_data
                        users.append(user_data)
                    else:
                        print(f"⚠️  Usuário {email} não encontrado via API")
                        user_data = {'email': email, 'id': None, 'user_metadata': {}, 'app_metadata': {}}
                        users_by_email[email] = user_data
                        users.append(user_data)
                else:
                    print(f"⚠️  Erro ao buscar usuário {email}: Status {search_response.status_code}")
                    user_data = {'email': email, 'id': None, 'user_metadata': {}, 'app_metadata': {}}
                    users_by_email[email] = user_data
                    users.append(user_data)
            except Exception as e:
                print(f"⚠️  Erro ao buscar usuário {email}: {e}")
                # Se não conseguir via API, criar objeto básico com email
                user_data = {'email': email, 'id': None, 'user_metadata': {}, 'app_metadata': {}}
                users_by_email[email] = user_data
                users.append(user_data)
        
        if not users:
            print("❌ Nenhum usuário encontrado após verificação")
            return
        
        users_with_tenant = []
        users_without_tenant = []
        
        for user in users:
            # A API REST retorna dicts
            email = user.get('email', 'Sem email')
            # Os metadados podem estar em user_metadata ou raw_user_meta_data
            user_metadata = user.get('user_metadata', {}) or user.get('raw_user_meta_data', {}) or {}
            app_metadata = user.get('app_metadata', {}) or user.get('raw_app_meta_data', {}) or {}
            user_id = user.get('id')
            
            tenant_id_metadata = user_metadata.get('tenant_id')
            tenant_id_app = app_metadata.get('tenant_id')
            tenant_id = tenant_id_metadata or tenant_id_app
            
            user_info = {
                'id': user_id,
                'email': email,
                'tenant_id_metadata': tenant_id_metadata,
                'tenant_id_app': tenant_id_app,
                'tenant_id': tenant_id,
                'created_at': user.get('created_at') if isinstance(user, dict) else getattr(user, 'created_at', None),
            }
            
            if tenant_id:
                users_with_tenant.append(user_info)
            else:
                users_without_tenant.append(user_info)
        
        # Mostrar usuários COM tenant_id
        print(f"✅ USUÁRIOS COM tenant_id ({len(users_with_tenant)}):")
        print("-" * 70)
        for user in users_with_tenant:
            print(f"Email: {user['email']}")
            print(f"  ID: {user['id']}")
            print(f"  tenant_id (user_metadata): {user['tenant_id_metadata'] or 'N/A'}")
            print(f"  tenant_id (app_metadata): {user['tenant_id_app'] or 'N/A'}")
            print(f"  tenant_id (resolvido): {user['tenant_id']}")
            print()
        
        # Mostrar usuários SEM tenant_id
        if users_without_tenant:
            print(f"⚠️  USUÁRIOS SEM tenant_id ({len(users_without_tenant)}):")
            print("-" * 70)
            for user in users_without_tenant:
                print(f"Email: {user['email']}")
                print(f"  ID: {user['id']}")
                print(f"  ⚠️  ESTE USUÁRIO NÃO CONSEGUIRÁ FAZER LOGIN!")
                print()
        else:
            print("✅ Todos os usuários têm tenant_id nos metadados")
            print()
        
        # Verificar se os tenant_ids estão corretos
        print("📋 VERIFICAÇÃO DE TENANT_IDS:")
        print("-" * 70)
        for user in users_with_tenant:
            tenant_id = user['tenant_id']
            # Verificar se o tenant existe
            try:
                tenant_result = supabase.table("tenants").select("id, name, email").eq("id", tenant_id).execute()
                if tenant_result.data:
                    tenant = tenant_result.data[0]
                    print(f"✅ {user['email']}: tenant_id {tenant_id} → {tenant.get('name')} ({tenant.get('email')})")
                else:
                    print(f"❌ {user['email']}: tenant_id {tenant_id} → TENANT NÃO ENCONTRADO!")
            except Exception as e:
                print(f"❌ {user['email']}: Erro ao verificar tenant {tenant_id}: {e}")
        print()
        
        # Verificar se os usuários estão em tenant_users
        print("📋 VERIFICAÇÃO DE VÍNCULOS EM tenant_users:")
        print("-" * 70)
        for user in users_with_tenant:
            email = user['email']
            tenant_id = user['tenant_id']
            try:
                tu_result = supabase.table("tenant_users").select("*").eq("email", email).eq("ativo", True).execute()
                if tu_result.data:
                    for tu in tu_result.data:
                        tu_tenant_id = tu.get('tenant_id')
                        if tu_tenant_id == tenant_id:
                            print(f"✅ {email}: Vinculado ao tenant {tenant_id} em tenant_users")
                        else:
                            print(f"⚠️  {email}: tenant_id nos metadados ({tenant_id}) != tenant_id em tenant_users ({tu_tenant_id})")
                else:
                    print(f"⚠️  {email}: NÃO está em tenant_users (mas tem tenant_id nos metadados)")
            except Exception as e:
                print(f"❌ {email}: Erro ao verificar tenant_users: {e}")
        print()
        
    except Exception as e:
        print(f"❌ Erro ao buscar usuários: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 70)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 70)
    print()
    print("📝 PRÓXIMOS PASSOS:")
    print("   1. Se houver usuários sem tenant_id, use o script de migração:")
    print("      python3 scripts/migrar_usuarios_para_tenants_unicos.py")
    print("   2. Se houver tenant_ids inválidos, atualize os metadados:")
    print("      - Via Supabase Dashboard > Authentication > Users")
    print("      - Ou via script Python usando admin API")

if __name__ == "__main__":
    main()
