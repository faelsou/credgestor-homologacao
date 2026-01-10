"""
CREDGESTOR - API REST
API completa com FastAPI para gestão de crédito multi-tenancy
"""

from datetime import date, datetime
from typing import List, Optional

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# Importação condicional do código legacy - só funciona se DATABASE_URL estiver configurada
try:
from .crud_operations import DatabaseConnection, obter_cruds

    LEGACY_AVAILABLE = True
except (ValueError, ImportError) as e:
    # Se DATABASE_URL não estiver configurada, o código legacy não estará disponível
    # Isso é esperado quando usando Supabase como banco principal
    LEGACY_AVAILABLE = False
    DatabaseConnection = None
    obter_cruds = None
    print(f"⚠️  Código legacy não disponível: {e}")
    print("   Isso é esperado quando usando Supabase como banco principal.")

app = FastAPI(
    title="Credgestor API",
    description="Sistema de Gestão de Crédito com Multi-tenancy",
    version="1.0.0",
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency para conexão com banco
def get_db():
    if not LEGACY_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Código legacy não disponível. DATABASE_URL não está configurada. "
            "Use as rotas do Supabase em /tenants/{tenant_id}/...",
        )
    db = DatabaseConnection()
    if not db.connect():
        raise HTTPException(
            status_code=500, detail="Erro ao conectar ao banco de dados"
        )
    try:
        yield db
    finally:
        db.disconnect()


# Dependency para obter tenant_id do header
def get_tenant_id(x_tenant_id: Optional[int] = Header(None)) -> int:
    if x_tenant_id is None:
        raise HTTPException(status_code=400, detail="Header X-Tenant-ID é obrigatório")
    return x_tenant_id


# ==================== SCHEMAS PYDANTIC ====================


# Tenant Schemas
class TenantCreate(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255)
    slug: str = Field(..., min_length=3, max_length=100)
    cnpj: Optional[str] = Field(None, max_length=18)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None


class TenantUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None
    ativo: Optional[bool] = None


# Usuario Schemas
class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    senha: str = Field(..., min_length=6)
    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    cargo: Optional[str] = Field(None, max_length=100)
    tipo_usuario: str = Field(default="user", pattern="^(admin|user|gestor)$")


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    cargo: Optional[str] = Field(None, max_length=100)
    tipo_usuario: Optional[str] = Field(None, pattern="^(admin|user|gestor)$")
    ativo: Optional[bool] = None


# Cliente Schemas
class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255)
    cpf_cnpj: str = Field(..., max_length=18)
    tipo_pessoa: str = Field(..., pattern="^(PF|PJ)$")
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=2)
    cep: Optional[str] = Field(None, max_length=10)
    data_nascimento: Optional[date] = None
    renda_mensal: Optional[float] = Field(None, ge=0)
    profissao: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    score_credito: Optional[int] = Field(None, ge=0, le=1000)


class ClienteUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    celular: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=2)
    cep: Optional[str] = Field(None, max_length=10)
    data_nascimento: Optional[date] = None
    renda_mensal: Optional[float] = Field(None, ge=0)
    profissao: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    score_credito: Optional[int] = Field(None, ge=0, le=1000)
    ativo: Optional[bool] = None


# Proposta Schemas
class PropostaCreate(BaseModel):
    cliente_id: int
    produto_id: int
    usuario_id: int
    numero_proposta: str
    valor_solicitado: float = Field(..., gt=0)
    valor_aprovado: Optional[float] = Field(None, gt=0)
    taxa_juros: Optional[float] = Field(None, ge=0, le=100)
    prazo: Optional[int] = Field(None, gt=0)
    valor_parcela: Optional[float] = Field(None, gt=0)
    data_primeira_parcela: Optional[date] = None
    status: Optional[str] = Field(default="em_analise")
    observacoes: Optional[str] = None


class PropostaUpdate(BaseModel):
    valor_aprovado: Optional[float] = Field(None, gt=0)
    taxa_juros: Optional[float] = Field(None, ge=0, le=100)
    prazo: Optional[int] = Field(None, gt=0)
    valor_parcela: Optional[float] = Field(None, gt=0)
    data_primeira_parcela: Optional[date] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None


class PropostaAprovar(BaseModel):
    valor_aprovado: float = Field(..., gt=0)
    taxa_juros: float = Field(..., ge=0, le=100)
    prazo: int = Field(..., gt=0)
    valor_parcela: float = Field(..., gt=0)


# ==================== ENDPOINTS - TENANTS ====================


