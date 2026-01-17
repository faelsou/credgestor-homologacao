#!/usr/bin/env python3
"""
Script completo para criar usuário admin no CredGestor
Cria o usuário em todas as tabelas necessárias:
- auth.users (Supabase Auth)
- public.users
- public.tenant_users
- public.tenants (se necessário)
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Carrega variáveis do .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
    sys.exit(1)

# Dados do usuário admin
ADMIN_EMAIL = "cleitonmaxcar@hotmail.com"
ADMIN_PASSWORD = "CleitonM@xCar2026"
ADMIN_NAME = "Cleiton Max Car"
ADMIN_ROLE = "admin"

def create_auth_user(email: str, password: str, name: str, role: str, tenant_id: str):
    """Cria um usuário no Supabase Auth via API"""
    
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "name": name,
            "tenant_id": tenant_id
        },
        "app_metadata": {
            "provider": "email",
            "providers": ["email"],
            "role": role,
            "tenant_id": tenant_id
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        user_data = response.json()
        print(f"✅ Usuário criado no Supabase Auth!")
        print(f"   Email: {user_data.get('email')}")
        print(f"   ID: {user_data.get('id')}")
        return user_data
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        error_msg = error_data.get('msg', error_data.get('message', str(e)))
        
        if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower():
            print(f"⚠️  Usuário {email} já existe no Supabase Auth")
            # Tenta buscar o usuário existente
            try:
                search_url = f"{SUPABASE_URL}/auth/v1/admin/users"
                search_params = {"email": email}
                search_response = requests.get(search_url, params=search_params, headers=headers)
                if search_response.status_code == 200:
                    users = search_response.json().get('users', [])
                    if users:
                        return users[0]
            except:
                pass
            return None
        else:
            print(f"❌ Erro ao criar usuário no Auth: {error_msg}")
            print(f"   Status: {e.response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Erro inesperado ao criar usuário no Auth: {e}")
        return None

def create_unique_tenant(supabase: Client, user_email: str, user_name: str):
    """
    REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente.
    Esta função cria um novo tenant único para cada usuário.
    """
    import uuid
    from datetime import datetime
    
    # Gera um novo UUID para o tenant (garantindo unicidade)
    tenant_id = str(uuid.uuid4())
    
    # Cria um slug único baseado no email do usuário
    slug_base = user_email.split('@')[0].lower().replace('.', '-').replace('_', '-')
    # Remove caracteres especiais e limita tamanho
    slug_base = ''.join(c for c in slug_base if c.isalnum() or c == '-')[:30]
    slug = f"{slug_base}-{tenant_id[:8]}"
    
    # Nome do tenant baseado no nome do usuário
    tenant_name = f"Aplicação - {user_name}"
    
    try:
        new_tenant = {
            "id": tenant_id,
            "name": tenant_name,
            "slug": slug,
            "email": user_email,
            "telefone": "",
            "ativo": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = supabase.table("tenants").insert(new_tenant).execute()
        if result.data:
            tenant_id = result.data[0]['id']
            print(f"✅ Novo tenant criado exclusivamente para o usuário:")
            print(f"   Tenant ID: {tenant_id}")
            print(f"   Nome: {tenant_name}")
            print(f"   Slug: {slug}")
            return tenant_id
        else:
            print(f"❌ Erro: Não foi possível criar o tenant")
            return None
    except Exception as e:
        print(f"❌ Erro ao criar tenant: {e}")
        return None

def create_user_in_public_users(supabase: Client, user_id: str, email: str, name: str, role: str, tenant_id: str):
    """Cria ou atualiza o usuário na tabela public.users"""
    
    try:
        user_data = {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "metadata": {
                "tenant_id": tenant_id,
                "name": name,
                "role": role
            }
        }
        
        result = supabase.table("users").upsert(user_data).execute()
        if result.data:
            print(f"✅ Usuário criado/atualizado em public.users")
            return True
    except Exception as e:
        print(f"❌ Erro ao criar usuário em public.users: {e}")
        return False
    
    return False

def create_tenant_user_link(supabase: Client, tenant_id: str, user_id: str, email: str, name: str, role: str):
    """Cria ou atualiza o vínculo usuário-tenant em public.tenant_users"""
    
    try:
        tenant_user_data = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "email": email,
            "role": role,
            "ativo": True,
            "metadata": {
                "name": name,
                "role": role,
                "created_by": "script"
            }
        }
        
        # Usa upsert com unique constraint (tenant_id, email)
        result = supabase.table("tenant_users").upsert(
            tenant_user_data,
            on_conflict="tenant_id,email"
        ).execute()
        
        if result.data:
            print(f"✅ Vínculo criado/atualizado em public.tenant_users")
            return True
    except Exception as e:
        print(f"❌ Erro ao criar vínculo em tenant_users: {e}")
        return False
    
    return False

def main():
    """Função principal"""
    
    print("=" * 70)
    print("🔧 CRIANDO USUÁRIO ADMIN COMPLETO NO CREDGESTOR")
    print("=" * 70)
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Senha: {ADMIN_PASSWORD}")
    print(f"Nome: {ADMIN_NAME}")
    print(f"Role: {ADMIN_ROLE}")
    print()
    
    # Inicializa cliente Supabase
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    # 1. Criar tenant único para o usuário
    # REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente
    print("📋 Passo 1: Criando tenant exclusivo para o usuário...")
    print("   ⚠️  REGRA: Cada usuário recebe seu próprio tenant único")
    tenant_id = create_unique_tenant(supabase, ADMIN_EMAIL, ADMIN_NAME)
    if not tenant_id:
        print("❌ Não foi possível criar um tenant exclusivo para o usuário")
        sys.exit(1)
    print()
    
    # 2. Criar usuário no Supabase Auth
    print("📋 Passo 2: Criando usuário no Supabase Auth...")
    auth_user = create_auth_user(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE, tenant_id)
    if not auth_user:
        print("⚠️  Não foi possível criar usuário no Auth. Continuando com ID temporário...")
        import uuid
        user_id = str(uuid.uuid4())
        print(f"   Usando ID temporário: {user_id}")
        print("   ⚠️  IMPORTANTE: Você precisará criar o usuário manualmente no Supabase Auth Dashboard")
    else:
        user_id = auth_user.get('id')
        print(f"   User ID: {user_id}")
    print()
    
    # 3. Criar usuário em public.users
    print("📋 Passo 3: Criando registro em public.users...")
    create_user_in_public_users(supabase, user_id, ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE, tenant_id)
    print()
    
    # 4. Criar vínculo em public.tenant_users
    print("📋 Passo 4: Criando vínculo em public.tenant_users...")
    create_tenant_user_link(supabase, tenant_id, user_id, ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE)
    print()
    
    # 5. Verificação final
    print("=" * 70)
    print("✅ USUÁRIO ADMIN CRIADO COM SUCESSO!")
    print("=" * 70)
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Senha: {ADMIN_PASSWORD}")
    print(f"User ID: {user_id}")
    print(f"Tenant ID: {tenant_id}")
    print(f"Role: {ADMIN_ROLE}")
    print()
    
    # Verificar dados criados
    print("📋 Verificando dados criados...")
    try:
        # Verificar tenant_users
        result = supabase.table("tenant_users").select("*, tenants(name)").eq("email", ADMIN_EMAIL).execute()
        if result.data:
            for tu in result.data:
                print(f"✅ Vínculo encontrado:")
                print(f"   Tenant: {tu.get('tenants', {}).get('name', 'N/A')}")
                print(f"   Email: {tu.get('email')}")
                print(f"   Role: {tu.get('role')}")
                print(f"   Ativo: {tu.get('ativo')}")
    except Exception as e:
        print(f"⚠️  Erro ao verificar dados: {e}")
    
    print()
    print("=" * 70)
    print("🎉 PROCESSO CONCLUÍDO!")
    print("=" * 70)
    
    if not auth_user:
        print()
        print("⚠️  ATENÇÃO: O usuário não foi criado no Supabase Auth.")
        print("   Você precisa criá-lo manualmente:")
        print(f"   1. Acesse: {SUPABASE_URL.replace('/rest/v1', '/auth/users')}")
        print(f"   2. Clique em 'Add User' > 'Create new user'")
        print(f"   3. Email: {ADMIN_EMAIL}")
        print(f"   4. Password: {ADMIN_PASSWORD}")
        print(f"   5. Auto Confirm User: ✅ (marcar)")
        print(f"   6. User Metadata: {{'tenant_id': '{tenant_id}', 'name': '{ADMIN_NAME}', 'role': '{ADMIN_ROLE}'}}")
        print()
        print("   Depois execute este script novamente para atualizar o user_id.")

if __name__ == "__main__":
    main()
