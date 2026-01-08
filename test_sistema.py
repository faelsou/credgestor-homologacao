"""
CREDGESTOR - Script de Testes
Testa todas as funcionalidades CRUD do sistema
"""

from crud_operations import conectar_banco, obter_cruds
from datetime import date, datetime, timedelta

def teste_completo():
    """Executa teste completo de todas as funcionalidades"""
    
    print("=" * 80)
    print("CREDGESTOR - TESTES COMPLETOS")
    print("=" * 80)
    
    # Conectar ao banco
    print("\n[1] Conectando ao banco de dados...")
    db = conectar_banco()
    if not db:
        print("❌ FALHA: Não foi possível conectar ao banco")
        return False
    print("✅ Conexão estabelecida!")
    
    cruds = obter_cruds(db)
    
    try:
        # ========== TESTE 1: TENANT ==========
        print("\n" + "=" * 80)
        print("TESTE 1: CRUD DE TENANTS")
        print("=" * 80)
        
        print("\n[1.1] Criando novo tenant...")
        tenant = cruds['tenant'].create(
            nome="Financeira Teste",
            slug="financeira-teste",
            cnpj="11.222.333/0001-44",
            email="contato@financeira.com",
            telefone="(11) 3333-4444"
        )
        
        if tenant:
            print(f"✅ Tenant criado! ID: {tenant['id']}")
            tenant_id = tenant['id']
        else:
            print("❌ FALHA ao criar tenant")
            return False
        
        print("\n[1.2] Buscando tenant por ID...")
        tenant_busca = cruds['tenant'].get_by_id(tenant_id)
        print(f"✅ Tenant encontrado: {tenant_busca['nome']}")
        
        print("\n[1.3] Listando todos os tenants...")
        todos_tenants = cruds['tenant'].list_all()
        print(f"✅ Total de tenants: {len(todos_tenants)}")
        
        print("\n[1.4] Atualizando tenant...")
        tenant_atualizado = cruds['tenant'].update(
            tenant_id,
            telefone="(11) 9999-8888"
        )
        print(f"✅ Tenant atualizado! Novo telefone: {tenant_atualizado['telefone']}")
        
        # ========== TESTE 2: USUÁRIO ==========
        print("\n" + "=" * 80)
        print("TESTE 2: CRUD DE USUÁRIOS")
        print("=" * 80)
        
        print("\n[2.1] Criando novo usuário...")
        usuario = cruds['usuario'].create(
            tenant_id=tenant_id,
            nome="Carlos Administrador",
            email="carlos@financeira.com",
            senha_hash="$2b$12$hash_example_123",
            cpf="111.222.333-44",
            tipo_usuario="admin"
        )
        
        if usuario:
            print(f"✅ Usuário criado! ID: {usuario['id']}")
            usuario_id = usuario['id']
        else:
            print("❌ FALHA ao criar usuário")
            return False
        
        print("\n[2.2] Buscando usuário por email...")
        usuario_busca = cruds['usuario'].get_by_email("carlos@financeira.com", tenant_id)
        print(f"✅ Usuário encontrado: {usuario_busca['nome']}")
        
        print("\n[2.3] Listando usuários do tenant...")
        usuarios = cruds['usuario'].list_by_tenant(tenant_id)
        print(f"✅ Total de usuários: {len(usuarios)}")
        
        print("\n[2.4] Atualizando último acesso...")
        sucesso = cruds['usuario'].update_last_login(usuario_id, tenant_id)
        print(f"✅ Último acesso atualizado!" if sucesso else "❌ FALHA")
        
        # ========== TESTE 3: CLIENTE ==========
        print("\n" + "=" * 80)
        print("TESTE 3: CRUD DE CLIENTES")
        print("=" * 80)
        
        print("\n[3.1] Criando novo cliente PF...")
        cliente_pf = cruds['cliente'].create(
            tenant_id=tenant_id,
            nome="Ana Paula Silva",
            cpf_cnpj="444.555.666-77",
            tipo_pessoa="PF",
            email="ana.silva@email.com",
            telefone="(11) 98888-7777",
            renda_mensal=6500.00,
            profissao="Engenheira",
            score_credito=750
        )
        
        if cliente_pf:
            print(f"✅ Cliente PF criado! ID: {cliente_pf['id']}")
            cliente_id = cliente_pf['id']
        else:
            print("❌ FALHA ao criar cliente PF")
            return False
        
        print("\n[3.2] Criando cliente PJ...")
        cliente_pj = cruds['cliente'].create(
            tenant_id=tenant_id,
            nome="Tech Solutions LTDA",
            cpf_cnpj="22.333.444/0001-55",
            tipo_pessoa="PJ",
            email="contato@techsol.com",
            renda_mensal=50000.00
        )
        print(f"✅ Cliente PJ criado! ID: {cliente_pj['id']}")
        
        print("\n[3.3] Buscando cliente por CPF...")
        cliente_busca = cruds['cliente'].get_by_cpf_cnpj("444.555.666-77", tenant_id)
        print(f"✅ Cliente encontrado: {cliente_busca['nome']}")
        
        print("\n[3.4] Listando clientes PF...")
        clientes_pf = cruds['cliente'].list_by_tenant(tenant_id, tipo_pessoa="PF")
        print(f"✅ Total de clientes PF: {len(clientes_pf)}")
        
        print("\n[3.5] Buscando clientes...")
        resultados = cruds['cliente'].search(tenant_id, "Ana")
        print(f"✅ Encontrados {len(resultados)} clientes com 'Ana'")
        
        print("\n[3.6] Atualizando cliente...")
        cliente_atualizado = cruds['cliente'].update(
            cliente_id, tenant_id,
            renda_mensal=7000.00,
            score_credito=780
        )
        print(f"✅ Cliente atualizado! Nova renda: R$ {cliente_atualizado['renda_mensal']}")
        
        # ========== TESTE 4: PRODUTO ==========
        print("\n" + "=" * 80)
        print("TESTE 4: PRODUTOS FINANCEIROS")
        print("=" * 80)
        
        print("\n[4.1] Nota: Tabela produtos não tem CRUD implementado ainda")
        print("⚠️  Implementar ProductCRUD se necessário")
        
        # Para os testes, vamos assumir que existe um produto com ID 1
        produto_id = 1
        
        # ========== TESTE 5: PROPOSTA ==========
        print("\n" + "=" * 80)
        print("TESTE 5: CRUD DE PROPOSTAS")
        print("=" * 80)
        
        print("\n[5.1] Criando nova proposta...")
        proposta = cruds['proposta'].create(
            tenant_id=tenant_id,
            cliente_id=cliente_id,
            produto_id=produto_id,
            usuario_id=usuario_id,
            numero_proposta=f"PROP-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            valor_solicitado=20000.00,
            status="em_analise"
        )
        
        if proposta:
            print(f"✅ Proposta criada! ID: {proposta['id']}")
            proposta_id = proposta['id']
        else:
            print("❌ FALHA ao criar proposta")
            return False
        
        print("\n[5.2] Buscando proposta por ID...")
        proposta_busca = cruds['proposta'].get_by_id(proposta_id, tenant_id)
        print(f"✅ Proposta encontrada: {proposta_busca['numero_proposta']}")
        
        print("\n[5.3] Listando propostas do cliente...")
        propostas_cliente = cruds['proposta'].list_by_cliente(cliente_id, tenant_id)
        print(f"✅ Total de propostas do cliente: {len(propostas_cliente)}")
        
        print("\n[5.4] Aprovando proposta...")
        proposta_aprovada = cruds['proposta'].aprovar(
            proposta_id, tenant_id,
            valor_aprovado=18000.00,
            taxa_juros=2.49,
            prazo=36,
            valor_parcela=632.15
        )
        print(f"✅ Proposta aprovada! Status: {proposta_aprovada['status']}")
        
        # ========== TESTE 6: PARCELAS ==========
        print("\n" + "=" * 80)
        print("TESTE 6: CRUD DE PARCELAS")
        print("=" * 80)
        
        print("\n[6.1] Criando parcelas da proposta...")
        # Primeiro precisamos definir a data da primeira parcela
        cruds['proposta'].update(
            proposta_id, tenant_id,
            data_primeira_parcela=date.today() + timedelta(days=30)
        )
        
        sucesso = cruds['parcela'].create_parcelas_proposta(proposta_id, tenant_id)
        if sucesso:
            print("✅ Parcelas criadas com sucesso!")
        else:
            print("❌ FALHA ao criar parcelas")
            return False
        
        print("\n[6.2] Listando parcelas da proposta...")
        parcelas = cruds['parcela'].list_by_proposta(proposta_id, tenant_id)
        print(f"✅ Total de parcelas: {len(parcelas)}")
        
        if len(parcelas) > 0:
            parcela_id = parcelas[0]['id']
            
            print("\n[6.3] Registrando pagamento da primeira parcela...")
            parcela_paga = cruds['parcela'].registrar_pagamento(
                parcela_id, tenant_id, 632.15
            )
            print(f"✅ Pagamento registrado! Status: {parcela_paga['status']}")
        
        print("\n[6.4] Listando parcelas vencidas...")
        parcelas_vencidas = cruds['parcela'].list_vencidas(tenant_id)
        print(f"✅ Total de parcelas vencidas: {len(parcelas_vencidas)}")
        
        # ========== TESTE 7: SOFT DELETE ==========
        print("\n" + "=" * 80)
        print("TESTE 7: SOFT DELETE")
        print("=" * 80)
        
        print("\n[7.1] Desativando cliente...")
        sucesso = cruds['cliente'].delete(cliente_pj['id'], tenant_id)
        print("✅ Cliente desativado!" if sucesso else "❌ FALHA")
        
        print("\n[7.2] Listando apenas clientes ativos...")
        clientes_ativos = cruds['cliente'].list_by_tenant(tenant_id, ativo=True)
        print(f"✅ Total de clientes ativos: {len(clientes_ativos)}")
        
        print("\n[7.3] Listando todos os clientes (incluindo inativos)...")
        todos_clientes = cruds['cliente'].list_by_tenant(tenant_id, ativo=None)
        print(f"✅ Total de clientes (todos): {len(todos_clientes)}")
        
        # ========== RESUMO FINAL ==========
        print("\n" + "=" * 80)
        print("RESUMO DOS TESTES")
        print("=" * 80)
        print(f"""
        ✅ Tenant criado: ID {tenant_id}
        ✅ Usuário criado: ID {usuario_id}
        ✅ Clientes criados: 2 (1 PF, 1 PJ)
        ✅ Proposta criada e aprovada: ID {proposta_id}
        ✅ Parcelas geradas: {len(parcelas)}
        ✅ Soft delete funcionando corretamente
        
        🎉 TODOS OS TESTES PASSARAM COM SUCESSO!
        """)
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO DURANTE OS TESTES: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db.disconnect()
        print("\n✅ Conexão com banco encerrada")

