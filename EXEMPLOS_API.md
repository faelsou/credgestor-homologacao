# 📖 CREDGESTOR - Exemplos Práticos de Uso da API

## 🔑 Autenticação

Todas as requisições (exceto `/api/tenants`) requerem o header `X-Tenant-ID`:

```bash
curl -H "X-Tenant-ID: 1" ...
```

## 1️⃣ Gestão de Tenants

### Criar um novo Tenant (Empresa)

```bash
curl -X POST "http://localhost:8000/api/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Financeira ABC",
    "slug": "financeira-abc",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@financeiraabc.com.br",
    "telefone": "(11) 3333-4444",
    "endereco": "Av. Paulista, 1000 - São Paulo, SP"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "nome": "Financeira ABC",
    "slug": "financeira-abc",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@financeiraabc.com.br",
    "ativo": true,
    "data_criacao": "2025-01-08T19:30:00"
  },
  "message": "Tenant criado com sucesso"
}
```

### Listar todos os Tenants

```bash
curl -X GET "http://localhost:8000/api/tenants"
```

### Buscar Tenant específico

```bash
curl -X GET "http://localhost:8000/api/tenants/1"
```

### Atualizar Tenant

```bash
curl -X PUT "http://localhost:8000/api/tenants/1" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 9999-8888",
    "email": "novo@email.com"
  }'
```

## 2️⃣ Gestão de Usuários

### Criar novo Usuário

```bash
curl -X POST "http://localhost:8000/api/usuarios" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Carlos Silva",
    "email": "carlos@empresa.com",
    "senha": "senha123",
    "cpf": "111.222.333-44",
    "telefone": "(11) 98888-7777",
    "cargo": "Gerente de Crédito",
    "tipo_usuario": "gestor"
  }'
```

### Listar Usuários

```bash
# Todos os usuários
curl -X GET "http://localhost:8000/api/usuarios" \
  -H "X-Tenant-ID: 1"

# Apenas ativos
curl -X GET "http://localhost:8000/api/usuarios?ativo=true" \
  -H "X-Tenant-ID: 1"
```

### Buscar Usuário específico

```bash
curl -X GET "http://localhost:8000/api/usuarios/1" \
  -H "X-Tenant-ID: 1"
```

### Atualizar Usuário

```bash
curl -X PUT "http://localhost:8000/api/usuarios/1" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": "Diretor de Crédito",
    "telefone": "(11) 99999-9999"
  }'
```

### Desativar Usuário

```bash
curl -X DELETE "http://localhost:8000/api/usuarios/1" \
  -H "X-Tenant-ID: 1"
```

## 3️⃣ Gestão de Clientes

### Criar Cliente Pessoa Física

```bash
curl -X POST "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Ana Paula Santos",
    "cpf_cnpj": "123.456.789-00",
    "tipo_pessoa": "PF",
    "email": "ana.santos@email.com",
    "telefone": "(11) 98765-4321",
    "celular": "(11) 99999-8888",
    "endereco": "Rua das Flores, 123",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "data_nascimento": "1990-05-15",
    "renda_mensal": 8500.00,
    "profissao": "Engenheira Civil",
    "score_credito": 750
  }'
```

### Criar Cliente Pessoa Jurídica

```bash
curl -X POST "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Tech Solutions LTDA",
    "cpf_cnpj": "12.345.678/0001-90",
    "tipo_pessoa": "PJ",
    "email": "contato@techsolutions.com.br",
    "telefone": "(11) 3333-4444",
    "endereco": "Av. Paulista, 2000",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01310-200",
    "renda_mensal": 50000.00,
    "score_credito": 800
  }'
```

### Listar Clientes

```bash
# Todos os clientes
curl -X GET "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1"

# Apenas Pessoas Físicas ativas
curl -X GET "http://localhost:8000/api/clientes?tipo_pessoa=PF&ativo=true" \
  -H "X-Tenant-ID: 1"

# Apenas Pessoas Jurídicas
curl -X GET "http://localhost:8000/api/clientes?tipo_pessoa=PJ" \
  -H "X-Tenant-ID: 1"
```

