#!/usr/bin/env python3
"""
Script de Migração: Garantir que cada usuário tenha seu próprio tenant

REGRA IMPORTANTE: Cada usuário deve ter sua própria aplicação separadamente.

Este script:
1. Identifica usuários que compartilham o mesmo tenant
2. Cria um novo tenant exclusivo para cada usuário que não tem seu próprio tenant
3. Atualiza os metadados do usuário no Supabase Auth
4. Atualiza os registros em public.users e public.tenant_users
5. Move os dados do usuário para o novo tenant (se necessário)

⚠️ IMPORTANTE: Execute este script com cuidado e faça backup antes!
"""

import os
import sys
import uuid
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from collections import defaultdict

# Carrega variáveis do .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
    sys.exit(1)

def get_users_with_tenants(supabase: Client):
    """Obtém todos os usuários e seus tenants atuais"""
    try:
        # Busca todos os vínculos usuário-tenant (sem join automático)
        result = supabase.table("tenant_users").select("*").execute()
        
        users_data = []
        for tu in result.data:
            tenant_id = tu.get('tenant_id')
            user_id = tu.get('user_id')
            email = tu.get('email')
            
            # Buscar nome do tenant separadamente
            tenant_name = None
            if tenant_id:
                try:
                    tenant_result = supabase.table("tenants").select("name").eq("id", tenant_id).execute()
                    if tenant_result.data:
                        tenant_name = tenant_result.data[0].get('name')
                except:
                    pass
            
            # Buscar nome do usuário separadamente
            user_name = email.split('@')[0] if email else 'Usuário'
            if user_id:
                try:
                    user_result = supabase.table("users").select("name").eq("id", user_id).execute()
                    if user_result.data and user_result.data[0].get('name'):
                        user_name = user_result.data[0].get('name')
                except:
                    pass
            
            users_data.append({
                'tenant_user_id': tu.get('id'),
                'tenant_id': tenant_id,
                'user_id': user_id,
                'email': email,
                'role': tu.get('role'),
                'ativo': tu.get('ativo'),
                'tenant_name': tenant_name,
                'user_name': user_name,
            })
        
        return users_data
    except Exception as e:
        print(f"❌ Erro ao buscar usuários: {e}")
        return []

def identify_shared_tenants(users_data):
    """Identifica tenants que são compartilhados por múltiplos usuários"""
    tenant_users_map = defaultdict(list)
    
    for user in users_data:
        tenant_id = user.get('tenant_id')
        if tenant_id:
            tenant_users_map[tenant_id].append(user)
    
    shared_tenants = {}
    for tenant_id, users in tenant_users_map.items():
        if len(users) > 1:
            shared_tenants[tenant_id] = users
    
    return shared_tenants

def create_unique_tenant_for_user(supabase: Client, user_email: str, user_name: str):
    """Cria um novo tenant exclusivo para um usuário"""
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
            return {
                'id': result.data[0]['id'],
                'name': tenant_name,
                'slug': slug
            }
        return None
    except Exception as e:
        print(f"❌ Erro ao criar tenant: {e}")
        return None

def update_auth_user_metadata(user_id: str, tenant_id: str, name: str, role: str):
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
            "tenant_id": tenant_id,
            "role": role
        }
    }
    
    try:
        response = requests.put(url, json=payload, headers=headers)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"⚠️  Erro ao atualizar metadados do Auth: {e}")
        return False

def update_tenant_user_link(supabase: Client, tenant_user_id: str, new_tenant_id: str):
    """Atualiza o vínculo usuário-tenant"""
    try:
        result = supabase.table("tenant_users").update({
            "tenant_id": new_tenant_id,
            "updated_at": datetime.now().isoformat()
        }).eq("id", tenant_user_id).execute()
        
        return result.data is not None
    except Exception as e:
        print(f"❌ Erro ao atualizar vínculo: {e}")
        return False

