#!/usr/bin/env python3
"""
Script de diagnóstico para testar conectividade com Supabase
"""

import os
import sys
import time
from datetime import datetime
from typing import Dict, Any

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Erro: Biblioteca supabase não instalada")
    print("   Execute: pip install supabase")
    sys.exit(1)


def test_connection(url: str, key: str, timeout: int = 10) -> Dict[str, Any]:
    """Testa conexão com Supabase"""
    result = {
        "success": False,
        "error": None,
        "response_time_ms": None,
        "timestamp": datetime.now().isoformat(),
    }
    
    try:
        start_time = time.time()
        client = create_client(url, key)
        
        # Testar uma query simples
        response = client.table("tenants").select("id").limit(1).execute()
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # em milissegundos
        
        result["success"] = True
        result["response_time_ms"] = round(response_time, 2)
        result["data_count"] = len(response.data) if response.data else 0
        
    except Exception as e:
        result["error"] = str(e)
        if hasattr(e, "code"):
            result["error_code"] = e.code
        if hasattr(e, "message"):
            result["error_message"] = e.message
    
    return result


def test_multiple_connections(url: str, key: str, count: int = 10) -> Dict[str, Any]:
    """Testa múltiplas conexões para verificar estabilidade"""
    results = []
    success_count = 0
    total_time = 0
    
    print(f"🔄 Testando {count} conexões...")
    
    for i in range(count):
        result = test_connection(url, key)
        results.append(result)
        
        if result["success"]:
            success_count += 1
            if result["response_time_ms"]:
                total_time += result["response_time_ms"]
        
        # Pequeno delay entre requisições
        time.sleep(0.5)
        
        if result["success"]:
            print(f"  ✅ Conexão {i+1}/{count}: {result['response_time_ms']}ms")
        else:
            print(f"  ❌ Conexão {i+1}/{count}: {result['error']}")
    
    avg_time = total_time / success_count if success_count > 0 else 0
    
    return {
        "total_tests": count,
        "success_count": success_count,
        "failure_count": count - success_count,
        "success_rate": (success_count / count) * 100,
        "avg_response_time_ms": round(avg_time, 2),
        "results": results,
    }


def main():
    """Função principal"""
    print("=" * 60)
    print("🔍 Diagnóstico de Conexão com Supabase")
    print("=" * 60)
    print()
    
    # Carregar variáveis de ambiente
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url:
        print("❌ Erro: SUPABASE_URL não configurada")
        print("   Defina a variável de ambiente SUPABASE_URL")
        sys.exit(1)
    
    if not supabase_key:
        print("❌ Erro: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY não configurada")
        print("   Defina uma das variáveis de ambiente")
        sys.exit(1)
    
    print(f"📍 Supabase URL: {supabase_url}")
    print(f"🔑 Usando: {'SERVICE_ROLE_KEY' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'ANON_KEY'}")
    print()
    
    # Teste único
    print("1️⃣ Teste de Conexão Única")
    print("-" * 60)
    result = test_connection(supabase_url, supabase_key)
    
    if result["success"]:
        print(f"✅ Conexão bem-sucedida!")
        print(f"   Tempo de resposta: {result['response_time_ms']}ms")
        print(f"   Registros retornados: {result.get('data_count', 0)}")
    else:
        print(f"❌ Falha na conexão!")
        print(f"   Erro: {result['error']}")
        if "error_code" in result:
            print(f"   Código: {result['error_code']}")
        sys.exit(1)
    
    print()
    
    # Teste múltiplo
    print("2️⃣ Teste de Múltiplas Conexões (Estabilidade)")
    print("-" * 60)
    multi_result = test_multiple_connections(supabase_url, supabase_key, count=10)
    
    print()
    print("📊 Resumo:")
    print(f"   Total de testes: {multi_result['total_tests']}")
    print(f"   Sucessos: {multi_result['success_count']}")
    print(f"   Falhas: {multi_result['failure_count']}")
    print(f"   Taxa de sucesso: {multi_result['success_rate']:.1f}%")
    print(f"   Tempo médio de resposta: {multi_result['avg_response_time_ms']}ms")
    
    print()
    print("=" * 60)
    
    if multi_result["success_rate"] < 100:
        print("⚠️  ATENÇÃO: Algumas conexões falharam!")
        print("   Verifique logs do Supabase e configurações de rede")
        sys.exit(1)
    elif multi_result["avg_response_time_ms"] > 1000:
        print("⚠️  ATENÇÃO: Tempo de resposta alto!")
        print("   Considere verificar latência de rede e performance do banco")
    else:
        print("✅ Todas as conexões foram bem-sucedidas!")
        print("   Sistema operando normalmente")


if __name__ == "__main__":
    main()
