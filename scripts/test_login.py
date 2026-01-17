#!/usr/bin/env python3
"""
Script para testar o login do usuário diretamente
Verifica se a autenticação está funcionando corretamente
"""

import os
import sys
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
ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not ANON_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas")
    print("   Configure as variáveis de ambiente ou crie um arquivo .env")
    sys.exit(1)

# Dados do usuário
ADMIN_EMAIL = "cleitonmaxcar@hotmail.com"
ADMIN_PASSWORD = "CleitonM@xCar2026"
TENANT_ID = "00000000-0000-0000-0000-000000000002"  # Empresa Beta

def test_supabase_login():
    """Testa o login diretamente no Supabase Auth via API REST"""
    
    print("=" * 70)
    print("🔐 TESTE DE LOGIN DIRETO NO SUPABASE AUTH")
    print("=" * 70)
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Tenant ID: {TENANT_ID}")
    print()
    
    try:
        # URL da API de autenticação do Supabase
        # O Supabase Auth usa /auth/v1/token com grant_type=password
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        
        headers = {
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
            "Content-Type": "application/json"
        }
        
        # Payload no formato correto do Supabase
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        # Alternativa: tentar também com x-www-form-urlencoded se JSON não funcionar
        # Mas vamos começar com JSON
        
        print("📋 Tentando fazer login...")
        print(f"   URL: {auth_url}")
        print(f"   Headers: apikey={ANON_KEY[:20]}...")
        
        response = requests.post(auth_url, json=payload, headers=headers, timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        # Mostrar resposta completa para debug
        print(f"   Resposta completa (primeiros 1000 chars):")
        print(f"   {response.text[:1000]}")
        print()
        
        # Tentar parsear JSON
        try:
            data = response.json()
        except Exception as e:
            print(f"   ❌ Resposta não é JSON válido: {e}")
            print(f"   Tipo de conteúdo: {response.headers.get('content-type', 'desconhecido')}")
            return False
        
        if response.status_code == 200:
            user = data.get("user", {})
            session = data.get("session", {})
            
            # Debug: mostrar estrutura da resposta
            print(f"   Resposta contém 'user': {bool(user)}")
            print(f"   Resposta contém 'session': {bool(session)}")
            if not user or not session:
                print(f"   Estrutura completa da resposta: {json.dumps(data, indent=2)[:500]}")
            
            if user and session:
                print("✅ Login bem-sucedido no Supabase Auth!")
                print(f"   User ID: {user.get('id')}")
                print(f"   Email: {user.get('email')}")
                print(f"   Email confirmado: {user.get('email_confirmed_at') is not None}")
                
                # Verificar metadados
                user_metadata = user.get("user_metadata", {})
                app_metadata = user.get("app_metadata", {})
                
                print(f"   User Metadata tenant_id: {user_metadata.get('tenant_id')}")
                print(f"   App Metadata tenant_id: {app_metadata.get('tenant_id')}")
                print(f"   App Metadata role: {app_metadata.get('role')}")
                
                # Verificar se o tenant_id está correto
                metadata_tenant_id = user_metadata.get('tenant_id') or app_metadata.get('tenant_id')
                if metadata_tenant_id == TENANT_ID:
                    print(f"   ✅ tenant_id nos metadados está correto!")
                else:
                    print(f"   ⚠️  tenant_id nos metadados ({metadata_tenant_id}) não corresponde ao esperado ({TENANT_ID})")
                
                access_token = session.get("access_token", "")
                if access_token:
                    print(f"   Access Token: {access_token[:50]}...")
                print()
                return True
            else:
                print("❌ Login falhou - resposta inválida")
                print(f"   Estrutura da resposta recebida:")
                print(f"   {json.dumps(data, indent=2)[:800]}")
                return False
        else:
            error_data = response.json() if response.content else {}
            error_msg = error_data.get('error_description') or error_data.get('error') or f"Status {response.status_code}"
            print(f"❌ Erro ao fazer login: {error_msg}")
            
            # Analisar tipo de erro
            if "Invalid login credentials" in error_msg or "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
                print()
                print("🔍 DIAGNÓSTICO:")
                print("   → A senha pode estar incorreta no Supabase Auth")
                print("   → Ou o usuário não existe no auth.users")
                print()
                print("💡 SOLUÇÃO:")
                print("   1. Verifique se o usuário existe no Supabase Dashboard")
                print("   2. Se existir, redefina a senha no Dashboard")
                print("   3. Ou execute: python3 scripts/fix_user_login.py")
            elif "email" in error_msg.lower() and ("confirm" in error_msg.lower() or "unconfirmed" in error_msg.lower()):
                print()
                print("🔍 DIAGNÓSTICO:")
                print("   → O email não está confirmado")
                print()
                print("💡 SOLUÇÃO:")
                print("   1. Acesse o Supabase Dashboard")
                print("   2. Vá em Authentication > Users")
                print("   3. Confirme o email do usuário")
            else:
                print()
                print("🔍 DIAGNÓSTICO:")
                print("   → Erro desconhecido na autenticação")
                print()
                print("💡 SOLUÇÃO:")
                print("   1. Verifique as variáveis de ambiente (SUPABASE_URL, SUPABASE_ANON_KEY)")
                print("   2. Verifique se o backend está rodando")
                print("   3. Execute: python3 scripts/fix_user_login.py")
            
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão: {e}")
        print()
        print("🔍 DIAGNÓSTICO:")
        print("   → Não foi possível conectar ao Supabase")
        print()
        print("💡 SOLUÇÃO:")
        print("   1. Verifique se SUPABASE_URL está correto")
        print("   2. Verifique sua conexão com a internet")
        return False
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Erro inesperado: {error_msg}")
        return False

def test_backend_login():
    """Testa o login via backend API"""
    
    print("=" * 70)
    print("🔐 TESTE DE LOGIN VIA BACKEND API")
    print("=" * 70)
    
    # Tentar obter URL do backend das variáveis de ambiente
    api_base_url = os.getenv("VITE_API_BASE_URL") or os.getenv("API_BASE_URL")
    api_login_url = os.getenv("VITE_API_LOGIN_URL") or os.getenv("API_LOGIN_URL")
    
    login_url = api_login_url or (f"{api_base_url}/auth/login" if api_base_url else None)
    
    if not login_url:
        print("⚠️  URL do backend não configurada nas variáveis de ambiente")
        print("   Configure VITE_API_BASE_URL ou VITE_API_LOGIN_URL")
        print()
        return False
    
    print(f"URL do backend: {login_url}")
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Tenant ID: {TENANT_ID}")
    print()
    
    try:
        payload = {
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD,
            "tenant_id": TENANT_ID
        }
        
        print("📋 Enviando requisição de login...")
        response = requests.post(login_url, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login bem-sucedido via backend!")
            print(f"   Access Token: {data.get('access_token', '')[:50]}...")
            print(f"   User ID: {data.get('usuario', {}).get('id')}")
            print(f"   Tenant ID: {data.get('usuario', {}).get('tenant_id')}")
            print()
            return True
        else:
            error_data = response.json() if response.content else {}
            error_msg = error_data.get('detail') or error_data.get('error') or f"Status {response.status_code}"
            print(f"❌ Login falhou: {error_msg}")
            print()
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar ao backend")
        print("   Verifique se o backend está rodando")
        print()
        return False
    except Exception as e:
        print(f"❌ Erro ao fazer login via backend: {e}")
        print()
        return False

def main():
    """Função principal"""
    
    print()
    print("=" * 70)
    print("🧪 TESTE COMPLETO DE LOGIN")
    print("=" * 70)
    print()
    
    # Teste 1: Login direto no Supabase
    print("📋 TESTE 1: Login direto no Supabase Auth")
    print("-" * 70)
    supabase_ok = test_supabase_login()
    print()
    
    # Teste 2: Login via backend
    print("📋 TESTE 2: Login via Backend API")
    print("-" * 70)
    backend_ok = test_backend_login()
    print()
    
    # Resumo
    print("=" * 70)
    print("📊 RESUMO DOS TESTES")
    print("=" * 70)
    print(f"Supabase Auth: {'✅ OK' if supabase_ok else '❌ FALHOU'}")
    print(f"Backend API: {'✅ OK' if backend_ok else '❌ FALHOU'}")
    print()
    
    if supabase_ok and backend_ok:
        print("✅ TUDO FUNCIONANDO! O login deve funcionar na aplicação.")
    elif supabase_ok and not backend_ok:
        print("⚠️  Supabase Auth OK, mas Backend com problemas")
        print("   → Verifique se o backend está rodando")
        print("   → Verifique as variáveis de ambiente do backend")
    elif not supabase_ok:
        print("❌ PROBLEMA NO SUPABASE AUTH")
        print("   → Execute: python3 scripts/fix_user_login.py")
        print("   → Ou verifique manualmente no Supabase Dashboard")
    
    print("=" * 70)
    print()

if __name__ == "__main__":
    main()
