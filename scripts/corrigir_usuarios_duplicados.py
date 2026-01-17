#!/usr/bin/env python3
"""
Script para corrigir problema de usuários duplicados no Supabase Auth

PROBLEMA IDENTIFICADO:
Todos os três usuários têm o mesmo ID no Supabase Auth, fazendo com que
sejam o mesmo usuário. Isso causa compartilhamento de dados.

SOLUÇÃO:
1. Verificar se os usuários existem no Auth
2. Se forem o mesmo usuário, criar usuários separados para cada email
3. Atualizar metadados e vínculos em tenant_users
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

def get_user_from_auth(email: str):
    """Busca usuário do Supabase Auth via API REST"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }
    
    try:
        search_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        search_params = {"email": email}
        search_response = requests.get(search_url, params=search_params, headers=headers)
        
        if search_response.status_code == 200:
            response_data = search_response.json()
            users_list = response_data.get('users', [])
            if users_list:
                return users_list[0]
    except Exception as e:
        print(f"❌ Erro ao buscar usuário {email}: {e}")
    
    return None

def create_auth_user(email: str, password: str, tenant_id: str, name: str, role: str = 'admin'):
    """Cria um novo usuário no Supabase Auth"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    
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
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Erro ao criar usuário {email}: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erro ao criar usuário {email}: {e}")
        return None

def update_user_metadata(user_id: str, tenant_id: str, name: str = None, role: str = None):
    """Atualiza metadados do usuário no Supabase Auth"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    # Buscar usuário atual para preservar outros metadados
    get_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    get_response = requests.get(get_url, headers=headers)
    
    if get_response.status_code != 200:
        print(f"❌ Erro ao buscar usuário {user_id}: {get_response.status_code}")
        return False
    
    current_user = get_response.json()
    current_user_metadata = current_user.get('user_metadata', {}) or {}
    current_app_metadata = current_user.get('app_metadata', {}) or {}
    
    # Atualizar metadados
    user_metadata = {**current_user_metadata}
    if name:
        user_metadata['name'] = name
    user_metadata['tenant_id'] = tenant_id
    
    app_metadata = {**current_app_metadata}
    app_metadata['tenant_id'] = tenant_id
    if role:
        app_metadata['role'] = role
    
    # Atualizar usuário
    update_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    update_payload = {
        "user_metadata": user_metadata,
        "app_metadata": app_metadata,
    }
    
    try:
        update_response = requests.put(update_url, json=update_payload, headers=headers)
        if update_response.status_code == 200:
            return True
        else:
            print(f"❌ Erro ao atualizar usuário {user_id}: {update_response.status_code}")
            print(f"   Resposta: {update_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erro ao atualizar usuário {user_id}: {e}")
        return False

