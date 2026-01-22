#!/usr/bin/env python3
"""
Script de teste para o Agente de IA de Vencimentos Diários
===========================================================

Este script permite testar o agente sem executar o envio real de mensagens.
"""

import os
import sys
from datetime import date, timedelta

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from scripts.ai_agent_vencimentos_diarios import (
    AgenteVencimentosDiarios,
    VencimentoInfo,
    TenantVencimentos
)


def testar_busca_parcelas():
    """Testa a busca de parcelas vencendo hoje"""
    print("=" * 60)
    print("🧪 TESTE 1: Buscar Parcelas Vencendo Hoje")
    print("=" * 60)
    
    agente = AgenteVencimentosDiarios()
    parcelas = agente.buscar_parcelas_vencendo_hoje()
    
    print(f"\n✅ Encontradas {len(parcelas)} parcelas")
    for parcela in parcelas[:5]:  # Mostrar apenas as 5 primeiras
        print(f"   • Parcela {parcela.get('number')} - Cliente: {parcela.get('client_name', 'N/A')} - Valor: R$ {parcela.get('amount', 0):,.2f}")
    
    return parcelas


def testar_processamento_por_tenant(parcelas):
    """Testa o processamento e agrupamento por tenant"""
    print("\n" + "=" * 60)
    print("🧪 TESTE 2: Processar Parcelas por Tenant")
    print("=" * 60)
    
    agente = AgenteVencimentosDiarios()
    tenant_vencimentos = agente.processar_parcelas_por_tenant(parcelas)
    
    print(f"\n✅ Processados {len(tenant_vencimentos)} tenants")
    for tenant_id, vencimentos in tenant_vencimentos.items():
        print(f"\n   🏢 Tenant: {vencimentos.tenant_name}")
        print(f"      • {vencimentos.total_parcelas} parcelas")
        print(f"      • R$ {vencimentos.total_valor:,.2f} em aberto")
    
    return tenant_vencimentos


def testar_busca_usuarios(tenant_id: str):
    """Testa a busca de usuários de um tenant"""
    print("\n" + "=" * 60)
    print(f"🧪 TESTE 3: Buscar Usuários do Tenant {tenant_id[:8]}...")
    print("=" * 60)
    
    agente = AgenteVencimentosDiarios()
    usuarios = agente.buscar_usuarios_tenant(tenant_id)
    
    print(f"\n✅ Encontrados {len(usuarios)} usuários")
    for usuario in usuarios:
        email = usuario.get('email', 'N/A')
        role = usuario.get('role', 'N/A')
        print(f"   • {email} ({role})")
    
    return usuarios


def testar_formatacao_mensagem():
    """Testa a formatação da mensagem"""
    print("\n" + "=" * 60)
    print("🧪 TESTE 4: Formatar Mensagem")
    print("=" * 60)
    
    # Criar dados de teste
    tenant_vencimentos = TenantVencimentos("test-tenant-id", "Empresa Teste")
    
    # Adicionar vencimentos de exemplo
    vencimento1 = VencimentoInfo({
        'id': 'test-1',
        'loan_id': 'loan-1',
        'client_id': 'client-1',
        'client_name': 'João Silva',
        'client_phone': '(11) 99999-9999',
        'client_email': 'joao@email.com',
        'number': 1,
        'amount': 1000.00,
        'amount_paid': 0,
        'due_date': date.today().isoformat(),
        'status': 'PENDING'
    })
    
    vencimento2 = VencimentoInfo({
        'id': 'test-2',
        'loan_id': 'loan-2',
        'client_id': 'client-2',
        'client_name': 'Maria Santos',
        'client_phone': '(11) 88888-8888',
        'client_email': 'maria@email.com',
        'number': 2,
        'amount': 1500.00,
        'amount_paid': 500.00,
        'due_date': date.today().isoformat(),
        'status': 'LATE'
    })
    
    tenant_vencimentos.add_vencimento(vencimento1)
    tenant_vencimentos.add_vencimento(vencimento2)
    
    agente = AgenteVencimentosDiarios()
    mensagem = agente.formatar_mensagem(tenant_vencimentos)
    
    print("\n📄 Mensagem formatada:")
    print("-" * 60)
    print(mensagem)
    print("-" * 60)
    
    return mensagem


def main():
    """Executa todos os testes"""
    print("\n" + "=" * 60)
    print("🧪 TESTES DO AGENTE DE IA - VENCIMENTOS DIÁRIOS")
    print("=" * 60)
    
    try:
        # Teste 1: Buscar parcelas
        parcelas = testar_busca_parcelas()
        
        if not parcelas:
            print("\n⚠️  Nenhuma parcela encontrada. Criando dados de teste...")
            testar_formatacao_mensagem()
            return
        
        # Teste 2: Processar por tenant
        tenant_vencimentos = testar_processamento_por_tenant(parcelas)
        
        if tenant_vencimentos:
            # Teste 3: Buscar usuários do primeiro tenant
            primeiro_tenant_id = list(tenant_vencimentos.keys())[0]
            usuarios = testar_busca_usuarios(primeiro_tenant_id)
            
            # Teste 4: Formatar mensagem
            primeiro_tenant = list(tenant_vencimentos.values())[0]
            agente = AgenteVencimentosDiarios()
            mensagem = agente.formatar_mensagem(primeiro_tenant)
            
            print("\n" + "=" * 60)
            print("📄 MENSAGEM DE EXEMPLO:")
            print("=" * 60)
            print(mensagem)
        
        print("\n" + "=" * 60)
        print("✅ Todos os testes concluídos!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Erro durante os testes: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
