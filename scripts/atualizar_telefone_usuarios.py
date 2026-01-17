#!/usr/bin/env python3
"""
Script para atualizar telefone de usuários no CredGestor
Atualiza o telefone em todas as tabelas necessárias
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

# Dados dos usuários para atualizar
USERS_TO_UPDATE = [
    {
        "email": "aiagenteautomate@gmail.com",
        "name": "AiAgent Automate",
        "telefone": "1195231-3944"
    },
    {
        "email": "cleitonmaxcar@hotmail.com",
        "name": "Cleiton Max Car",
        "telefone": "1194789-7969"
    }
]

def update_user_phone_in_public_users(email: str, telefone: str):
    """Atualiza telefone em public.users"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Buscar usuário atual para preservar outros campos do metadata
    try:
        url = f"{SUPABASE_URL}/rest/v1/users?email=eq.{email}"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                user = data[0]
                # Atualizar metadata preservando outros campos
                metadata = user.get("metadata", {})
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)
                metadata["telefone"] = telefone
                
                # Atualizar
                update_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user['id']}"
                update_data = {
                    "metadata": metadata,
                    "updated_at": "now()"
                }
                update_response = requests.patch(update_url, json=update_data, headers=headers)
                if update_response.status_code in [200, 204]:
                    print(f"✅ Telefone atualizado em public.users")
                    return True
    except Exception as e:
        print(f"❌ Erro ao atualizar public.users: {e}")
        return False
    
    return False

def update_user_phone_in_tenant_users(email: str, telefone: str):
    """Atualiza telefone em public.tenant_users"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Buscar vínculo atual
    try:
        url = f"{SUPABASE_URL}/rest/v1/tenant_users?email=eq.{email}"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                tenant_user = data[0]
                # Atualizar metadata preservando outros campos
                metadata = tenant_user.get("metadata", {})
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)
                metadata["telefone"] = telefone
                
                # Atualizar
                update_url = f"{SUPABASE_URL}/rest/v1/tenant_users?id=eq.{tenant_user['id']}"
                update_data = {
                    "metadata": metadata,
                    "updated_at": "now()"
                }
                update_response = requests.patch(update_url, json=update_data, headers=headers)
                if update_response.status_code in [200, 204]:
                    print(f"✅ Telefone atualizado em public.tenant_users")
                    return True
    except Exception as e:
        print(f"❌ Erro ao atualizar tenant_users: {e}")
        return False
    
    return False

def update_user_phone_in_auth(email: str, telefone: str):
    """Atualiza telefone no Supabase Auth (user_metadata)"""
    # Primeiro, buscar o user_id
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
                user = users[0]
                user_id = user.get('id')
                
                # Atualizar user_metadata preservando outros campos
                user_metadata = user.get('user_metadata', {})
                if isinstance(user_metadata, str):
                    user_metadata = json.loads(user_metadata)
                user_metadata["telefone"] = telefone
                
                # Atualizar
                update_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
                update_data = {
                    "user_metadata": user_metadata
                }
                update_response = requests.put(update_url, json=update_data, headers=headers)
                if update_response.status_code == 200:
                    print(f"✅ Telefone atualizado no Supabase Auth")
                    return True
    except Exception as e:
        print(f"❌ Erro ao atualizar Auth: {e}")
        return False
    
    return False

def update_user_phone_complete(user_data: dict):
    """Atualiza telefone de um usuário em todas as tabelas"""
    
    email = user_data["email"]
    name = user_data["name"]
    telefone = user_data["telefone"]
    
    print(f"\n{'='*70}")
    print(f"📋 Atualizando telefone: {name}")
    print(f"{'='*70}")
    print(f"Email: {email}")
    print(f"Telefone: {telefone}")
    print()
    
    # Atualizar em todas as tabelas
    success_count = 0
    
    print("📋 Atualizando em public.users...")
    if update_user_phone_in_public_users(email, telefone):
        success_count += 1
    
    print("📋 Atualizando em public.tenant_users...")
    if update_user_phone_in_tenant_users(email, telefone):
        success_count += 1
    
    print("📋 Atualizando no Supabase Auth...")
    if update_user_phone_in_auth(email, telefone):
        success_count += 1
    
    print()
    if success_count == 3:
        print(f"✅ Telefone de {name} atualizado em todas as tabelas!")
    else:
        print(f"⚠️  Telefone de {name} atualizado em {success_count}/3 tabelas")
    
    return success_count == 3

def verify_phone_updates():
    """Verifica se os telefones foram atualizados corretamente"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("\n" + "="*70)
    print("🔍 VERIFICAÇÃO DE TELEFONES ATUALIZADOS")
    print("="*70)
    print()
    
    for user_data in USERS_TO_UPDATE:
        email = user_data["email"]
        expected_phone = user_data["telefone"]
        
        print(f"📋 Verificando: {user_data['name']} ({email})")
        
        # Verificar em public.users
        try:
            url = f"{SUPABASE_URL}/rest/v1/users?email=eq.{email}&select=name,metadata"
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data:
                    metadata = data[0].get("metadata", {})
                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)
                    phone = metadata.get("telefone")
                    if phone == expected_phone:
                        print(f"   ✅ public.users: {phone}")
                    else:
                        print(f"   ⚠️  public.users: {phone} (esperado: {expected_phone})")
        except Exception as e:
            print(f"   ❌ Erro ao verificar public.users: {e}")
        
        # Verificar em public.tenant_users
        try:
            url = f"{SUPABASE_URL}/rest/v1/tenant_users?email=eq.{email}&select=metadata"
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data:
                    metadata = data[0].get("metadata", {})
                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)
                    phone = metadata.get("telefone")
                    if phone == expected_phone:
                        print(f"   ✅ tenant_users: {phone}")
                    else:
                        print(f"   ⚠️  tenant_users: {phone} (esperado: {expected_phone})")
        except Exception as e:
            print(f"   ❌ Erro ao verificar tenant_users: {e}")
        
        # Verificar no Auth
        try:
            url = f"{SUPABASE_URL}/auth/v1/admin/users"
            params = {"email": email}
            response = requests.get(url, params=params, headers=headers)
            if response.status_code == 200:
                users = response.json().get('users', [])
                if users:
                    user_metadata = users[0].get('user_metadata', {})
                    phone = user_metadata.get("telefone")
                    if phone == expected_phone:
                        print(f"   ✅ auth.users: {phone}")
                    else:
                        print(f"   ⚠️  auth.users: {phone} (esperado: {expected_phone})")
        except Exception as e:
            print(f"   ❌ Erro ao verificar auth.users: {e}")
        
        print()

def main():
    """Função principal"""
    
    print("=" * 70)
    print("📞 ATUALIZANDO TELEFONES DE USUÁRIOS")
    print("=" * 70)
    print()
    
    # Atualizar telefone de cada usuário
    success_count = 0
    for user_data in USERS_TO_UPDATE:
        if update_user_phone_complete(user_data):
            success_count += 1
    
    # Verificar atualizações
    verify_phone_updates()
    
    # Resumo final
    print("=" * 70)
    print("📊 RESUMO")
    print("=" * 70)
    print(f"Usuários atualizados: {success_count}/{len(USERS_TO_UPDATE)}")
    print()
    
    if success_count == len(USERS_TO_UPDATE):
        print("✅ TODOS OS TELEFONES ATUALIZADOS COM SUCESSO!")
        print()
        print("Telefones atualizados:")
        for user_data in USERS_TO_UPDATE:
            print(f"  - {user_data['name']}: {user_data['telefone']}")
    else:
        print("⚠️  Alguns telefones não foram atualizados completamente")
        print("   Verifique os logs acima")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
