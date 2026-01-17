#!/usr/bin/env python3
"""
Script para corrigir inconsistência entre tenant_id nos metadados e tenant_users

PROBLEMA IDENTIFICADO:
- Usuários podem ter tenant_id nos metadados diferente do tenant_id em tenant_users
- Isso causa compartilhamento de dados porque o backend usa o tenant_id dos metadados
- Mas os dados estão no tenant_id de tenant_users

SOLUÇÃO:
- Sincronizar tenant_id dos metadados com tenant_users
- Usar tenant_users como fonte da verdade (pois é onde os dados estão)
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
    print("🔧 CORREÇÃO DE INCONSISTÊNCIA: tenant_id nos metadados vs tenant_users")
    print("=" * 70)
    print()
    
    # Buscar todos os vínculos em tenant_users
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
    
    # Verificar inconsistências
    print("📋 Passo 2: Verificando inconsistências...")
    inconsistencies = []
    users_by_email = {}
    
    for tu in tenant_users_data:
        email = tu.get('email')
        tenant_id_tu = tu.get('tenant_id')
        user_id = tu.get('user_id')
        
        if not email or not tenant_id_tu:
            continue
        
        # Buscar usuário do Auth
        if email not in users_by_email:
            auth_user = get_user_from_auth(email)
            users_by_email[email] = auth_user
        else:
            auth_user = users_by_email[email]
        
        if not auth_user:
            print(f"⚠️  Usuário {email} não encontrado no Auth")
            continue
        
        # Verificar tenant_id nos metadados
        user_metadata = auth_user.get('user_metadata', {}) or auth_user.get('raw_user_meta_data', {}) or {}
        app_metadata = auth_user.get('app_metadata', {}) or auth_user.get('raw_app_meta_data', {}) or {}
        tenant_id_metadata = user_metadata.get('tenant_id') or app_metadata.get('tenant_id')
        
        if tenant_id_metadata != tenant_id_tu:
            inconsistencies.append({
                'email': email,
                'user_id': auth_user.get('id'),
                'tenant_id_metadata': tenant_id_metadata,
                'tenant_id_tenant_users': tenant_id_tu,
                'role': tu.get('role'),
            })
            print(f"⚠️  INCONSISTÊNCIA encontrada:")
            print(f"   Email: {email}")
            print(f"   tenant_id nos metadados: {tenant_id_metadata}")
            print(f"   tenant_id em tenant_users: {tenant_id_tu}")
            print()
    
    if not inconsistencies:
        print("✅ Nenhuma inconsistência encontrada!")
        return
    
    print(f"📊 Total de inconsistências: {len(inconsistencies)}")
    print()
    
    # Confirmar correção
    resposta = input("⚠️  Deseja corrigir essas inconsistências? (sim/não): ")
    if resposta.lower() not in ['sim', 's', 'yes', 'y']:
        print("❌ Operação cancelada")
        return
    
    # Corrigir inconsistências
    print()
    print("📋 Passo 3: Corrigindo inconsistências...")
    print()
    
    success_count = 0
    error_count = 0
    
    for inc in inconsistencies:
        email = inc['email']
        user_id = inc['user_id']
        tenant_id_correct = inc['tenant_id_tenant_users']  # Usar tenant_users como fonte da verdade
        role = inc.get('role', 'admin')
        
        print(f"🔧 Corrigindo {email}...")
        print(f"   Atualizando tenant_id nos metadados para: {tenant_id_correct}")
        
        if update_user_metadata(user_id, tenant_id_correct, role=role):
            print(f"   ✅ {email} corrigido com sucesso")
            success_count += 1
        else:
            print(f"   ❌ Falha ao corrigir {email}")
            error_count += 1
        print()
    
    print("=" * 70)
    print(f"✅ CORREÇÃO CONCLUÍDA")
    print(f"   Sucessos: {success_count}")
    print(f"   Erros: {error_count}")
    print("=" * 70)

if __name__ == "__main__":
    main()