@app.get("/api/tenants", tags=["Tenants"])
def listar_tenants(
    ativo: Optional[bool] = None, db: DatabaseConnection = Depends(get_db)
):
    """Lista todos os tenants"""
    cruds = obter_cruds(db)
    tenants = cruds["tenant"].list_all(ativo=ativo)
    return {"success": True, "data": tenants, "count": len(tenants)}


@app.get("/api/tenants/{tenant_id}", tags=["Tenants"])
def buscar_tenant(tenant_id: int, db: DatabaseConnection = Depends(get_db)):
    """Busca tenant por ID"""
    cruds = obter_cruds(db)
    tenant = cruds["tenant"].get_by_id(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return {"success": True, "data": tenant}


@app.post("/api/tenants", tags=["Tenants"], status_code=201)
def criar_tenant(tenant: TenantCreate, db: DatabaseConnection = Depends(get_db)):
    """Cria um novo tenant"""
    cruds = obter_cruds(db)
    novo_tenant = cruds["tenant"].create(
        nome=tenant.nome,
        slug=tenant.slug,
        cnpj=tenant.cnpj,
        email=tenant.email,
        telefone=tenant.telefone,
        endereco=tenant.endereco,
    )
    if not novo_tenant:
        raise HTTPException(status_code=400, detail="Erro ao criar tenant")
    return {
        "success": True,
        "data": novo_tenant,
        "message": "Tenant criado com sucesso",
    }


@app.put("/api/tenants/{tenant_id}", tags=["Tenants"])
def atualizar_tenant(
    tenant_id: int, tenant: TenantUpdate, db: DatabaseConnection = Depends(get_db)
):
    """Atualiza dados do tenant"""
    cruds = obter_cruds(db)
    tenant_atualizado = cruds["tenant"].update(
        tenant_id, **tenant.dict(exclude_unset=True)
    )
    if not tenant_atualizado:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return {
        "success": True,
        "data": tenant_atualizado,
        "message": "Tenant atualizado com sucesso",
    }


@app.delete("/api/tenants/{tenant_id}", tags=["Tenants"])
def deletar_tenant(tenant_id: int, db: DatabaseConnection = Depends(get_db)):
    """Desativa um tenant"""
    cruds = obter_cruds(db)
    sucesso = cruds["tenant"].delete(tenant_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return {"success": True, "message": "Tenant desativado com sucesso"}


# ==================== ENDPOINTS - USUARIOS ====================


@app.get("/api/usuarios", tags=["Usuários"])
def listar_usuarios(
    ativo: Optional[bool] = None,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Lista usuários do tenant"""
    cruds = obter_cruds(db)
    usuarios = cruds["usuario"].list_by_tenant(tenant_id, ativo=ativo)
    return {"success": True, "data": usuarios, "count": len(usuarios)}


@app.get("/api/usuarios/{usuario_id}", tags=["Usuários"])
def buscar_usuario(
    usuario_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Busca usuário por ID"""
    cruds = obter_cruds(db)
    usuario = cruds["usuario"].get_by_id(usuario_id, tenant_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"success": True, "data": usuario}


@app.post("/api/usuarios", tags=["Usuários"], status_code=201)
def criar_usuario(
    usuario: UsuarioCreate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Cria um novo usuário"""
    cruds = obter_cruds(db)
    # Aqui você deve fazer o hash da senha
    senha_hash = f"$2b$12${usuario.senha}_hashed"  # Exemplo simples

    novo_usuario = cruds["usuario"].create(
        tenant_id=tenant_id,
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=senha_hash,
        cpf=usuario.cpf,
        telefone=usuario.telefone,
        cargo=usuario.cargo,
        tipo_usuario=usuario.tipo_usuario,
    )
    if not novo_usuario:
        raise HTTPException(status_code=400, detail="Erro ao criar usuário")
    return {
        "success": True,
        "data": novo_usuario,
        "message": "Usuário criado com sucesso",
    }


@app.put("/api/usuarios/{usuario_id}", tags=["Usuários"])
def atualizar_usuario(
    usuario_id: int,
    usuario: UsuarioUpdate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Atualiza dados do usuário"""
    cruds = obter_cruds(db)
    usuario_atualizado = cruds["usuario"].update(
        usuario_id, tenant_id, **usuario.dict(exclude_unset=True)
    )
    if not usuario_atualizado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {
        "success": True,
        "data": usuario_atualizado,
        "message": "Usuário atualizado com sucesso",
    }


@app.delete("/api/usuarios/{usuario_id}", tags=["Usuários"])
def deletar_usuario(
    usuario_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Desativa um usuário"""
    cruds = obter_cruds(db)
    sucesso = cruds["usuario"].delete(usuario_id, tenant_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"success": True, "message": "Usuário desativado com sucesso"}


# ==================== ENDPOINTS - CLIENTES ====================


@app.get("/api/clientes", tags=["Clientes"])
def listar_clientes(
    ativo: Optional[bool] = None,
    tipo_pessoa: Optional[str] = None,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Lista clientes do tenant"""
    cruds = obter_cruds(db)
    clientes = cruds["cliente"].list_by_tenant(
        tenant_id, ativo=ativo, tipo_pessoa=tipo_pessoa
    )
    return {"success": True, "data": clientes, "count": len(clientes)}


@app.get("/api/clientes/buscar/{termo}", tags=["Clientes"])
def buscar_clientes(
    termo: str,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Busca clientes por nome, CPF/CNPJ ou email"""
    cruds = obter_cruds(db)
    clientes = cruds["cliente"].search(tenant_id, termo)
    return {"success": True, "data": clientes, "count": len(clientes)}


@app.get("/api/clientes/{cliente_id}", tags=["Clientes"])
def buscar_cliente(
    cliente_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Busca cliente por ID"""
    cruds = obter_cruds(db)
    cliente = cruds["cliente"].get_by_id(cliente_id, tenant_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"success": True, "data": cliente}


@app.post("/api/clientes", tags=["Clientes"], status_code=201)
def criar_cliente(
    cliente: ClienteCreate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Cria um novo cliente"""
    cruds = obter_cruds(db)
    novo_cliente = cruds["cliente"].create(
        tenant_id=tenant_id,
        nome=cliente.nome,
        cpf_cnpj=cliente.cpf_cnpj,
        tipo_pessoa=cliente.tipo_pessoa,
        **cliente.dict(exclude={"nome", "cpf_cnpj", "tipo_pessoa"}, exclude_unset=True),
    )
    if not novo_cliente:
        raise HTTPException(status_code=400, detail="Erro ao criar cliente")
    return {
        "success": True,
        "data": novo_cliente,
        "message": "Cliente criado com sucesso",
    }


@app.put("/api/clientes/{cliente_id}", tags=["Clientes"])
def atualizar_cliente(
    cliente_id: int,
    cliente: ClienteUpdate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Atualiza dados do cliente"""
    cruds = obter_cruds(db)
    cliente_atualizado = cruds["cliente"].update(
        cliente_id, tenant_id, **cliente.dict(exclude_unset=True)
    )
    if not cliente_atualizado:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {
        "success": True,
        "data": cliente_atualizado,
        "message": "Cliente atualizado com sucesso",
    }


@app.delete("/api/clientes/{cliente_id}", tags=["Clientes"])
def deletar_cliente(
    cliente_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Desativa um cliente"""
    cruds = obter_cruds(db)
    sucesso = cruds["cliente"].delete(cliente_id, tenant_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"success": True, "message": "Cliente desativado com sucesso"}


# ==================== ENDPOINTS - PROPOSTAS ====================


@app.get("/api/propostas", tags=["Propostas"])
def listar_propostas(
    status: Optional[str] = None,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Lista propostas do tenant"""
    cruds = obter_cruds(db)
    propostas = cruds["proposta"].list_by_tenant(tenant_id, status=status)
    return {"success": True, "data": propostas, "count": len(propostas)}


@app.get("/api/propostas/cliente/{cliente_id}", tags=["Propostas"])
def listar_propostas_cliente(
    cliente_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Lista propostas de um cliente"""
    cruds = obter_cruds(db)
    propostas = cruds["proposta"].list_by_cliente(cliente_id, tenant_id)
    return {"success": True, "data": propostas, "count": len(propostas)}


@app.get("/api/propostas/{proposta_id}", tags=["Propostas"])
def buscar_proposta(
    proposta_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Busca proposta por ID"""
    cruds = obter_cruds(db)
    proposta = cruds["proposta"].get_by_id(proposta_id, tenant_id)
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return {"success": True, "data": proposta}


@app.post("/api/propostas", tags=["Propostas"], status_code=201)
def criar_proposta(
    proposta: PropostaCreate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Cria uma nova proposta"""
    cruds = obter_cruds(db)
    nova_proposta = cruds["proposta"].create(tenant_id=tenant_id, **proposta.dict())
    if not nova_proposta:
        raise HTTPException(status_code=400, detail="Erro ao criar proposta")
    return {
        "success": True,
        "data": nova_proposta,
        "message": "Proposta criada com sucesso",
    }


@app.put("/api/propostas/{proposta_id}", tags=["Propostas"])
def atualizar_proposta(
    proposta_id: int,
    proposta: PropostaUpdate,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Atualiza dados da proposta"""
    cruds = obter_cruds(db)
    proposta_atualizada = cruds["proposta"].update(
        proposta_id, tenant_id, **proposta.dict(exclude_unset=True)
    )
    if not proposta_atualizada:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return {
        "success": True,
        "data": proposta_atualizada,
        "message": "Proposta atualizada com sucesso",
    }


@app.post("/api/propostas/{proposta_id}/aprovar", tags=["Propostas"])
def aprovar_proposta(
    proposta_id: int,
    dados: PropostaAprovar,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Aprova uma proposta e cria as parcelas"""
    cruds = obter_cruds(db)

    # Aprova a proposta
    proposta_aprovada = cruds["proposta"].aprovar(
        proposta_id,
        tenant_id,
        valor_aprovado=dados.valor_aprovado,
        taxa_juros=dados.taxa_juros,
        prazo=dados.prazo,
        valor_parcela=dados.valor_parcela,
    )

    if not proposta_aprovada:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    # Cria as parcelas
    sucesso = cruds["parcela"].create_parcelas_proposta(proposta_id, tenant_id)
    if not sucesso:
        raise HTTPException(status_code=400, detail="Erro ao criar parcelas")

    return {
        "success": True,
        "data": proposta_aprovada,
        "message": "Proposta aprovada e parcelas criadas com sucesso",
    }


@app.post("/api/propostas/{proposta_id}/rejeitar", tags=["Propostas"])
def rejeitar_proposta(
    proposta_id: int,
    observacoes: str,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Rejeita uma proposta"""
    cruds = obter_cruds(db)
    proposta_rejeitada = cruds["proposta"].rejeitar(proposta_id, tenant_id, observacoes)

    if not proposta_rejeitada:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    return {
        "success": True,
        "data": proposta_rejeitada,
        "message": "Proposta rejeitada",
    }


# ==================== ENDPOINTS - PARCELAS ====================


@app.get("/api/parcelas/proposta/{proposta_id}", tags=["Parcelas"])
def listar_parcelas_proposta(
    proposta_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Lista parcelas de uma proposta"""
    cruds = obter_cruds(db)
    parcelas = cruds["parcela"].list_by_proposta(proposta_id, tenant_id)
    return {"success": True, "data": parcelas, "count": len(parcelas)}


@app.get("/api/parcelas/vencidas", tags=["Parcelas"])
def listar_parcelas_vencidas(
    tenant_id: int = Depends(get_tenant_id), db: DatabaseConnection = Depends(get_db)
):
    """Lista parcelas vencidas"""
    cruds = obter_cruds(db)
    parcelas = cruds["parcela"].list_vencidas(tenant_id)
    return {"success": True, "data": parcelas, "count": len(parcelas)}


@app.post("/api/parcelas/{parcela_id}/pagar", tags=["Parcelas"])
def pagar_parcela(
    parcela_id: int,
    valor_pago: float,
    tenant_id: int = Depends(get_tenant_id),
    db: DatabaseConnection = Depends(get_db),
):
    """Registra pagamento de uma parcela"""
    cruds = obter_cruds(db)
    parcela_atualizada = cruds["parcela"].registrar_pagamento(
        parcela_id, tenant_id, valor_pago
    )

    if not parcela_atualizada:
        raise HTTPException(status_code=404, detail="Parcela não encontrada")

    return {
        "success": True,
        "data": parcela_atualizada,
        "message": "Pagamento registrado com sucesso",
    }


# ==================== ENDPOINT RAIZ ====================


@app.get("/", tags=["Info"])
def root():
    """Informações da API"""
    return {
        "api": "Credgestor API",
        "version": "1.0.0",
        "description": "Sistema de Gestão de Crédito com Multi-tenancy",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Info"])
def health_check():
    """Verifica saúde da API"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ==================== MAIN ====================

if __name__ == "__main__":
    print("=" * 70)
    print("CREDGESTOR API")
    print("=" * 70)
    print("Iniciando servidor...")
    print("Documentação: http://localhost:8000/docs")
    print("=" * 70)

    uvicorn.run(app, host="0.0.0.0", port=8000)
