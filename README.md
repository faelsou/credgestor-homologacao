# CREDGESTOR - Sistema de Gestão de Crédito Multi-Tenancy

## 📋 Sobre o Projeto

Sistema completo de gestão de crédito com arquitetura multi-tenancy, permitindo que múltiplas empresas/organizações utilizem o mesmo sistema de forma isolada e segura.

## 🏗️ Arquitetura Multi-Tenancy

A aplicação utiliza a estratégia de **Schema Compartilhado com Tenant ID**, onde:

- Todas as organizações compartilham as mesmas tabelas
- Cada registro possui um `tenant_id` para isolamento dos dados
- Índices otimizados para queries filtradas por tenant
- Segurança garantida através de filtros automáticos nas queries

### Vantagens desta Arquitetura:
✅ Manutenção simplificada (um único schema)
✅ Menor custo de infraestrutura
✅ Facilita análises agregadas entre tenants
✅ Escalabilidade horizontal

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **tenants** - Organizações/Empresas
```sql
- id (PK)
- nome
- slug (unique)
- cnpj
- email
- telefone
- endereco
- ativo
- data_criacao
- data_atualizacao
- configuracoes (JSONB)
```

#### 2. **usuarios** - Usuários do Sistema
```sql
- id (PK)
- tenant_id (FK)
- nome
- email
- senha_hash
- cpf
- telefone
- cargo
- ativo
- tipo_usuario (admin, user, gestor)
- ultimo_acesso
```

#### 3. **clientes** - Clientes/Tomadores de Crédito
```sql
- id (PK)
- tenant_id (FK)
- nome
- cpf_cnpj
- tipo_pessoa (PF/PJ)
- email, telefone, celular
- endereco completo
- data_nascimento
- renda_mensal
- profissao
- score_credito
- ativo
```

#### 4. **produtos** - Produtos Financeiros
```sql
- id (PK)
- tenant_id (FK)
- nome
- tipo (credito_pessoal, consignado, etc)
- descricao
- taxa_juros_min/max
- prazo_min/max
- valor_min/max
- requisitos (JSONB)
- ativo
```

#### 5. **propostas** - Propostas/Contratos de Crédito
```sql
- id (PK)
- tenant_id (FK)
- cliente_id (FK)
- produto_id (FK)
- usuario_id (FK)
- numero_proposta
- valor_solicitado
- valor_aprovado
- taxa_juros
- prazo
- valor_parcela
- status (em_analise, aprovado, reprovado, etc)
- datas importantes
```

#### 6. **parcelas** - Parcelas dos Contratos
```sql
- id (PK)
- tenant_id (FK)
- proposta_id (FK)
- numero_parcela
- valor_parcela
- valor_pago
- data_vencimento
- data_pagamento
- status (pendente, pago, atrasado)
- juros_atraso, multa
```

#### 7. **pagamentos** - Registro de Pagamentos
```sql
- id (PK)
- tenant_id (FK)
- parcela_id (FK)
- valor_pago
- forma_pagamento
- data_pagamento
- comprovante
```

#### 8. **documentos** - Anexos e Documentos
```sql
- id (PK)
- tenant_id (FK)
- entidade_tipo (cliente, proposta, usuario)
- entidade_id
- tipo_documento
- nome_arquivo
- caminho_arquivo
```

#### 9. **auditoria** - Log de Auditoria
```sql
- id (PK)
- tenant_id (FK)
- usuario_id (FK)
- acao (CREATE, UPDATE, DELETE, LOGIN)
- tabela
- registro_id
- dados_anteriores (JSONB)
- dados_novos (JSONB)
- ip_address
```

#### 10. **comissoes** - Comissões dos Vendedores
```sql
- id (PK)
- tenant_id (FK)
- proposta_id (FK)
- usuario_id (FK)
- percentual
- valor_comissao
- status (pendente, pago)
```

## 🚀 Como Usar

### 1. Criando as Tabelas

```bash
python -m backend.legacy.create_tables
```

Este script irá:
- Conectar no banco PostgreSQL
- Criar todas as 10 tabelas
- Criar índices para otimização
- Inserir dados de exemplo

### 2. Usando o CRUD Diretamente

```python
from backend.legacy.crud_operations import conectar_banco, obter_cruds

# Conectar ao banco
db = conectar_banco()
cruds = obter_cruds(db)

# Criar um tenant
tenant = cruds['tenant'].create(
    nome="Minha Empresa",
    slug="minha-empresa",
    cnpj="12.345.678/0001-90",
    email="contato@empresa.com"
)

# Criar um cliente
cliente = cruds['cliente'].create(
    tenant_id=tenant['id'],
    nome="João Silva",
    cpf_cnpj="123.456.789-00",
    tipo_pessoa="PF",
    email="joao@email.com",
    renda_mensal=5000.00
)

# Listar clientes do tenant
clientes = cruds['cliente'].list_by_tenant(tenant['id'])

# Buscar cliente específico
cliente = cruds['cliente'].get_by_id(1, tenant['id'])

# Atualizar cliente
cruds['cliente'].update(1, tenant['id'], 
    telefone="(11) 98765-4321",
    renda_mensal=6000.00
)

# Desativar cliente
cruds['cliente'].delete(1, tenant['id'])

db.disconnect()
```

