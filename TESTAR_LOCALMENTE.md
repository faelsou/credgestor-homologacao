# 🧪 Como Testar a Aplicação Localmente

Guia completo para rodar e testar o CredGestor localmente.

## 📋 Pré-requisitos

- **Python 3.11+** instalado
- **Node.js 20.x+** instalado
- **npm** ou **yarn** instalado
- **Docker** e **Docker Compose** (opcional, para banco local)
- **Conta Supabase** (recomendado) ou PostgreSQL local

## 🚀 Opção 1: Setup Rápido (Recomendado)

### 1.1. Clonar e Configurar

```bash
# Navegar para o diretório do projeto
cd /home/rafael/www/CredGestor-Homologacao/credgestor

# Copiar arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais do Supabase
nano .env  # ou use seu editor preferido
```

### 1.2. Configurar Variáveis de Ambiente

Edite o arquivo `.env` com suas credenciais:

```env
# Backend - Supabase
SUPABASE_URL=https://seu-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-anon-key

# Backend - Configurações
API_HOST=0.0.0.0
API_PORT=8000
SECRET_KEY=sua-secret-key-aqui

# Frontend - Supabase
VITE_SUPABASE_URL=https://seu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key

# Frontend - N8N (opcional)
VITE_N8N_BASE_URL=http://localhost:8000
```

### 1.3. Instalar Dependências

```bash
# Instalar dependências do backend
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt

# Instalar dependências do frontend
cd ..
npm install
```

### 1.4. Criar Tabelas no Supabase

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Vá em **SQL Editor** > **New Query**
3. Execute o script: `scripts/create_all_tables_supabase.sql`
4. Execute o script: `scripts/enable_rls_all_tables.sql`
5. Execute o script: `scripts/create_test_users.sql`

### 1.5. Criar Usuários no Supabase Auth

1. Vá em **Authentication** > **Users** > **Add User**
2. Crie os 3 usuários de teste (veja `scripts/INSTRUCOES_USUARIOS_TESTE.md`)

### 1.6. Iniciar Backend

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

O backend estará disponível em: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 1.7. Iniciar Frontend

```bash
# Terminal 2: Frontend
npm run dev
```

O frontend estará disponível em: http://localhost:3000

---

## 🐳 Opção 2: Usando Docker Compose

### 2.1. Configurar .env

```bash
# Copiar exemplo
cp .env.example .env

# Editar com suas credenciais
nano .env
```

### 2.2. Iniciar Serviços

```bash
# Iniciar todos os serviços (backend, frontend, postgres, pgadmin)
docker-compose up -d

# Ver logs
docker-compose logs -f api
docker-compose logs -f frontend
```

### 2.3. Acessar Serviços

- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **PgAdmin**: http://localhost:5050 (se usar PostgreSQL local)

### 2.4. Parar Serviços

```bash
# Parar serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v
```

---

## 🧪 Testar a Aplicação

### 3.1. Testar Health Check

```bash
# Via curl
curl http://localhost:8000/health

# Via navegador
# Acesse: http://localhost:8000/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "database": "connected",
  "supabase": "configured"
}
```

### 3.2. Testar Login

```bash
# Login com usuário de teste
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alpha.com",
    "senha": "AdminAlpha123!",
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Resposta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "usuario": {
    "id": "uuid",
    "email": "admin@alpha.com",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "tenant_nome": "Empresa Alpha",
    "name": "Administrador Alpha"
  }
}
```

### 3.3. Testar Listar Tenants

```bash
# Usar o token retornado no login
TOKEN="seu-token-aqui"

curl -X GET http://localhost:8000/tenants \
  -H "Authorization: Bearer $TOKEN"
```

### 3.4. Testar Listar Clients

```bash
# Listar clients de um tenant
TENANT_ID="00000000-0000-0000-0000-000000000001"

curl -X GET "http://localhost:8000/tenants/$TENANT_ID/clients" \
  -H "Authorization: Bearer $TOKEN"
```

### 3.5. Testar Frontend