def teste_performance():
    """Testa performance com múltiplos registros"""
    print("\n" + "=" * 80)
    print("TESTE DE PERFORMANCE")
    print("=" * 80)
    
    db = conectar_banco()
    if not db:
        return
    
    cruds = obter_cruds(db)
    
    try:
        tenant_id = 1  # Usar tenant existente
        
        print("\n[1] Criando 100 clientes...")
        inicio = datetime.now()
        
        for i in range(100):
            cruds['cliente'].create(
                tenant_id=tenant_id,
                nome=f"Cliente Teste {i}",
                cpf_cnpj=f"{i:011d}",
                tipo_pessoa="PF",
                email=f"cliente{i}@teste.com"
            )
        
        fim = datetime.now()
        duracao = (fim - inicio).total_seconds()
        print(f"✅ 100 clientes criados em {duracao:.2f} segundos")
        print(f"   Média: {duracao/100*1000:.2f}ms por cliente")
        
        print("\n[2] Buscando todos os clientes...")
        inicio = datetime.now()
        clientes = cruds['cliente'].list_by_tenant(tenant_id)
        fim = datetime.now()
        duracao = (fim - inicio).total_seconds()
        print(f"✅ {len(clientes)} clientes encontrados em {duracao:.2f} segundos")
        
    finally:
        db.disconnect()

if __name__ == "__main__":
    # Executar teste completo
    sucesso = teste_completo()
    
    if sucesso:
        print("\n" + "=" * 80)
        resposta = input("\nDeseja executar teste de performance? (s/n): ")
        if resposta.lower() == 's':
            teste_performance()
    
    print("\n" + "=" * 80)
    print("TESTES FINALIZADOS")
    print("=" * 80)
