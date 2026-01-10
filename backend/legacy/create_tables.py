"""
Script para criar tabelas multi-tenancy para o sistema Credgestor
Arquitetura: Multi-tenancy com schema compartilhado e tenant_id
"""

import os
from datetime import datetime

import psycopg2
from psycopg2 import sql

# Configuração de conexão - carrega de variáveis de ambiente
# Fallback para compatibilidade (NÃO RECOMENDADO em produção)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("POSTGRES_URL", None),  # Não usar valor padrão hardcoded por segurança
)

# Tornar DATABASE_URL opcional - não lançar erro se não estiver configurada
# Este script só será usado se DATABASE_URL estiver disponível
# Em produção com Supabase, esta variável não é necessária
if not DATABASE_URL:
    # Apenas avisar, não bloquear
    import warnings
    warnings.warn(
        "DATABASE_URL não está configurada. "
        "Este script não pode ser executado sem DATABASE_URL. "
        "Se estiver usando Supabase, use as migrações do Supabase em vez deste script."
    )


def create_connection():
    """Cria conexão com o banco de dados"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✓ Conexão estabelecida com sucesso!")
        return conn
    except Exception as e:
        print(f"✗ Erro ao conectar: {e}")
        return None


def create_tables(conn):
    """Cria todas as tabelas necessárias"""
    cursor = conn.cursor()

    try:
        # 1. Tabela de Tenants (Organizações/Empresas)
        print("\n[1/10] Criando tabela 'tenants'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tenants (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                cnpj VARCHAR(18) UNIQUE,
                email VARCHAR(255),
                telefone VARCHAR(20),
                endereco TEXT,
                ativo BOOLEAN DEFAULT TRUE,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                configuracoes JSONB DEFAULT '{}'::jsonb
            );
            
            CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
            CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON tenants(ativo);
        """
        )
        print("✓ Tabela 'tenants' criada!")

        # 2. Tabela de Usuários (com tenant_id)
        print("\n[2/10] Criando tabela 'usuarios'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                senha_hash VARCHAR(255) NOT NULL,
                cpf VARCHAR(14) UNIQUE,
                telefone VARCHAR(20),
                cargo VARCHAR(100),
                ativo BOOLEAN DEFAULT TRUE,
                tipo_usuario VARCHAR(50) DEFAULT 'user', -- admin, user, gestor
                ultimo_acesso TIMESTAMP,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, email)
            );
            
            CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
            CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(tenant_id, ativo);
        """
        )
        print("✓ Tabela 'usuarios' criada!")

        # 3. Tabela de Clientes
        print("\n[3/10] Criando tabela 'clientes'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                cpf_cnpj VARCHAR(18) UNIQUE NOT NULL,
                tipo_pessoa VARCHAR(10) NOT NULL, -- PF ou PJ
                email VARCHAR(255),
                telefone VARCHAR(20),
                celular VARCHAR(20),
                endereco TEXT,
                cidade VARCHAR(100),
                estado VARCHAR(2),
                cep VARCHAR(10),
                data_nascimento DATE,
                renda_mensal DECIMAL(15,2),
                profissao VARCHAR(100),
                observacoes TEXT,
                score_credito INTEGER,
                ativo BOOLEAN DEFAULT TRUE,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
            CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(tenant_id, ativo);
        """
        )
        print("✓ Tabela 'clientes' criada!")

        # 4. Tabela de Produtos Financeiros
        print("\n[4/10] Criando tabela 'produtos'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(50) NOT NULL, -- credito_pessoal, consignado, imobiliario, veiculo, etc
                descricao TEXT,
                taxa_juros_min DECIMAL(5,2),
                taxa_juros_max DECIMAL(5,2),
                prazo_min INTEGER, -- em meses
                prazo_max INTEGER,
                valor_min DECIMAL(15,2),
                valor_max DECIMAL(15,2),
                requisitos JSONB,
                ativo BOOLEAN DEFAULT TRUE,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tenant_id, tipo);
            CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(tenant_id, ativo);
        """
        )
        print("✓ Tabela 'produtos' criada!")

        # 5. Tabela de Propostas/Contratos
        print("\n[5/10] Criando tabela 'propostas'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS propostas (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
                produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
                numero_proposta VARCHAR(50) UNIQUE NOT NULL,
                valor_solicitado DECIMAL(15,2) NOT NULL,
                valor_aprovado DECIMAL(15,2),
                taxa_juros DECIMAL(5,2),
                prazo INTEGER, -- em meses
                valor_parcela DECIMAL(15,2),
                data_primeira_parcela DATE,
                status VARCHAR(50) DEFAULT 'em_analise', -- em_analise, aprovado, reprovado, cancelado, concluido
                observacoes TEXT,
                documentos JSONB DEFAULT '[]'::jsonb,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_aprovacao TIMESTAMP,
                data_desembolso TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_propostas_tenant ON propostas(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON propostas(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(tenant_id, status);
            CREATE INDEX IF NOT EXISTS idx_propostas_numero ON propostas(numero_proposta);
        """
        )
        print("✓ Tabela 'propostas' criada!")

        # 6. Tabela de Parcelas
        print("\n[6/10] Criando tabela 'parcelas'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS parcelas (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                proposta_id INTEGER NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
                numero_parcela INTEGER NOT NULL,
                valor_parcela DECIMAL(15,2) NOT NULL,
                valor_pago DECIMAL(15,2) DEFAULT 0,
                data_vencimento DATE NOT NULL,
                data_pagamento DATE,
                status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, atrasado, cancelado
                dias_atraso INTEGER DEFAULT 0,
                juros_atraso DECIMAL(15,2) DEFAULT 0,
                multa DECIMAL(15,2) DEFAULT 0,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_parcelas_tenant ON parcelas(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_parcelas_proposta ON parcelas(proposta_id);
            CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(tenant_id, status);
            CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);
        """
        )
        print("✓ Tabela 'parcelas' criada!")

        # 7. Tabela de Pagamentos
        print("\n[7/10] Criando tabela 'pagamentos'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS pagamentos (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                parcela_id INTEGER NOT NULL REFERENCES parcelas(id) ON DELETE RESTRICT,
                valor_pago DECIMAL(15,2) NOT NULL,
                forma_pagamento VARCHAR(50), -- dinheiro, pix, boleto, cartao, transferencia
                data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                comprovante VARCHAR(255),
                observacoes TEXT,
                usuario_id INTEGER REFERENCES usuarios(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_pagamentos_tenant ON pagamentos(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela ON pagamentos(parcela_id);
        """
        )
        print("✓ Tabela 'pagamentos' criada!")

        # 8. Tabela de Documentos
        print("\n[8/10] Criando tabela 'documentos'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS documentos (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                entidade_tipo VARCHAR(50) NOT NULL, -- cliente, proposta, usuario
                entidade_id INTEGER NOT NULL,
                tipo_documento VARCHAR(100) NOT NULL,
                nome_arquivo VARCHAR(255) NOT NULL,
                caminho_arquivo VARCHAR(500) NOT NULL,
                tamanho_bytes BIGINT,
                mime_type VARCHAR(100),
                observacoes TEXT,
                data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_upload_id INTEGER REFERENCES usuarios(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_documentos_tenant ON documentos(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_documentos_entidade ON documentos(entidade_tipo, entidade_id);
        """
        )
        print("✓ Tabela 'documentos' criada!")

        # 9. Tabela de Auditoria/Logs
        print("\n[9/10] Criando tabela 'auditoria'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auditoria (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                usuario_id INTEGER REFERENCES usuarios(id),
                acao VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc
                tabela VARCHAR(100),
                registro_id INTEGER,
                dados_anteriores JSONB,
                dados_novos JSONB,
                ip_address VARCHAR(50),
                user_agent TEXT,
                data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_auditoria_tenant ON auditoria(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data_hora);
        """
        )
        print("✓ Tabela 'auditoria' criada!")

        # 10. Tabela de Comissões
        print("\n[10/10] Criando tabela 'comissoes'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS comissoes (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                proposta_id INTEGER NOT NULL REFERENCES propostas(id) ON DELETE RESTRICT,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
                percentual DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(15,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, cancelado
                data_pagamento TIMESTAMP,
                observacoes TEXT,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_comissoes_tenant ON comissoes(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_comissoes_usuario ON comissoes(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(tenant_id, status);
        """
        )
        print("✓ Tabela 'comissoes' criada!")

        conn.commit()
        print("\n✓ Todas as tabelas foram criadas com sucesso!")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Erro ao criar tabelas: {e}")
    finally:
        cursor.close()


def insert_sample_data(conn):
    """Insere dados de exemplo"""
    cursor = conn.cursor()

    try:
        print("\n\nInserindo dados de exemplo...")

        # Inserir tenant de exemplo
        print("\n[1/5] Inserindo tenant de exemplo...")
        cursor.execute(
            """
            INSERT INTO tenants (nome, slug, cnpj, email, telefone)
            VALUES ('Credgestor Demo', 'credgestor-demo', '12.345.678/0001-90', 'contato@credgestor.com.br', '(11) 98765-4321')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """
        )
        result = cursor.fetchone()
        tenant_id = result[0] if result else 1
        print(f"✓ Tenant criado com ID: {tenant_id}")

        # Inserir usuário admin
        print("\n[2/5] Inserindo usuário administrador...")
        cursor.execute(
            """
            INSERT INTO usuarios (tenant_id, nome, email, senha_hash, tipo_usuario, ativo)
            VALUES (%s, 'Administrador', 'admin@credgestor.com.br', '$2b$12$hash_example', 'admin', TRUE)
            ON CONFLICT (tenant_id, email) DO NOTHING
            RETURNING id;
        """,
            (tenant_id,),
        )
        result = cursor.fetchone()
        usuario_id = result[0] if result else 1
        print(f"✓ Usuário criado com ID: {usuario_id}")

        # Inserir cliente de exemplo
        print("\n[3/5] Inserindo cliente de exemplo...")
        cursor.execute(
            """
            INSERT INTO clientes (tenant_id, nome, cpf_cnpj, tipo_pessoa, email, telefone, renda_mensal)
            VALUES (%s, 'João Silva', '123.456.789-00', 'PF', 'joao.silva@email.com', '(11) 91234-5678', 5000.00)
            ON CONFLICT (cpf_cnpj) DO NOTHING
            RETURNING id;
        """,
            (tenant_id,),
        )
        result = cursor.fetchone()
        cliente_id = result[0] if result else 1
        print(f"✓ Cliente criado com ID: {cliente_id}")

        # Inserir produto financeiro
        print("\n[4/5] Inserindo produto financeiro...")
        cursor.execute(
            """
            INSERT INTO produtos (tenant_id, nome, tipo, descricao, taxa_juros_min, taxa_juros_max, prazo_min, prazo_max, valor_min, valor_max)
            VALUES (%s, 'Crédito Pessoal', 'credito_pessoal', 'Crédito pessoal com taxas competitivas', 1.99, 4.99, 12, 60, 1000.00, 50000.00)
            RETURNING id;
        """,
            (tenant_id,),
        )
        result = cursor.fetchone()
        produto_id = result[0] if result else 1
        print(f"✓ Produto criado com ID: {produto_id}")

        # Inserir proposta de exemplo
        print("\n[5/5] Inserindo proposta de exemplo...")
        cursor.execute(
            """
            INSERT INTO propostas (tenant_id, cliente_id, produto_id, usuario_id, numero_proposta, valor_solicitado, valor_aprovado, taxa_juros, prazo, valor_parcela, status)
            VALUES (%s, %s, %s, %s, 'PROP-2025-0001', 10000.00, 10000.00, 2.99, 24, 465.33, 'aprovado')
            RETURNING id;
        """,
            (tenant_id, cliente_id, produto_id, usuario_id),
        )
        result = cursor.fetchone()
        proposta_id = result[0] if result else 1
        print(f"✓ Proposta criada com ID: {proposta_id}")

        conn.commit()
        print("\n✓ Dados de exemplo inseridos com sucesso!")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Erro ao inserir dados de exemplo: {e}")
    finally:
        cursor.close()


if __name__ == "__main__":
    print("=" * 70)
    print("CREDGESTOR - Sistema de Gestão de Crédito")
    print("Criação de Tabelas Multi-Tenancy")
    print("=" * 70)

    conn = create_connection()
    if conn:
        create_tables(conn)
        insert_sample_data(conn)
        conn.close()
        print("\n" + "=" * 70)
        print("✓ Processo concluído!")
        print("=" * 70)