### 3. Usando a API REST

#### Instalar dependências:
```bash
pip install fastapi uvicorn --break-system-packages
```

#### Iniciar o servidor:
```bash
python -m backend.legacy.api_rest
```

A API estará disponível em `http://localhost:8000`

Documentação automática em:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

#### Exemplos de Requisições:

**Listar Tenants:**
```bash
curl -X GET "http://localhost:8000/api/tenants"
```

**Criar Cliente (precisa do header X-Tenant-ID):**
```bash
curl -X POST "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "cpf_cnpj": "987.654.321-00",
    "tipo_pessoa": "PF",
    "email": "maria@email.com",
    "renda_mensal": 4500.00
  }'
```

**Buscar Clientes:**
```bash
curl -X GET "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1"
```

**Criar Proposta:**
```bash
curl -X POST "http://localhost:8000/api/propostas" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "produto_id": 1,
    "usuario_id": 1,
    "numero_proposta": "PROP-2025-0002",
    "valor_solicitado": 15000.00,
    "status": "em_analise"
  }'
```

**Aprovar Proposta:**
```bash
curl -X POST "http://localhost:8000/api/propostas/1/aprovar" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_aprovado": 15000.00,
    "taxa_juros": 2.99,
    "prazo": 24,
    "valor_parcela": 698.50
  }'
```

**Listar Parcelas Vencidas:**
```bash
curl -X GET "http://localhost:8000/api/parcelas/vencidas" \
  -H "X-Tenant-ID: 1"
```

**Registrar Pagamento:**
```bash
curl -X POST "http://localhost:8000/api/parcelas/1/pagar?valor_pago=698.50" \
  -H "X-Tenant-ID: 1"
```

## 🔒 Segurança Multi-Tenancy

### Boas Práticas Implementadas:

1. **Isolamento de Dados**
   - Todas as queries incluem filtro por `tenant_id`
   - Índices compostos otimizam a performance
   - Foreign keys garantem integridade referencial

2. **Header X-Tenant-ID**
   - API requer header em todas as requisições
   - Validação automática do tenant
   - Previne acesso cruzado entre tenants

3. **Soft Delete**
   - Marcação de registros como inativos
   - Mantém histórico completo
   - Possibilita recuperação de dados

4. **Auditoria**
   - Log completo de todas as ações
   - Rastreabilidade de mudanças
   - Suporte a conformidade (LGPD, etc)

## 📦 Estrutura de Arquivos

```
credgestor/
├── backend/legacy/create_tables.py      # Script de criação das tabelas
├── backend/legacy/crud_operations.py    # Classes CRUD para todas as entidades
├── backend/legacy/api_rest.py           # API REST com FastAPI
├── README.md            # Esta documentação
└── requirements.txt     # Dependências do projeto
```

## 🔧 Configuração do Banco

### String de Conexão:
```
postgresql://postgres:KydFq3qOLj5kOi4V@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres
```

### Variáveis de Ambiente (Recomendado):
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

## 📈 Próximos Passos

### Funcionalidades Sugeridas:

1. **Autenticação e Autorização**
   - JWT tokens
   - Roles e permissões
   - OAuth2

2. **Relatórios e Dashboards**
   - Indicadores por tenant
   - Análise de inadimplência
   - Projeções financeiras

3. **Integrações**
   - Bureaus de crédito (Serasa, etc)
   - Sistemas bancários
   - Nota fiscal eletrônica

4. **Notificações**
   - Email
   - SMS
   - Push notifications

5. **Simulador de Crédito**
   - Cálculo de parcelas
   - Comparação de produtos
   - Análise de capacidade de pagamento

## 🐛 Troubleshooting

### Erro de Conexão:
```
Erro: could not translate host name to address
```
**Solução:** Verificar conectividade de rede e DNS

### Erro de Permissão:
```
Erro: permission denied for table
```
**Solução:** Verificar permissões do usuário PostgreSQL

### Erro de Unique Constraint:
```
Erro: duplicate key value violates unique constraint
```
**Solução:** Verificar se CPF/CNPJ, email ou slug já existem

## 📞 Suporte

Para dúvidas ou problemas:
- Documentação da API: `/docs`
- Issues no GitHub
- Email: suporte@credgestor.com.br

## 📄 Licença

Este projeto é proprietário e confidencial.

---

**Desenvolvido para o Sistema Credgestor**
Versão 1.0.0 - Janeiro 2025