### Buscar Clientes

```bash
# Por termo (nome, CPF/CNPJ ou email)
curl -X GET "http://localhost:8000/api/clientes/buscar/Ana" \
  -H "X-Tenant-ID: 1"

# Por ID específico
curl -X GET "http://localhost:8000/api/clientes/1" \
  -H "X-Tenant-ID: 1"
```

### Atualizar Cliente

```bash
curl -X PUT "http://localhost:8000/api/clientes/1" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "renda_mensal": 9500.00,
    "score_credito": 780,
    "telefone": "(11) 98765-0000"
  }'
```

## 4️⃣ Gestão de Propostas

### Criar nova Proposta

```bash
curl -X POST "http://localhost:8000/api/propostas" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "produto_id": 1,
    "usuario_id": 1,
    "numero_proposta": "PROP-2025-0003",
    "valor_solicitado": 25000.00,
    "observacoes": "Cliente com bom histórico, primeira solicitação"
  }'
```

### Listar Propostas

```bash
# Todas as propostas
curl -X GET "http://localhost:8000/api/propostas" \
  -H "X-Tenant-ID: 1"

# Apenas em análise
curl -X GET "http://localhost:8000/api/propostas?status=em_analise" \
  -H "X-Tenant-ID: 1"

# Apenas aprovadas
curl -X GET "http://localhost:8000/api/propostas?status=aprovado" \
  -H "X-Tenant-ID: 1"

# Propostas de um cliente específico
curl -X GET "http://localhost:8000/api/propostas/cliente/1" \
  -H "X-Tenant-ID: 1"
```

### Buscar Proposta específica

```bash
curl -X GET "http://localhost:8000/api/propostas/1" \
  -H "X-Tenant-ID: 1"
```

### Atualizar Proposta

```bash
curl -X PUT "http://localhost:8000/api/propostas/1" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "em_analise",
    "observacoes": "Aguardando documentação adicional"
  }'
```

### Aprovar Proposta

```bash
curl -X POST "http://localhost:8000/api/propostas/1/aprovar" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_aprovado": 25000.00,
    "taxa_juros": 2.99,
    "prazo": 36,
    "valor_parcela": 878.25
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "numero_proposta": "PROP-2025-0003",
    "status": "aprovado",
    "valor_aprovado": 25000.00,
    "data_aprovacao": "2025-01-08T19:45:00"
  },
  "message": "Proposta aprovada e parcelas criadas com sucesso"
}
```

### Rejeitar Proposta

```bash
curl -X POST "http://localhost:8000/api/propostas/1/rejeitar?observacoes=Renda%20insuficiente" \
  -H "X-Tenant-ID: 1"
```

## 5️⃣ Gestão de Parcelas

### Listar Parcelas de uma Proposta

```bash
curl -X GET "http://localhost:8000/api/parcelas/proposta/1" \
  -H "X-Tenant-ID: 1"
```

### Listar Parcelas Vencidas

```bash
curl -X GET "http://localhost:8000/api/parcelas/vencidas" \
  -H "X-Tenant-ID: 1"
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "numero_parcela": 1,
      "valor_parcela": 878.25,
      "data_vencimento": "2025-01-05",
      "status": "atrasado",
      "dias_atraso": 3,
      "cliente_nome": "Ana Paula Santos",
      "numero_proposta": "PROP-2025-0003"
    }
  ],
  "count": 1
}
```

### Registrar Pagamento

```bash
curl -X POST "http://localhost:8000/api/parcelas/5/pagar?valor_pago=878.25" \
  -H "X-Tenant-ID: 1"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "status": "pago",
    "valor_pago": 878.25,
    "data_pagamento": "2025-01-08T19:50:00"
  },
  "message": "Pagamento registrado com sucesso"
}
```

### Pagamento Parcial

```bash
# Pagar apenas parte da parcela
curl -X POST "http://localhost:8000/api/parcelas/6/pagar?valor_pago=400.00" \
  -H "X-Tenant-ID: 1"
```

## 6️⃣ Health Check e Informações