1. Acesse: http://localhost:3000
2. Faça login com um dos usuários de teste:
   - `admin@alpha.com` / `AdminAlpha123!`
   - `user@beta.com` / `UserBeta123!`
   - `gestor@gamma.com` / `GestorGamma123!`
3. Verifique se os dados são isolados por tenant

---

## 🔧 Troubleshooting

### Erro: "SUPABASE_URL não configurada"

**Solução:**
```bash
# Verificar se .env existe e tem as variáveis
cat .env | grep SUPABASE

# Se não existir, copiar do exemplo
cp .env.example .env
```

### Erro: "Module not found" no backend

**Solução:**
```bash
# Reinstalar dependências
cd backend
pip install -r requirements.txt
```

### Erro: "Cannot find module" no frontend

**Solução:**
```bash
# Reinstalar dependências
npm install
```

### Erro: "Port 8000 already in use"

**Solução:**
```bash
# Verificar o que está usando a porta
lsof -i :8000

# Matar o processo ou mudar a porta no .env
# API_PORT=8001
```

### Erro: "Port 3000 already in use"

**Solução:**
```bash
# Verificar o que está usando a porta
lsof -i :3000

# Matar o processo ou mudar no vite.config.ts
```

### Erro: "Falha ao autenticar usuário"

**Solução:**
1. Verifique se o usuário existe no Supabase Auth
2. Verifique se o `tenant_id` está correto no metadata
3. Verifique se a senha está correta
4. Verifique se `SUPABASE_ANON_KEY` está configurada

### Backend não inicia

**Solução:**
```bash
# Verificar logs
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Verificar se há erros de importação
python -c "from backend.main import app; print('OK')"
```

### Frontend não carrega

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Docker Compose não inicia

**Solução:**
```bash
# Verificar logs
docker-compose logs

# Recriar containers
docker-compose down
docker-compose up -d --build
```

---

## 📊 Verificar Status

### Verificar Backend

```bash
# Health check
curl http://localhost:8000/health

# Verificar se está rodando
ps aux | grep uvicorn
```

### Verificar Frontend

```bash
# Verificar se está rodando
ps aux | grep vite

# Acessar no navegador
# http://localhost:3000
```

### Verificar Banco de Dados

```bash
# Se usar Supabase
# Acesse: https://app.supabase.com/project/[PROJECT]/editor

# Se usar PostgreSQL local
psql -h localhost -U credgestor_user -d credgestor
```

---

## 🎯 Checklist de Testes

- [ ] Backend inicia sem erros
- [ ] Frontend inicia sem erros
- [ ] Health check retorna sucesso
- [ ] Login funciona com usuário de teste
- [ ] Token é retornado corretamente
- [ ] Listar tenants funciona
- [ ] Listar clients funciona
- [ ] Dados são isolados por tenant
- [ ] Frontend carrega corretamente
- [ ] Login no frontend funciona
- [ ] Navegação no frontend funciona

---

## 📚 Scripts Úteis

### Script de Setup Automático

```bash
# Executar setup local
npm run setup:local

# Ou manualmente
bash scripts/setup-local.sh
```

### Verificar Conexão

```bash
# Verificar conexão com Supabase
python scripts/verificar_conexao_e_usuarios.py
```

### Testar Supabase Connection

```bash
# Via npm
npm run test:supabase
```

---

## 🔗 Links Úteis

- **Backend API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Supabase Dashboard**: https://app.supabase.com
- **Documentação Supabase**: https://supabase.com/docs

---

## 📝 Próximos Passos

Após testar localmente:

1. ✅ Verificar se todas as funcionalidades estão funcionando
2. ✅ Testar com diferentes usuários e tenants
3. ✅ Verificar isolamento de dados por tenant
4. ✅ Testar criação de clientes, propostas, etc.
5. ✅ Verificar logs de auditoria

---

## 🆘 Precisa de Ajuda?

- Consulte: `CONEXAO_BANCO_E_USUARIOS.md`
- Consulte: `scripts/INSTRUCOES_USUARIOS_TESTE.md`
- Consulte: `scripts/INSTRUCOES_CRIAR_TABELAS.md`
