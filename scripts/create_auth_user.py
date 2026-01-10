#!/usr/bin/env python3
"""
Script para criar usuário no Supabase Auth via API
Requer SUPABASE_SERVICE_ROLE_KEY (não use a anon key para criar usuários)
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
    sys.exit(1)

def create_auth_user(email: str, password: str, auto_confirm: bool = True):
    """Cria um usuário no Supabase Auth"""
    
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password,
        "email_confirm": auto_confirm,
        "user_metadata": {},
        "app_metadata": {}
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        user_data = response.json()
        print(f"✅ Usuário criado com sucesso!")
        print(f"   Email: {user_data.get('email')}")
        print(f"   ID: {user_data.get('id')}")
        print(f"   Email confirmado: {user_data.get('email_confirmed_at') is not None}")
        return user_data
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        error_msg = error_data.get('msg', error_data.get('message', str(e)))
        
        if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower():
            print(f"⚠️  Usuário {email} já existe no Supabase Auth")
            return None
        else:
            print(f"❌ Erro ao criar usuário: {error_msg}")
            print(f"   Status: {e.response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Criar usuário no Supabase Auth")
    parser.add_argument("--email", default="admin@alpha.com", help="Email do usuário")
    parser.add_argument("--password", default="AdminAlpha123!", help="Senha do usuário")
    parser.add_argument("--auto-confirm", action="store_true", default=True, help="Confirmar email automaticamente")
    
    args = parser.parse_args()
    
    print(f"🔧 Criando usuário no Supabase Auth...")
    print(f"   Email: {args.email}")
    print(f"   Auto-confirm: {args.auto_confirm}")
    print()
    
    create_auth_user(args.email, args.password, args.auto_confirm)