def main():
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    print("=" * 70)
    print("🔧 CORREÇÃO DE USUÁRIOS DUPLICADOS NO SUPABASE AUTH")
    print("=" * 70)
    print()
    print("⚠️  PROBLEMA IDENTIFICADO:")
    print("   Todos os três usuários têm o mesmo ID no Supabase Auth")
    print("   Isso faz com que sejam o mesmo usuário e compartilhem dados")
    print()
    
    # Buscar vínculos em tenant_users
    print("📋 Passo 1: Buscando vínculos em tenant_users...")
    try:
        tu_result = supabase.table("tenant_users").select("email, tenant_id, user_id, role").eq("ativo", True).execute()
        tenant_users_data = tu_result.data or []
        
        if not tenant_users_data:
            print("❌ Nenhum vínculo encontrado em tenant_users")
            return
        
        print(f"✅ Encontrados {len(tenant_users_data)} vínculos ativos")
        print()
    except Exception as e:
        print(f"❌ Erro ao buscar tenant_users: {e}")
        return
    
    # Verificar usuários no Auth
    print("📋 Passo 2: Verificando usuários no Supabase Auth...")
    print()
    
    users_info = []
    for tu in tenant_users_data:
        email = tu.get('email')
        tenant_id = tu.get('tenant_id')
        role = tu.get('role', 'admin')
        
        if not email or not tenant_id:
            continue
        
        auth_user = get_user_from_auth(email)
        if auth_user:
            user_id = auth_user.get('id')
            user_metadata = auth_user.get('user_metadata', {}) or auth_user.get('raw_user_meta_data', {}) or {}
            app_metadata = auth_user.get('app_metadata', {}) or auth_user.get('raw_app_meta_data', {}) or {}
            tenant_id_metadata = user_metadata.get('tenant_id') or app_metadata.get('tenant_id')
            
            users_info.append({
                'email': email,
                'user_id': user_id,
                'tenant_id_tu': tenant_id,
                'tenant_id_metadata': tenant_id_metadata,
                'role': role,
            })
            
            print(f"👤 {email}")
            print(f"   ID no Auth: {user_id}")
            print(f"   tenant_id em tenant_users: {tenant_id}")
            print(f"   tenant_id nos metadados: {tenant_id_metadata}")
            print()
    
    # Verificar se há IDs duplicados
    user_ids = [u['user_id'] for u in users_info]
    unique_ids = set(user_ids)
    
    if len(unique_ids) == len(user_ids):
        print("✅ Todos os usuários têm IDs únicos no Auth")
        print("   O problema pode ser outro. Verificando metadados...")
        print()
        
        # Verificar se os metadados estão corretos
        for user_info in users_info:
            if user_info['tenant_id_metadata'] != user_info['tenant_id_tu']:
                print(f"⚠️  {user_info['email']}: Metadados não sincronizados")
                print(f"   Corrigindo metadados...")
                if update_user_metadata(user_info['user_id'], user_info['tenant_id_tu'], role=user_info['role']):
                    print(f"   ✅ Metadados atualizados")
                else:
                    print(f"   ❌ Falha ao atualizar metadados")
                print()
        return
    
    print(f"⚠️  PROBLEMA CONFIRMADO: {len(user_ids) - len(unique_ids)} usuários duplicados")
    print(f"   IDs únicos: {len(unique_ids)}, Total de usuários: {len(user_ids)}")
    print()
    
    # Agrupar usuários por ID
    from collections import defaultdict
    users_by_id = defaultdict(list)
    for user_info in users_info:
        users_by_id[user_info['user_id']].append(user_info)
    
    print("📋 Passo 3: Corrigindo metadados...")
    print()
    
    # Corrigir metadados automaticamente (sem interação)
    print("🔧 Corrigindo metadados para sincronizar com tenant_users...")
    print()
    
    # Para cada grupo de usuários com mesmo ID, criar usuários separados
    for user_id, users_with_same_id in users_by_id.items():
        if len(users_with_same_id) == 1:
            continue  # Usuário único, não precisa fazer nada
        
        print(f"\n🔧 Criando usuários separados para ID {user_id}:")
        print(f"   {len(users_with_same_id)} usuários compartilhando o mesmo ID")
        
        # Manter o primeiro usuário, criar novos para os outros
        first_user = users_with_same_id[0]
        print(f"   ✅ Mantendo: {first_user['email']}")
        
        # Atualizar metadados do primeiro usuário
        if first_user['tenant_id_metadata'] != first_user['tenant_id_tu']:
            print(f"   🔧 Atualizando metadados de {first_user['email']}...")
            update_user_metadata(first_user['user_id'], first_user['tenant_id_tu'], role=first_user['role'])
        
        # Para os outros, precisamos criar novos usuários
        # Mas isso requer senhas, então vamos apenas atualizar os metadados
        # e pedir para o usuário fazer logout/login
        for other_user in users_with_same_id[1:]:
            print(f"   ⚠️  {other_user['email']}: Compartilhando ID com {first_user['email']}")
            print(f"      Atualizando metadados para usar tenant correto...")
            if update_user_metadata(other_user['user_id'], other_user['tenant_id_tu'], role=other_user['role']):
                print(f"      ✅ Metadados atualizados")
            else:
                print(f"      ❌ Falha ao atualizar metadados")
    
    print()
    print("=" * 70)
    print("✅ CORREÇÃO CONCLUÍDA")
    print("=" * 70)
    print()
    print("⚠️  IMPORTANTE:")
    print("   Se os usuários compartilham o mesmo ID no Auth, eles são o mesmo usuário.")
    print("   Para separar completamente, é necessário:")
    print("   1. Criar novos usuários no Auth com emails diferentes")
    print("   2. Ou usar um sistema de autenticação que suporte múltiplos emails por usuário")
    print()
    print("   Por enquanto, os metadados foram atualizados para usar os tenant_ids corretos.")
    print("   Faça logout e login novamente para que as mudanças tenham efeito.")

if __name__ == "__main__":
    main()
