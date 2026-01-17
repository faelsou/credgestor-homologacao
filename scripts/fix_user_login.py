#!/usr/bin/env python3
"""
Script para diagnosticar e corrigir problemas de login do usuário
Verifica e cria o usuário em todas as tabelas necessárias
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
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
    sys.exit(1)

# Dados do usuário
ADMIN_EMAIL = "cleitonmaxcar@hotmail.com"
ADMIN_PASSWORD = "CleitonM@xCar2026"
ADMIN_NAME = "Cleiton Max Car"
ADMIN_ROLE = "admin"

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

def check_user_in_public_tables(email: str):
    """Verifica se o usuário existe nas tabelas públicas"""
    results = {
        "users": None,
        "tenant_users": None,
        "tenant": None
    }
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Verificar em public.users
        url = f"{SUPABASE_URL}/rest/v1/users?email=eq.{email}"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                results["users"] = data[0]
    except Exception as e:
        print(f"⚠️  Erro ao verificar public.users: {e}")
    
    try:
        # Verificar em public.tenant_users (com join em tenants)
        url = f"{SUPABASE_URL}/rest/v1/tenant_users?email=eq.{email}&select=*,tenants(*)"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                results["tenant_users"] = data[0]
                if data[0].get("tenants"):
                    results["tenant"] = data[0]["tenants"]
    except Exception as e:
        print(f"⚠️  Erro ao verificar public.tenant_users: {e}")
    
    return results

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
                "created_by": "fix_script"
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

def test_login(email: str, password: str):
    """Testa o login do usuário"""
    try:
        # Usa ANON_KEY para testar login (como o frontend faz)
        anon_key = os.getenv("SUPABASE_ANON_KEY")
        if not anon_key:
            print("⚠️  SUPABASE_ANON_KEY não encontrada, pulando teste de login")
            return False
        
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": anon_key,
            "Content-Type": "application/json"
        }
        payload = {
            "email": email,
            "password": password
        }
        
        response = requests.post(auth_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            session = data.get("session", {})
            
            if user and session:
                print(f"✅ Login testado com sucesso!")
                print(f"   User ID: {user.get('id')}")
                return True
            else:
                print(f"❌ Login falhou - resposta inválida")
                return False
        else:
            error_data = response.json() if response.content else {}
            error_msg = error_data.get('error_description') or error_data.get('error', f"Status {response.status_code}")
            print(f"❌ Login falhou: {error_msg}")
            return False
    except Exception as e:
        print(f"❌ Erro ao testar login: {e}")
        return False

def main():
    """Função principal"""
    
    print("=" * 70)
    print("🔍 DIAGNÓSTICO E CORREÇÃO DE LOGIN DO USUÁRIO")
    print("=" * 70)
    print(f"Email: {ADMIN_EMAIL}")
    print()
    
    # 1. Verificar usuário no Supabase Auth
    print("📋 Passo 1: Verificando usuário no Supabase Auth...")
    auth_user = check_user_in_auth(ADMIN_EMAIL)
    if auth_user:
        print(f"✅ Usuário encontrado no Auth.users")
        print(f"   ID: {auth_user.get('id')}")
        print(f"   Email confirmado: {auth_user.get('email_confirmed_at') is not None}")
        user_id = auth_user.get('id')
    else:
        print(f"❌ Usuário NÃO encontrado no Auth.users")
        user_id = None
    print()
    
    # 2. Verificar usuário nas tabelas públicas
    print("📋 Passo 2: Verificando usuário nas tabelas públicas...")
    public_data = check_user_in_public_tables(ADMIN_EMAIL)
    
    if public_data["users"]:
        print(f"✅ Usuário encontrado em public.users")
        if not user_id:
            user_id = public_data["users"].get("id")
    else:
        print(f"❌ Usuário NÃO encontrado em public.users")
    
    if public_data["tenant_users"]:
        print(f"✅ Vínculo encontrado em public.tenant_users")
        tenant_id = public_data["tenant_users"].get("tenant_id")
        if public_data["tenant"]:
            print(f"   Tenant: {public_data['tenant'].get('name')} (ID: {tenant_id})")
    else:
        print(f"❌ Vínculo NÃO encontrado em public.tenant_users")
        tenant_id = None
    print()
    
    # 3. Obter ou criar tenant
    if not tenant_id:
        print("📋 Passo 3: Obtendo ou criando tenant...")
        tenant_id = get_or_create_tenant()
        if not tenant_id:
            print("❌ Não foi possível obter ou criar tenant")
            sys.exit(1)
        print()
    
    # 4. Criar/atualizar usuário no Auth se necessário
    if not auth_user:
        print("📋 Passo 4: Criando usuário no Supabase Auth...")
        auth_user = create_user_in_auth(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE, tenant_id)
        if auth_user:
            user_id = auth_user.get('id')
        else:
            print("❌ Não foi possível criar usuário no Auth")
            print("   Você precisará criá-lo manualmente no Supabase Dashboard")
            sys.exit(1)
        print()
    else:
        # Atualizar metadados se necessário
        print("📋 Passo 4: Verificando/atualizando metadados no Auth...")
        current_metadata = auth_user.get('user_metadata', {})
        current_app_metadata = auth_user.get('app_metadata', {})
        
        needs_update = (
            current_metadata.get('tenant_id') != tenant_id or
            current_app_metadata.get('tenant_id') != tenant_id or
            current_metadata.get('name') != ADMIN_NAME or
            current_app_metadata.get('role') != ADMIN_ROLE
        )
        
        if needs_update:
            update_user_metadata_in_auth(user_id, tenant_id, ADMIN_NAME, ADMIN_ROLE)
        else:
            print(f"✅ Metadados já estão corretos")
        print()
    
    # 5. Criar/atualizar nas tabelas públicas
    print("📋 Passo 5: Criando/atualizando usuário nas tabelas públicas...")
    if create_or_update_public_tables(user_id, ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE, tenant_id):
        print()
    else:
        print("❌ Erro ao atualizar tabelas públicas")
        sys.exit(1)
    
    # 6. Testar login
    print("📋 Passo 6: Testando login...")
    test_login(ADMIN_EMAIL, ADMIN_PASSWORD)
    print()
    
    # Resumo final
    print("=" * 70)
    print("✅ PROCESSO CONCLUÍDO!")
    print("=" * 70)
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Senha: {ADMIN_PASSWORD}")
    print(f"User ID: {user_id}")
    print(f"Tenant ID: {tenant_id}")
    print(f"Role: {ADMIN_ROLE}")
    print()
    print("Agora você deve conseguir fazer login na aplicação!")
    print("=" * 70)

if __name__ == "__main__":
    main()