def update_public_user_metadata(supabase: Client, user_id: str, tenant_id: str):
    """Atualiza os metadados do usuário em public.users"""
    try:
        # Busca o usuário atual
        user_result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            return False
        
        user_data = user_result.data[0]
        metadata = user_data.get('metadata', {})
        if isinstance(metadata, str):
            import json
            metadata = json.loads(metadata) if metadata else {}
        
        metadata['tenant_id'] = tenant_id
        
        result = supabase.table("users").update({
            "metadata": metadata,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        return result.data is not None
    except Exception as e:
        print(f"❌ Erro ao atualizar public.users: {e}")
        return False

def migrate_user_to_unique_tenant(supabase: Client, user_data: dict, dry_run: bool = False):
    """Migra um usuário para seu próprio tenant exclusivo"""
    email = user_data.get('email')
    user_id = user_data.get('user_id')
    user_name = user_data.get('user_name', email.split('@')[0])
    role = user_data.get('role', 'admin')
    tenant_user_id = user_data.get('tenant_user_id')
    current_tenant_id = user_data.get('tenant_id')
    
    print(f"\n📋 Migrando usuário: {email}")
    print(f"   Tenant atual: {current_tenant_id}")
    
    if dry_run:
        print(f"   [DRY RUN] Criaria novo tenant para: {user_name}")
        return True
    
    # Cria novo tenant exclusivo
    new_tenant = create_unique_tenant_for_user(supabase, email, user_name)
    if not new_tenant:
        print(f"   ❌ Falha ao criar novo tenant")
        return False
    
    new_tenant_id = new_tenant['id']
    print(f"   ✅ Novo tenant criado: {new_tenant['name']} ({new_tenant_id})")
    
    # Atualiza metadados no Auth
    if user_id:
        if update_auth_user_metadata(user_id, new_tenant_id, user_name, role):
            print(f"   ✅ Metadados do Auth atualizados")
        else:
            print(f"   ⚠️  Falha ao atualizar metadados do Auth (continuando...)")
    
    # Atualiza vínculo em tenant_users
    if update_tenant_user_link(supabase, tenant_user_id, new_tenant_id):
        print(f"   ✅ Vínculo tenant_users atualizado")
    else:
        print(f"   ❌ Falha ao atualizar vínculo")
        return False
    
    # Atualiza metadados em public.users
    if user_id:
        if update_public_user_metadata(supabase, user_id, new_tenant_id):
            print(f"   ✅ Metadados em public.users atualizados")
    
    print(f"   ✅ Migração concluída para {email}")
    return True

def main():
    """Função principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrar usuários para tenants únicos')
    parser.add_argument('--dry-run', action='store_true', help='Apenas simular, não fazer alterações')
    parser.add_argument('--force', action='store_true', help='Forçar migração mesmo se já tiver tenant único')
    args = parser.parse_args()
    
    print("=" * 70)
    print("🔧 MIGRAÇÃO: Garantir Tenant Único para Cada Usuário")
    print("=" * 70)
    print(f"Modo: {'DRY RUN (simulação)' if args.dry_run else 'EXECUÇÃO REAL'}")
    print()
    
    if not args.dry_run:
        resposta = input("⚠️  ATENÇÃO: Isso irá modificar dados no banco. Continuar? (sim/não): ")
        if resposta.lower() not in ['sim', 's', 'yes', 'y']:
            print("❌ Operação cancelada pelo usuário")
            sys.exit(0)
    
    # Inicializa cliente Supabase
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    # 1. Buscar todos os usuários
    print("📋 Passo 1: Buscando usuários existentes...")
    users_data = get_users_with_tenants(supabase)
    
    if not users_data:
        print("❌ Nenhum usuário encontrado")
        sys.exit(1)
    
    print(f"✅ Encontrados {len(users_data)} vínculos usuário-tenant")
    print()
    
    # 2. Identificar tenants compartilhados
    print("📋 Passo 2: Identificando tenants compartilhados...")
    shared_tenants = identify_shared_tenants(users_data)
    
    if shared_tenants:
        print(f"⚠️  Encontrados {len(shared_tenants)} tenants compartilhados:")
        for tenant_id, users in shared_tenants.items():
            print(f"   Tenant {tenant_id}: {len(users)} usuários")
            for user in users:
                print(f"      - {user.get('email')} ({user.get('user_name')})")
    else:
        print("✅ Nenhum tenant compartilhado encontrado")
    
    print()
    
    # 3. Migrar usuários
    if shared_tenants or args.force:
        print("📋 Passo 3: Migrando usuários para tenants únicos...")
        
        users_to_migrate = []
        if args.force:
            # Se --force, migra todos os usuários
            users_to_migrate = users_data
        else:
            # Migra apenas usuários que compartilham tenant
            for tenant_id, users in shared_tenants.items():
                # Mantém o primeiro usuário no tenant original, migra os demais
                for user in users[1:]:
                    users_to_migrate.append(user)
        
        if not users_to_migrate:
            print("✅ Nenhum usuário precisa ser migrado")
        else:
            print(f"📋 Migrando {len(users_to_migrate)} usuário(s)...")
            
            success_count = 0
            fail_count = 0
            
            for user in users_to_migrate:
                if migrate_user_to_unique_tenant(supabase, user, args.dry_run):
                    success_count += 1
                else:
                    fail_count += 1
            
            print()
            print("=" * 70)
            print("📊 RESUMO DA MIGRAÇÃO")
            print("=" * 70)
            print(f"✅ Sucesso: {success_count}")
            print(f"❌ Falhas: {fail_count}")
            print(f"📋 Total: {len(users_to_migrate)}")
    else:
        print("✅ Todos os usuários já possuem tenants únicos!")
    
    print()
    print("=" * 70)
    print("🎉 MIGRAÇÃO CONCLUÍDA!")
    print("=" * 70)
    
    # 4. Verificação final
    if not args.dry_run:
        print()
        print("📋 Verificando resultado final...")
        final_users = get_users_with_tenants(supabase)
        final_shared = identify_shared_tenants(final_users)
        
        if final_shared:
            print(f"⚠️  Ainda existem {len(final_shared)} tenants compartilhados")
        else:
            print("✅ Todos os usuários agora possuem tenants únicos!")

if __name__ == "__main__":
    main()
