#!/usr/bin/env python3
"""
Script completo para criar 2 usuários admin no CredGestor
Cria os usuários em todas as tabelas necessárias:
- auth.users (Supabase Auth)
- public.users
- public.tenant_users
"""

import os
import sys
import requests
import json

# Tenta importar dotenv (opcional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv não instalado, usando variáveis de ambiente do sistema")

# Tenta importar requests
try:
    import requests
except ImportError:
    print("❌ Erro: módulo 'requests' não encontrado")
    print("   Instale com: pip3 install requests")
    sys.exit(1)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas")
    print("   Configure as variáveis de ambiente ou crie um arquivo .env")
    sys.exit(1)

# Dados dos usuários
USERS = [
    {
        "email": "aiagenteautomate@gmail.com",
        "password": "061603F@tim@",
        "name": "AiAgent Automate",
        "role": "admin"
    },
    {
        "email": "ancorecosmeticos@hotmail.com",
        "password": "AncoreComseticos2026",
        "name": "Ancore Cosmeticos",
        "role": "admin"
    }
]

def check_user_in_auth(email: str):
    """Verifica se o usuário existe no Supabase Auth"""
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        params = {"email": email}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            users = response.json().get('users', [])
            if users:
                return users[0]
        return None
    except Exception as e:
        print(f"⚠️  Erro ao verificar usuário no Auth: {e}")
        return None

def create_user_in_auth(email: str, password: str, name: str, role: str, tenant_id: str):
    """Cria usuário no Supabase Auth via API"""
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
        if response.status_code == 200 or response.status_code == 201:
            user_data = response.json()
            print(f"✅ Usuário criado no Supabase Auth!")
            return user_data
        else:
            error_data = response.json() if response.content else {}
            error_msg = error_data.get('msg', error_data.get('message', f'Status {response.status_code}'))
            print(f"❌ Erro ao criar usuário: {error_msg}")
            return None
    except Exception as e:
        print(f"❌ Erro ao criar usuário no Auth: {e}")
        return None

def update_user_metadata_in_auth(user_id: str, tenant_id: str, name: str, role: str):
    """Atualiza os metadados do usuário no Supabase Auth"""
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
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
        response = requests.put(url, json=payload, headers=headers)
        if response.status_code == 200:
            print(f"✅ Metadados atualizados no Supabase Auth")
            return True
        else:
            print(f"⚠️  Não foi possível atualizar metadados: {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️  Erro ao atualizar metadados: {e}")
        return False

