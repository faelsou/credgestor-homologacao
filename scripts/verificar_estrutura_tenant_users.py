#!/usr/bin/env python3
"""
Script para verificar a estrutura e dados da tabela tenant_users
e identificar problemas de isolamento de dados.
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def verificar_estrutura_tabela():
    """Verifica a estrutura da tabela tenant_users"""
    print("=" * 80)
    print("🔍 VERIFICANDO ESTRUTURA DA TABELA tenant_users")
    print("=" * 80)
    
    try:
        # Buscar todos os registros
        response = supabase.table("tenant_users").select("*").limit(10).execute()
        
        if response.data:
            print(f"\n✅ Tabela tenant_users encontrada com {len(response.data)} registros")
            print("\n📋 Colunas encontradas:")
            if response.data:
                for col in response.data[0].keys():
                    print(f"   - {col}")
            
            print("\n📊 DADOS DA TABELA tenant_users:")
            print("-" * 80)
            for i, row in enumerate(response.data, 1):
                print(f"\n🔹 Registro {i}:")
                for key, value in row.items():
                    if key == "metadata" and isinstance(value, dict):
                        print(f"   {key}: {value}")
                    else:
                        print(f"   {key}: {value}")
        else:
            print("⚠️  Tabela tenant_users está vazia")
            
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura: {e}")
        import traceback
        traceback.print_exc()

def verificar_emails_e_tenants():
    """Verifica emails e tenant_ids na tabela tenant_users"""
    print("\n" + "=" * 80)
    print("🔍 VERIFICANDO EMAILS E TENANT_IDS")
    print("=" * 80)
    
    try:
        # Buscar todos os registros com email e tenant_id
        response = supabase.table("tenant_users").select("id, email, tenant_id, ativo, metadata").execute()
        
        if not response.data:
            print("⚠️  Nenhum registro encontrado")
            return
        
        print(f"\n📊 Total de registros: {len(response.data)}")
        print("\n" + "-" * 80)
        
        # Agrupar por email
        emails_dict = {}
        for row in response.data:
            email = row.get("email")
            tenant_id = row.get("tenant_id")
            ativo = row.get("ativo", False)
            
            if email:
                if email not in emails_dict:
                    emails_dict[email] = []
                emails_dict[email].append({
                    "tenant_id": tenant_id,
                    "ativo": ativo,
                    "id": row.get("id")
                })
        
        print("\n📧 USUÁRIOS POR EMAIL:")
        for email, tenants in emails_dict.items():
            print(f"\n   📧 {email}:")
            for tenant_info in tenants:
                status = "✅ ATIVO" if tenant_info["ativo"] else "❌ INATIVO"
                print(f"      - Tenant ID: {tenant_info['tenant_id']} ({status})")
                print(f"        ID: {tenant_info['id']}")
            
            # Verificar se há múltiplos tenants ativos
            tenants_ativos = [t for t in tenants if t["ativo"]]
            if len(tenants_ativos) > 1:
                print(f"      ⚠️  ATENÇÃO: Usuário tem {len(tenants_ativos)} tenants ATIVOS!")
            elif len(tenants_ativos) == 0:
                print(f"      ⚠️  ATENÇÃO: Usuário não tem nenhum tenant ATIVO!")
        
        # Agrupar por tenant_id
        print("\n" + "-" * 80)
        print("\n🏢 TENANTS E SEUS USUÁRIOS:")
        tenants_dict = {}
        for row in response.data:
            tenant_id = row.get("tenant_id")
            email = row.get("email")
            ativo = row.get("ativo", False)
            
            if tenant_id:
                if tenant_id not in tenants_dict:
                    tenants_dict[tenant_id] = []
                tenants_dict[tenant_id].append({
                    "email": email,
                    "ativo": ativo,
                    "id": row.get("id")
                })
        
        for tenant_id, users in tenants_dict.items():
            users_ativos = [u for u in users if u["ativo"]]
            print(f"\n   🏢 Tenant: {tenant_id}")
            print(f"      Total de usuários: {len(users)} ({len(users_ativos)} ativos)")
            for user in users:
                status = "✅" if user["ativo"] else "❌"
                print(f"      {status} {user['email']} (ID: {user['id']})")
            
            # Verificar se há múltiplos usuários ativos no mesmo tenant
            if len(users_ativos) > 1:
                print(f"      ⚠️  ATENÇÃO: Tenant tem {len(users_ativos)} usuários ATIVOS!")
                print(f"      ⚠️  Isso viola a regra de isolamento de dados!")
        
    except Exception as e:
        print(f"❌ Erro ao verificar emails e tenants: {e}")
        import traceback
        traceback.print_exc()

def verificar_consistencia_com_tenants():
    """Verifica se os tenant_ids em tenant_users existem na tabela tenants"""
    print("\n" + "=" * 80)
    print("🔍 VERIFICANDO CONSISTÊNCIA COM TABELA tenants")
    print("=" * 80)
    
    try:
        # Buscar todos os tenants
        tenants_response = supabase.table("tenants").select("id, name, email").execute()
        tenants_dict = {t["id"]: t for t in tenants_response.data or []}
        
        # Buscar todos os tenant_users
        users_response = supabase.table("tenant_users").select("tenant_id, email").execute()
        
        print(f"\n📊 Tenants cadastrados: {len(tenants_dict)}")
        print(f"📊 Vínculos tenant_users: {len(users_response.data or [])}")
        
        # Verificar se todos os tenant_ids em tenant_users existem
        print("\n🔍 Verificando consistência...")
        problemas = []
        
        for row in users_response.data or []:
            tenant_id = row.get("tenant_id")
            email = row.get("email")
            
            if tenant_id not in tenants_dict:
                problemas.append({
                    "tipo": "tenant_id_inexistente",
                    "tenant_id": tenant_id,
                    "email": email
                })
                print(f"   ❌ Tenant ID {tenant_id} não existe na tabela tenants (usuário: {email})")
        
        if not problemas:
            print("   ✅ Todos os tenant_ids são válidos")
        else:
            print(f"\n⚠️  {len(problemas)} problema(s) encontrado(s)")
            
    except Exception as e:
        print(f"❌ Erro ao verificar consistência: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n" + "=" * 80)
    print("🔍 VERIFICAÇÃO COMPLETA DA TABELA tenant_users")
    print("=" * 80)
    
    verificar_estrutura_tabela()
    verificar_emails_e_tenants()
    verificar_consistencia_com_tenants()
    
    print("\n" + "=" * 80)
    print("✅ Verificação concluída")
    print("=" * 80)

if __name__ == "__main__":
    main()
