"""
CREDGESTOR - CRUD Operations
Sistema completo de operações CRUD para todas as tabelas
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

# Carrega DATABASE_URL das variáveis de ambiente
# Fallback para compatibilidade (NÃO RECOMENDADO em produção)
# NOTA: Esta variável é opcional quando usando Supabase como banco principal
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("POSTGRES_URL", None),  # Não usar valor padrão hardcoded por segurança
)

# Tornar DATABASE_URL opcional - não lançar erro se não estiver configurada
# O código legacy só será usado se DATABASE_URL estiver disponível
# Em produção com Supabase, esta variável não é necessária
if not DATABASE_URL:
    # Apenas avisar, não bloquear - permite que a aplicação rode com Supabase
    import warnings
    warnings.warn(
        "DATABASE_URL não está configurada. "
        "O código legacy não estará disponível. "
        "Se estiver usando Supabase, isso é esperado e pode ser ignorado. "
        "Para usar o código legacy, defina DATABASE_URL ou POSTGRES_URL."
    )


class DatabaseConnection:
    """Gerenciador de conexão com o banco de dados"""

    def __init__(self, url: str = DATABASE_URL):
        self.url = url
        self.conn = None

    def connect(self):
        """Estabelece conexão com o banco"""
        try:
            self.conn = psycopg2.connect(self.url)
            return True
        except Exception as e:
            print(f"Erro ao conectar: {e}")
            return False

    def disconnect(self):
        """Fecha a conexão"""
        if self.conn:
            self.conn.close()

    def get_cursor(self):
        """Retorna cursor com resultados em formato de dicionário"""
        return self.conn.cursor(cursor_factory=RealDictCursor)


class TenantCRUD:
    """Operações CRUD para Tenants (Multi-tenancy)"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create(
        self,
        nome: str,
        slug: str,
        cnpj: Optional[str] = None,
        email: Optional[str] = None,
        telefone: Optional[str] = None,
        endereco: Optional[str] = None,
    ) -> Optional[Dict]:
        """Cria um novo tenant"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO tenants (nome, slug, cnpj, email, telefone, endereco)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *;
            """,
                (nome, slug, cnpj, email, telefone, endereco),
            )
            self.db.conn.commit()
            return dict(cursor.fetchone())
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao criar tenant: {e}")
            return None
        finally:
            cursor.close()

    def get_by_id(self, tenant_id: int) -> Optional[Dict]:
        """Busca tenant por ID"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute("SELECT * FROM tenants WHERE id = %s;", (tenant_id,))
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def get_by_slug(self, slug: str) -> Optional[Dict]:
        """Busca tenant por slug"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute("SELECT * FROM tenants WHERE slug = %s;", (slug,))
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def list_all(self, ativo: Optional[bool] = None) -> List[Dict]:
        """Lista todos os tenants"""
        cursor = self.db.get_cursor()
        try:
            if ativo is not None:
                cursor.execute(
                    "SELECT * FROM tenants WHERE ativo = %s ORDER BY nome;", (ativo,)
                )
            else:
                cursor.execute("SELECT * FROM tenants ORDER BY nome;")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def update(self, tenant_id: int, **kwargs) -> Optional[Dict]:
        """Atualiza dados do tenant"""
        cursor = self.db.get_cursor()
        try:
            # Campos permitidos para atualização
            allowed_fields = [
                "nome",
                "cnpj",
                "email",
                "telefone",
                "endereco",
                "ativo",
                "configuracoes",
            ]

            # Filtra apenas campos permitidos
            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

            if not updates:
                return self.get_by_id(tenant_id)

            # Adiciona data de atualização
            updates["data_atualizacao"] = datetime.now()

            # Monta query dinamicamente
            set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
            values = list(updates.values()) + [tenant_id]

            cursor.execute(
                f"""
                UPDATE tenants 
                SET {set_clause}
                WHERE id = %s
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao atualizar tenant: {e}")
            return None
        finally:
            cursor.close()

    def delete(self, tenant_id: int) -> bool:
        """Deleta um tenant (soft delete - marca como inativo)"""
        return self.update(tenant_id, ativo=False) is not None

    def hard_delete(self, tenant_id: int) -> bool:
        """Deleta permanentemente um tenant"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute("DELETE FROM tenants WHERE id = %s;", (tenant_id,))
            self.db.conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao deletar tenant: {e}")
            return False
        finally:
            cursor.close()


class UsuarioCRUD:
    """Operações CRUD para Usuários"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create(
        self,
        tenant_id: int,
        nome: str,
        email: str,
        senha_hash: str,
        cpf: Optional[str] = None,
        telefone: Optional[str] = None,
        cargo: Optional[str] = None,
        tipo_usuario: str = "user",
    ) -> Optional[Dict]:
        """Cria um novo usuário"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO usuarios (tenant_id, nome, email, senha_hash, cpf, telefone, cargo, tipo_usuario)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """,
                (
                    tenant_id,
                    nome,
                    email,
                    senha_hash,
                    cpf,
                    telefone,
                    cargo,
                    tipo_usuario,
                ),
            )
            self.db.conn.commit()
            return dict(cursor.fetchone())
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao criar usuário: {e}")
            return None
        finally:
            cursor.close()

    def get_by_id(self, usuario_id: int, tenant_id: int) -> Optional[Dict]:
        """Busca usuário por ID (com filtro de tenant)"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM usuarios 
                WHERE id = %s AND tenant_id = %s;
            """,
                (usuario_id, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def get_by_email(self, email: str, tenant_id: int) -> Optional[Dict]:
        """Busca usuário por email"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM usuarios 
                WHERE email = %s AND tenant_id = %s;
            """,
                (email, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def list_by_tenant(
        self, tenant_id: int, ativo: Optional[bool] = None
    ) -> List[Dict]:
        """Lista usuários de um tenant"""
        cursor = self.db.get_cursor()
        try:
            if ativo is not None:
                cursor.execute(
                    """
                    SELECT * FROM usuarios 
                    WHERE tenant_id = %s AND ativo = %s 
                    ORDER BY nome;
                """,
                    (tenant_id, ativo),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM usuarios 
                    WHERE tenant_id = %s 
                    ORDER BY nome;
                """,
                    (tenant_id,),
                )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def update(self, usuario_id: int, tenant_id: int, **kwargs) -> Optional[Dict]:
        """Atualiza dados do usuário"""
        cursor = self.db.get_cursor()
        try:
            allowed_fields = [
                "nome",
                "email",
                "cpf",
                "telefone",
                "cargo",
                "ativo",
                "tipo_usuario",
            ]
            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

            if not updates:
                return self.get_by_id(usuario_id, tenant_id)

            updates["data_atualizacao"] = datetime.now()
            set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
            values = list(updates.values()) + [usuario_id, tenant_id]

            cursor.execute(
                f"""
                UPDATE usuarios 
                SET {set_clause}
                WHERE id = %s AND tenant_id = %s
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao atualizar usuário: {e}")
            return None
        finally:
            cursor.close()

    def update_last_login(self, usuario_id: int, tenant_id: int) -> bool:
        """Atualiza último acesso do usuário"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                UPDATE usuarios 
                SET ultimo_acesso = CURRENT_TIMESTAMP
                WHERE id = %s AND tenant_id = %s;
            """,
                (usuario_id, tenant_id),
            )
            self.db.conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao atualizar último acesso: {e}")
            return False
        finally:
            cursor.close()

    def delete(self, usuario_id: int, tenant_id: int) -> bool:
        """Desativa um usuário"""
        return self.update(usuario_id, tenant_id, ativo=False) is not None


class ClienteCRUD:
    """Operações CRUD para Clientes"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create(
        self, tenant_id: int, nome: str, cpf_cnpj: str, tipo_pessoa: str, **kwargs
    ) -> Optional[Dict]:
        """Cria um novo cliente"""
        cursor = self.db.get_cursor()
        try:
            fields = ["tenant_id", "nome", "cpf_cnpj", "tipo_pessoa"]
            values = [tenant_id, nome, cpf_cnpj, tipo_pessoa]

            # Campos opcionais
            optional_fields = [
                "email",
                "telefone",
                "celular",
                "endereco",
                "cidade",
                "estado",
                "cep",
                "data_nascimento",
                "renda_mensal",
                "profissao",
                "observacoes",
                "score_credito",
            ]

            for field in optional_fields:
                if field in kwargs:
                    fields.append(field)
                    values.append(kwargs[field])

            placeholders = ", ".join(["%s"] * len(fields))
            fields_str = ", ".join(fields)

            cursor.execute(
                f"""
                INSERT INTO clientes ({fields_str})
                VALUES ({placeholders})
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            return dict(cursor.fetchone())
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao criar cliente: {e}")
            return None
        finally:
            cursor.close()

    def get_by_id(self, cliente_id: int, tenant_id: int) -> Optional[Dict]:
        """Busca cliente por ID"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM clientes 
                WHERE id = %s AND tenant_id = %s;
            """,
                (cliente_id, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def get_by_cpf_cnpj(self, cpf_cnpj: str, tenant_id: int) -> Optional[Dict]:
        """Busca cliente por CPF/CNPJ"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM clientes 
                WHERE cpf_cnpj = %s AND tenant_id = %s;
            """,
                (cpf_cnpj, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def list_by_tenant(
        self,
        tenant_id: int,
        ativo: Optional[bool] = None,
        tipo_pessoa: Optional[str] = None,
    ) -> List[Dict]:
        """Lista clientes de um tenant"""
        cursor = self.db.get_cursor()
        try:
            conditions = ["tenant_id = %s"]
            params = [tenant_id]

            if ativo is not None:
                conditions.append("ativo = %s")
                params.append(ativo)

            if tipo_pessoa:
                conditions.append("tipo_pessoa = %s")
                params.append(tipo_pessoa)

            where_clause = " AND ".join(conditions)

            cursor.execute(
                f"""
                SELECT * FROM clientes 
                WHERE {where_clause}
                ORDER BY nome;
            """,
                params,
            )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def search(self, tenant_id: int, termo: str) -> List[Dict]:
        """Busca clientes por nome, CPF/CNPJ ou email"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM clientes 
                WHERE tenant_id = %s 
                AND (
                    nome ILIKE %s OR 
                    cpf_cnpj ILIKE %s OR 
                    email ILIKE %s
                )
                ORDER BY nome;
            """,
                (tenant_id, f"%{termo}%", f"%{termo}%", f"%{termo}%"),
            )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def update(self, cliente_id: int, tenant_id: int, **kwargs) -> Optional[Dict]:
        """Atualiza dados do cliente"""
        cursor = self.db.get_cursor()
        try:
            allowed_fields = [
                "nome",
                "email",
                "telefone",
                "celular",
                "endereco",
                "cidade",
                "estado",
                "cep",
                "data_nascimento",
                "renda_mensal",
                "profissao",
                "observacoes",
                "score_credito",
                "ativo",
            ]

            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

            if not updates:
                return self.get_by_id(cliente_id, tenant_id)

            updates["data_atualizacao"] = datetime.now()
            set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
            values = list(updates.values()) + [cliente_id, tenant_id]

            cursor.execute(
                f"""
                UPDATE clientes 
                SET {set_clause}
                WHERE id = %s AND tenant_id = %s
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao atualizar cliente: {e}")
            return None
        finally:
            cursor.close()

    def delete(self, cliente_id: int, tenant_id: int) -> bool:
        """Desativa um cliente"""
        return self.update(cliente_id, tenant_id, ativo=False) is not None


class PropostaCRUD:
    """Operações CRUD para Propostas"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create(
        self,
        tenant_id: int,
        cliente_id: int,
        produto_id: int,
        usuario_id: int,
        numero_proposta: str,
        valor_solicitado: float,
        **kwargs,
    ) -> Optional[Dict]:
        """Cria uma nova proposta"""
        cursor = self.db.get_cursor()
        try:
            fields = [
                "tenant_id",
                "cliente_id",
                "produto_id",
                "usuario_id",
                "numero_proposta",
                "valor_solicitado",
            ]
            values = [
                tenant_id,
                cliente_id,
                produto_id,
                usuario_id,
                numero_proposta,
                valor_solicitado,
            ]

            optional_fields = [
                "valor_aprovado",
                "taxa_juros",
                "prazo",
                "valor_parcela",
                "data_primeira_parcela",
                "status",
                "observacoes",
            ]

            for field in optional_fields:
                if field in kwargs:
                    fields.append(field)
                    values.append(kwargs[field])

            placeholders = ", ".join(["%s"] * len(fields))
            fields_str = ", ".join(fields)

            cursor.execute(
                f"""
                INSERT INTO propostas ({fields_str})
                VALUES ({placeholders})
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            return dict(cursor.fetchone())
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao criar proposta: {e}")
            return None
        finally:
            cursor.close()

    def get_by_id(self, proposta_id: int, tenant_id: int) -> Optional[Dict]:
        """Busca proposta por ID"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT p.*, 
                       c.nome as cliente_nome,
                       pr.nome as produto_nome,
                       u.nome as usuario_nome
                FROM propostas p
                JOIN clientes c ON p.cliente_id = c.id
                JOIN produtos pr ON p.produto_id = pr.id
                JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.id = %s AND p.tenant_id = %s;
            """,
                (proposta_id, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def get_by_numero(self, numero_proposta: str, tenant_id: int) -> Optional[Dict]:
        """Busca proposta por número"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM propostas 
                WHERE numero_proposta = %s AND tenant_id = %s;
            """,
                (numero_proposta, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def list_by_tenant(
        self, tenant_id: int, status: Optional[str] = None
    ) -> List[Dict]:
        """Lista propostas de um tenant"""
        cursor = self.db.get_cursor()
        try:
            if status:
                cursor.execute(
                    """
                    SELECT p.*, 
                           c.nome as cliente_nome,
                           pr.nome as produto_nome
                    FROM propostas p
                    JOIN clientes c ON p.cliente_id = c.id
                    JOIN produtos pr ON p.produto_id = pr.id
                    WHERE p.tenant_id = %s AND p.status = %s
                    ORDER BY p.data_criacao DESC;
                """,
                    (tenant_id, status),
                )
            else:
                cursor.execute(
                    """
                    SELECT p.*, 
                           c.nome as cliente_nome,
                           pr.nome as produto_nome
                    FROM propostas p
                    JOIN clientes c ON p.cliente_id = c.id
                    JOIN produtos pr ON p.produto_id = pr.id
                    WHERE p.tenant_id = %s
                    ORDER BY p.data_criacao DESC;
                """,
                    (tenant_id,),
                )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def list_by_cliente(self, cliente_id: int, tenant_id: int) -> List[Dict]:
        """Lista propostas de um cliente"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT p.*, pr.nome as produto_nome
                FROM propostas p
                JOIN produtos pr ON p.produto_id = pr.id
                WHERE p.cliente_id = %s AND p.tenant_id = %s
                ORDER BY p.data_criacao DESC;
            """,
                (cliente_id, tenant_id),
            )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def update(self, proposta_id: int, tenant_id: int, **kwargs) -> Optional[Dict]:
        """Atualiza dados da proposta"""
        cursor = self.db.get_cursor()
        try:
            allowed_fields = [
                "valor_aprovado",
                "taxa_juros",
                "prazo",
                "valor_parcela",
                "data_primeira_parcela",
                "status",
                "observacoes",
            ]

            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

            if not updates:
                return self.get_by_id(proposta_id, tenant_id)

            updates["data_atualizacao"] = datetime.now()

            # Se status mudou para aprovado, marca data_aprovacao
            if "status" in updates and updates["status"] == "aprovado":
                updates["data_aprovacao"] = datetime.now()

            set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
            values = list(updates.values()) + [proposta_id, tenant_id]

            cursor.execute(
                f"""
                UPDATE propostas 
                SET {set_clause}
                WHERE id = %s AND tenant_id = %s
                RETURNING *;
            """,
                values,
            )

            self.db.conn.commit()
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao atualizar proposta: {e}")
            return None
        finally:
            cursor.close()

    def aprovar(
        self,
        proposta_id: int,
        tenant_id: int,
        valor_aprovado: float,
        taxa_juros: float,
        prazo: int,
        valor_parcela: float,
    ) -> Optional[Dict]:
        """Aprova uma proposta"""
        return self.update(
            proposta_id,
            tenant_id,
            status="aprovado",
            valor_aprovado=valor_aprovado,
            taxa_juros=taxa_juros,
            prazo=prazo,
            valor_parcela=valor_parcela,
        )

    def rejeitar(
        self, proposta_id: int, tenant_id: int, observacoes: str
    ) -> Optional[Dict]:
        """Rejeita uma proposta"""
        return self.update(
            proposta_id, tenant_id, status="reprovado", observacoes=observacoes
        )


class ParcelaCRUD:
    """Operações CRUD para Parcelas"""

    def __init__(self, db: DatabaseConnection):
        self.db = db

    def create_parcelas_proposta(self, proposta_id: int, tenant_id: int) -> bool:
        """Cria todas as parcelas de uma proposta aprovada"""
        cursor = self.db.get_cursor()
        try:
            # Busca dados da proposta
            cursor.execute(
                """
                SELECT prazo, valor_parcela, data_primeira_parcela
                FROM propostas
                WHERE id = %s AND tenant_id = %s;
            """,
                (proposta_id, tenant_id),
            )

            proposta = cursor.fetchone()
            if not proposta:
                return False

            prazo = proposta["prazo"]
            valor_parcela = proposta["valor_parcela"]
            data_primeira = proposta["data_primeira_parcela"]

            # Cria as parcelas
            for num in range(1, prazo + 1):
                cursor.execute(
                    """
                    INSERT INTO parcelas 
                    (tenant_id, proposta_id, numero_parcela, valor_parcela, data_vencimento)
                    VALUES (%s, %s, %s, %s, %s + INTERVAL '%s month');
                """,
                    (
                        tenant_id,
                        proposta_id,
                        num,
                        valor_parcela,
                        data_primeira,
                        num - 1,
                    ),
                )

            self.db.conn.commit()
            return True
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao criar parcelas: {e}")
            return False
        finally:
            cursor.close()

    def get_by_id(self, parcela_id: int, tenant_id: int) -> Optional[Dict]:
        """Busca parcela por ID"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM parcelas 
                WHERE id = %s AND tenant_id = %s;
            """,
                (parcela_id, tenant_id),
            )
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()

    def list_by_proposta(self, proposta_id: int, tenant_id: int) -> List[Dict]:
        """Lista parcelas de uma proposta"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM parcelas 
                WHERE proposta_id = %s AND tenant_id = %s
                ORDER BY numero_parcela;
            """,
                (proposta_id, tenant_id),
            )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def list_vencidas(self, tenant_id: int) -> List[Dict]:
        """Lista parcelas vencidas e não pagas"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                SELECT par.*, prop.numero_proposta, c.nome as cliente_nome
                FROM parcelas par
                JOIN propostas prop ON par.proposta_id = prop.id
                JOIN clientes c ON prop.cliente_id = c.id
                WHERE par.tenant_id = %s 
                AND par.status = 'pendente'
                AND par.data_vencimento < CURRENT_DATE
                ORDER BY par.data_vencimento;
            """,
                (tenant_id,),
            )

            return [dict(row) for row in cursor.fetchall()]
        finally:
            cursor.close()

    def registrar_pagamento(
        self, parcela_id: int, tenant_id: int, valor_pago: float
    ) -> Optional[Dict]:
        """Registra pagamento de uma parcela"""
        cursor = self.db.get_cursor()
        try:
            cursor.execute(
                """
                UPDATE parcelas 
                SET valor_pago = valor_pago + %s,
                    status = CASE 
                        WHEN valor_pago + %s >= valor_parcela THEN 'pago'
                        ELSE status
                    END,
                    data_pagamento = CASE 
                        WHEN valor_pago + %s >= valor_parcela THEN CURRENT_TIMESTAMP
                        ELSE data_pagamento
                    END,
                    data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = %s AND tenant_id = %s
                RETURNING *;
            """,
                (valor_pago, valor_pago, valor_pago, parcela_id, tenant_id),
            )

            self.db.conn.commit()
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            self.db.conn.rollback()
            print(f"Erro ao registrar pagamento: {e}")
            return None
        finally:
            cursor.close()


# Funções auxiliares para uso rápido


def conectar_banco():
    """Conecta ao banco e retorna instância da conexão"""
    db = DatabaseConnection()
    if db.connect():
        return db
    return None


def obter_cruds(db: DatabaseConnection):
    """Retorna todas as classes CRUD"""
    return {
        "tenant": TenantCRUD(db),
        "usuario": UsuarioCRUD(db),
        "cliente": ClienteCRUD(db),
        "proposta": PropostaCRUD(db),
        "parcela": ParcelaCRUD(db),
    }


# Exemplo de uso
if __name__ == "__main__":
    print("Iniciando teste de CRUD...")

    db = conectar_banco()
    if not db:
        print("Não foi possível conectar ao banco.")
        exit(1)

    cruds = obter_cruds(db)

    # Exemplo: Listar todos os tenants
    print("\n=== TENANTS ===")
    tenants = cruds["tenant"].list_all()
    for tenant in tenants:
        print(f"ID: {tenant['id']} | Nome: {tenant['nome']} | Slug: {tenant['slug']}")

    db.disconnect()
    print("\n✓ Teste concluído!")
