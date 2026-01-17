#!/usr/bin/env python3
"""
Script para corrigir metadados na tabela public.users
usando tenant_users como fonte da verdade.
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

def corrigir_metadata_public_users():
    """Corrige metadata na tabela public.users usando tenant_users como fonte da verdade"""
    print("=" * 80)
    print("🔧 CORRIGINDO METADADOS NA TABELA public.users")
    print("=" * 80)
    
    try:
        # 1. Buscar todos os registros de tenant_users
        print("\n📋 1. Buscando dados de tenant_users...")
        tu_response = supabase.table("tenant_users").select("user_id, email, tenant_id, metadata").eq("ativo", True).execute()
        
        if not tu_response.data:
            print("⚠️  Nenhum registro encontrado em tenant_users")
            return
        
        print(f"   ✅ Encontrados {len(tu_response.data)} registros ativos")
        
        # 2. Para cada registro, atualizar public.users
        print("\n📋 2. Atualizando public.users...")
        correcoes = []
        erros = []
        
        for tu_row in tu_response.data:
            user_id = tu_row.get("user_id")
            email = tu_row.get("email")
            tenant_id = tu_row.get("tenant_id")
            tu_metadata = tu_row.get("metadata", {})
            
            if not user_id:
                print(f"   ⚠️  Registro sem user_id: {email}")
                continue
            
            # Buscar registro em public.users
            try:
                user_response = supabase.table("users").select("id, metadata").eq("id", user_id).execute()
                
                if not user_response.data:
                    print(f"   ⚠️  Usuário {user_id} ({email}) não encontrado em public.users")
                    continue
                
                user = user_response.data[0]
                current_metadata = user.get("metadata", {})
                current_tenant_id = current_metadata.get("tenant_id")
                
                # Verificar se precisa corrigir
                if current_tenant_id != tenant_id:
                    print(f"\n   🔧 Corrigindo usuário: {email}")
                    print(f"      User ID: {user_id}")
                    print(f"      Tenant ID atual (metadata): {current_tenant_id}")
                    print(f"      Tenant ID correto (tenant_users): {tenant_id}")
                    
                    # Atualizar metadata mantendo outros campos
                    new_metadata = current_metadata.copy()
                    new_metadata["tenant_id"] = tenant_id
                    
                    # Preservar outros campos importantes
                    if "name" not in new_metadata and "name" in tu_metadata:
                        new_metadata["name"] = tu_metadata["name"]
                    if "role" not in new_metadata and "role" in tu_metadata:
                        new_metadata["role"] = tu_metadata["role"]
                    
                    # Atualizar no banco
                    update_response = supabase.table("users").update({
                        "metadata": new_metadata
                    }).eq("id", user_id).execute()
                    
                    if update_response.data:
                        correcoes.append({
                            "email": email,
                            "user_id": user_id,
                            "tenant_id_antigo": current_tenant_id,
                            "tenant_id_novo": tenant_id
                        })
                        print(f"      ✅ Metadata atualizado com sucesso")
                    else:
                        erros.append({
                            "email": email,
                            "user_id": user_id,
                            "erro": "Falha ao atualizar"
                        })
                        print(f"      ❌ Erro ao atualizar")
                else:
                    print(f"   ✅ Usuário {email} já está correto (tenant_id: {tenant_id})")
                    
            except Exception as e:
                erros.append({
                    "email": email,
                    "user_id": user_id,
                    "erro": str(e)
                })
                print(f"   ❌ Erro ao processar {email}: {e}")
        
        # 3. Resumo
        print("\n" + "=" * 80)
        print("📊 RESUMO DA CORREÇÃO")
        print("=" * 80)
        print(f"\n✅ Correções realizadas: {len(correcoes)}")
        if correcoes:
            print("\n   Correções:")
            for corr in correcoes:
                print(f"      - {corr['email']}: {corr['tenant_id_antigo']} → {corr['tenant_id_novo']}")
        
        print(f"\n❌ Erros: {len(erros)}")
        if erros:
            print("\n   Erros:")
            for err in erros:
                print(f"      - {err['email']}: {err['erro']}")
        
        return len(correcoes) > 0
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        import traceback
        traceback.print_exc()
        return False

def verificar_consistencia_final():
    """Verifica se todos os metadados estão consistentes"""
    print("\n" + "=" * 80)
    print("🔍 VERIFICAÇÃO FINAL DE CONSISTÊNCIA")
    print("=" * 80)
    
    try:
        # Buscar todos os tenant_users
        tu_response = supabase.table("tenant_users").select("user_id, email, tenant_id").eq("ativo", True).execute()
        
        inconsistencias = []
        
        for tu_row in tu_response.data:
            user_id = tu_row.get("user_id")
            email = tu_row.get("email")
            tenant_id_tu = tu_row.get("tenant_id")
            
            if not user_id:
                continue
            
            # Buscar em public.users
            user_response = supabase.table("users").select("id, metadata").eq("id", user_id).execute()
            
            if user_response.data:
                user = user_response.data[0]
                metadata = user.get("metadata", {})
                tenant_id_metadata = metadata.get("tenant_id")
                
                if tenant_id_metadata != tenant_id_tu:
                    inconsistencias.append({
                        "email": email,
                        "tenant_id_tenant_users": tenant_id_tu,
                        "tenant_id_metadata": tenant_id_metadata
                    })
        
        if inconsistencias:
            print(f"\n⚠️  {len(inconsistencias)} inconsistência(s) encontrada(s):")
            for inc in inconsistencias:
                print(f"   - {inc['email']}: tenant_users={inc['tenant_id_tenant_users']}, metadata={inc['tenant_id_metadata']}")
        else:
            print("\n✅ Todos os metadados estão consistentes!")
        
    except Exception as e:
        print(f"❌ Erro na verificação: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n" + "=" * 80)
    print("🔧 CORREÇÃO DE METADADOS EM public.users")
    print("=" * 80)
    
    corrigido = corrigir_metadata_public_users()
    verificar_consistencia_final()
    
    print("\n" + "=" * 80)
    if corrigido:
        print("✅ Correção concluída com sucesso!")
    else:
        print("ℹ️  Nenhuma correção necessária ou erro ocorreu")
    print("=" * 80)

if __name__ == "__main__":
    main()
