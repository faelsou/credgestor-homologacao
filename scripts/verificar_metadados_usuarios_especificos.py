#!/usr/bin/env python3
"""
Script para verificar metadados de usuários específicos
"""

import os
import sys
import requests
from dotenv import load_dotenv

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

def main():
    print("=" * 70)
    print("🔍 VERIFICAÇÃO DE METADADOS - USUÁRIOS ESPECÍFICOS")
    print("=" * 70)
    print()
    
    users_to_check = [
        'cleitonmaxcar@hotmail.com',
        'ancorecosmeticos@hotmail.com',
        'aiagenteautomate@gmail.com'
    ]
    
    for email in users_to_check:
        print(f"👤 Verificando: {email}")
        print("-" * 70)
        
        # Buscar usuário do Auth
        auth_user = get_user_from_auth(email)
        if not auth_user:
            print(f"   ❌ Usuário não encontrado no Auth")
            print()
            continue
        
        user_id = auth_user.get('id')
        user_metadata = auth_user.get('user_metadata', {}) or auth_user.get('raw_user_meta_data', {}) or {}
        app_metadata = auth_user.get('app_metadata', {}) or auth_user.get('raw_app_meta_data', {}) or {}
        
        tenant_id_metadata = user_metadata.get('tenant_id')
        tenant_id_app = app_metadata.get('tenant_id')
        tenant_id = tenant_id_metadata or tenant_id_app
        
        print(f"   ID: {user_id}")
        print(f"   tenant_id (user_metadata): {tenant_id_metadata}")
        print(f"   tenant_id (app_metadata): {tenant_id_app}")
        print(f"   tenant_id (resolvido): {tenant_id}")
        
        # Verificar tenant_users
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        
        try:
            tu_result = supabase.table("tenant_users").select("tenant_id, role").eq("email", email).eq("ativo", True).execute()
            if tu_result.data:
                tenant_id_tu = tu_result.data[0].get('tenant_id')
                role = tu_result.data[0].get('role')
                print(f"   tenant_id em tenant_users: {tenant_id_tu}")
                print(f"   role: {role}")
                
                # Verificar se há inconsistência
                if tenant_id != tenant_id_tu:
                    print(f"   ⚠️  INCONSISTÊNCIA DETECTADA!")
                    print(f"      Metadados: {tenant_id}")
                    print(f"      tenant_users: {tenant_id_tu}")
                else:
                    print(f"   ✅ Metadados e tenant_users estão sincronizados")
            else:
                print(f"   ⚠️  Usuário não encontrado em tenant_users")
        except Exception as e:
            print(f"   ❌ Erro ao verificar tenant_users: {e}")
        
        print()

if __name__ == "__main__":
    main()