def get_or_create_tenant():
    """Obtém um tenant existente ou cria um novo"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    try:
        url = f"{SUPABASE_URL}/rest/v1/tenants?ativo=eq.true&limit=1"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                tenant = data[0]
                print(f"✅ Usando tenant existente: {tenant['name']} (ID: {tenant['id']})")
                return tenant['id']
    except Exception as e:
        print(f"⚠️  Erro ao buscar tenant: {e}")
    
    # Se não encontrou, cria um novo
    try:
        new_tenant = {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Tenant Principal",
            "slug": "tenant-principal",
            "email": "admin@credgestor.com",
            "telefone": "(11) 0000-0000",
            "ativo": True
        }
        url = f"{SUPABASE_URL}/rest/v1/tenants"
        response = requests.post(url, json=new_tenant, headers=headers)
        if response.status_code in [200, 201]:
            data = response.json()
            if data:
                tenant_id = data[0]['id'] if isinstance(data, list) else data.get('id')
                print(f"✅ Tenant criado: {new_tenant['name']} (ID: {tenant_id})")
                return tenant_id
    except Exception as e:
        print(f"❌ Erro ao criar tenant: {e}")
        return "00000000-0000-0000-0000-000000000001"
    
    return None

def create_or_update_public_tables(user_id: str, email: str, name: str, role: str, tenant_id: str):
    """Cria ou atualiza o usuário nas tabelas públicas"""
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    # 1. Criar/atualizar em public.users
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
        url = f"{SUPABASE_URL}/rest/v1/users"
        response = requests.post(url, json=user_data, headers=headers)
        if response.status_code in [200, 201]:
            print(f"✅ Usuário criado/atualizado em public.users")
        else:
            # Tentar PUT se POST falhar
            url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
            response = requests.patch(url, json=user_data, headers=headers)
            if response.status_code in [200, 204]:
                print(f"✅ Usuário atualizado em public.users")
    except Exception as e:
        print(f"❌ Erro ao criar/atualizar public.users: {e}")
        return False
    
    # 2. Criar/atualizar em public.tenant_users
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
        # Usar POST com Prefer para upsert
        url = f"{SUPABASE_URL}/rest/v1/tenant_users"
        response = requests.post(url, json=tenant_user_data, headers=headers)
        if response.status_code in [200, 201]:
            print(f"✅ Vínculo criado/atualizado em public.tenant_users")
        else:
            # Tentar PATCH se POST falhar
            url = f"{SUPABASE_URL}/rest/v1/tenant_users?tenant_id=eq.{tenant_id}&email=eq.{email}"
            response = requests.patch(url, json=tenant_user_data, headers=headers)
            if response.status_code in [200, 204]:
                print(f"✅ Vínculo atualizado em public.tenant_users")
    except Exception as e:
        print(f"❌ Erro ao criar/atualizar tenant_users: {e}")
        return False
    
    return True

def create_user_complete(user_data: dict, tenant_id: str):
    """Cria um usuário completo em todas as tabelas"""
    
    email = user_data["email"]
    password = user_data["password"]
    name = user_data["name"]
    role = user_data["role"]
    
    print(f"\n{'='*70}")
    print(f"📋 Criando usuário: {name}")
    print(f"{'='*70}")
    print(f"Email: {email}")
    print(f"Role: {role}")
    print()
    
    # 1. Verificar/Criar no Auth
    print("📋 Passo 1: Verificando/Criando no Supabase Auth...")
    auth_user = check_user_in_auth(email)
    
    if auth_user:
        print(f"✅ Usuário encontrado no Auth.users")
        print(f"   ID: {auth_user.get('id')}")
        user_id = auth_user.get('id')
        
        # Atualizar metadados se necessário
        print("📋 Atualizando metadados...")
        update_user_metadata_in_auth(user_id, tenant_id, name, role)
    else:
        print("📋 Criando usuário no Supabase Auth...")
        auth_user = create_user_in_auth(email, password, name, role, tenant_id)
        if auth_user:
            user_id = auth_user.get('id')
        else:
            print("❌ Não foi possível criar usuário no Auth")
            print("   Você precisará criá-lo manualmente no Supabase Dashboard")
            return False
    
    print()
    
    # 2. Criar/Atualizar nas tabelas públicas
    print("📋 Passo 2: Criando/Atualizando nas tabelas públicas...")
    if create_or_update_public_tables(user_id, email, name, role, tenant_id):
        print()
    else:
        print("❌ Erro ao atualizar tabelas públicas")
        return False
    
    print(f"✅ Usuário {name} criado com sucesso!")
    print(f"   User ID: {user_id}")
    print(f"   Tenant ID: {tenant_id}")
    
    return True

def main():
    """Função principal"""
    
    print("=" * 70)
    print("🔧 CRIANDO 2 USUÁRIOS ADMIN COMPLETOS NO CREDGESTOR")
    print("=" * 70)
    print()
    
    # Obter ou criar tenant
    print("📋 Obtendo ou criando tenant...")
    tenant_id = get_or_create_tenant()
    if not tenant_id:
        print("❌ Não foi possível obter ou criar tenant")
        sys.exit(1)
    print()
    
    # Criar cada usuário
    success_count = 0
    for user_data in USERS:
        if create_user_complete(user_data, tenant_id):
            success_count += 1
    
    # Resumo final
    print()
    print("=" * 70)
    print("📊 RESUMO")
    print("=" * 70)
    print(f"Usuários criados: {success_count}/{len(USERS)}")
    print()
    
    if success_count == len(USERS):
        print("✅ TODOS OS USUÁRIOS CRIADOS COM SUCESSO!")
        print()
        print("Dados dos usuários:")
        for user_data in USERS:
            print(f"  - {user_data['name']}")
            print(f"    Email: {user_data['email']}")
            print(f"    Senha: {user_data['password']}")
            print(f"    Role: {user_data['role']}")
            print()
    else:
        print("⚠️  Alguns usuários não foram criados")
        print("   Verifique os logs acima e crie manualmente no Supabase Dashboard se necessário")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