### Verificar Status da API

```bash
curl -X GET "http://localhost:8000/health"
```

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T19:55:00"
}
```

### Informações da API

```bash
curl -X GET "http://localhost:8000/"
```

## 📊 Exemplos de Fluxos Completos

### Fluxo 1: Novo Cliente até Aprovação

```bash
# 1. Criar cliente
CLIENT_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Pedro Oliveira",
    "cpf_cnpj": "999.888.777-66",
    "tipo_pessoa": "PF",
    "email": "pedro@email.com",
    "renda_mensal": 7000.00
  }')

CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.data.id')

# 2. Criar proposta
PROP_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/propostas" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d "{
    \"cliente_id\": $CLIENT_ID,
    \"produto_id\": 1,
    \"usuario_id\": 1,
    \"numero_proposta\": \"PROP-AUTO-001\",
    \"valor_solicitado\": 15000.00
  }")

PROP_ID=$(echo $PROP_RESPONSE | jq -r '.data.id')

# 3. Aprovar proposta
curl -X POST "http://localhost:8000/api/propostas/$PROP_ID/aprovar" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "valor_aprovado": 15000.00,
    "taxa_juros": 2.49,
    "prazo": 24,
    "valor_parcela": 697.50
  }'

# 4. Listar parcelas criadas
curl -X GET "http://localhost:8000/api/parcelas/proposta/$PROP_ID" \
  -H "X-Tenant-ID: 1"
```

### Fluxo 2: Pagamento de Parcela Vencida

```bash
# 1. Listar parcelas vencidas
VENCIDAS=$(curl -s -X GET "http://localhost:8000/api/parcelas/vencidas" \
  -H "X-Tenant-ID: 1")

echo $VENCIDAS | jq '.data[] | {id, cliente: .cliente_nome, valor: .valor_parcela}'

# 2. Pagar primeira parcela vencida
PARCELA_ID=$(echo $VENCIDAS | jq -r '.data[0].id')
curl -X POST "http://localhost:8000/api/parcelas/$PARCELA_ID/pagar?valor_pago=697.50" \
  -H "X-Tenant-ID: 1"
```

## 🔍 Testando com Python Requests

```python
import requests

BASE_URL = "http://localhost:8000"
HEADERS = {
    "X-Tenant-ID": "1",
    "Content-Type": "application/json"
}

# Criar cliente
cliente_data = {
    "nome": "Maria Fernanda",
    "cpf_cnpj": "555.444.333-22",
    "tipo_pessoa": "PF",
    "email": "maria@email.com",
    "renda_mensal": 6000.00
}

response = requests.post(
    f"{BASE_URL}/api/clientes",
    headers=HEADERS,
    json=cliente_data
)

print(response.json())

# Listar clientes
response = requests.get(
    f"{BASE_URL}/api/clientes",
    headers=HEADERS
)

clientes = response.json()['data']
for cliente in clientes:
    print(f"ID: {cliente['id']} - Nome: {cliente['nome']}")
```

## 📚 Documentação Interativa

Acesse a documentação Swagger completa em:

**http://localhost:8000/docs**

Lá você pode:
- ✅ Ver todos os endpoints disponíveis
- ✅ Testar requisições diretamente
- ✅ Ver schemas de request/response
- ✅ Gerar código cliente em várias linguagens

## 💡 Dicas

1. **Use jq** para processar JSON na linha de comando
2. **Salve IDs** em variáveis para automatizar fluxos
3. **Teste com Postman** ou Insomnia para desenvolvimento
4. **Use a documentação Swagger** para explorar a API

## 🐛 Erros Comuns

### 400 - Header X-Tenant-ID é obrigatório

```bash
# ❌ Errado
curl -X GET "http://localhost:8000/api/clientes"

# ✅ Correto
curl -X GET "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1"
```

### 404 - Registro não encontrado

Verifique se o ID existe e pertence ao tenant correto.

### 500 - Erro interno

Verifique se o banco de dados está acessível.

---

**Para mais exemplos e documentação completa, consulte `README.md`**
