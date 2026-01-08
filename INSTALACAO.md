# 🚀 CREDGESTOR - Guia Rápido de Instalação

## Pré-requisitos

- Python 3.8+
- PostgreSQL 12+
- Acesso ao banco de dados Supabase fornecido

## Instalação em 5 Passos

### 1️⃣ Clone o Repositório (quando disponível)

```bash
git clone https://github.com/faelsou/credgestor-homologacao.git
cd credgestor-homologacao
```

### 2️⃣ Instale as Dependências

```bash
pip install -r requirements.txt
```

### 3️⃣ Configure o Banco de Dados

Edite o arquivo de conexão ou configure variável de ambiente:

```bash
export DATABASE_URL="postgresql://postgres:KydFq3qOLj5kOi4V@db.aclyrcuahiujgtjuimoh.supabase.co:5432/postgres"
```

### 4️⃣ Crie as Tabelas

```bash
python create_tables.py
```

Isso irá:
- ✅ Criar todas as 10 tabelas
- ✅ Criar índices otimizados
- ✅ Inserir dados de exemplo

### 5️⃣ Inicie a API (Opcional)

```bash
python api_rest.py
```

Acesse a documentação em: **http://localhost:8000/docs**

## 🧪 Testando o Sistema

Execute os testes automatizados:

```bash
python test_sistema.py
```

## 📚 Uso Básico

### Usando o CRUD Python Diretamente

```python
from crud_operations import conectar_banco, obter_cruds

# Conectar
db = conectar_banco()
cruds = obter_cruds(db)

# Criar cliente
cliente = cruds['cliente'].create(
    tenant_id=1,
    nome="João Silva",
    cpf_cnpj="123.456.789-00",
    tipo_pessoa="PF",
    email="joao@email.com"
)

# Listar clientes
clientes = cruds['cliente'].list_by_tenant(1)

# Fechar conexão
db.disconnect()
```

### Usando a API REST

```bash
# Listar clientes
curl -X GET "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1"

# Criar cliente
curl -X POST "http://localhost:8000/api/clientes" \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "cpf_cnpj": "987.654.321-00",
    "tipo_pessoa": "PF",
    "email": "maria@email.com"
  }'
```

## 📁 Estrutura de Arquivos

```
credgestor/
├── create_tables.py       # Criação do banco de dados
├── crud_operations.py     # Operações CRUD
├── api_rest.py           # API REST com FastAPI
├── test_sistema.py       # Testes automatizados
├── queries_uteis.sql     # Queries SQL úteis
├── DIAGRAMA_ER.md        # Diagrama do banco
├── README.md             # Documentação completa
├── INSTALACAO.md         # Este arquivo
└── requirements.txt      # Dependências
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Crie um arquivo `.env`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_HOST=0.0.0.0
API_PORT=8000
SECRET_KEY=sua-chave-secreta-aqui
```

### Configuração de Produção

Para produção, considere:

1. **Usar HTTPS** para a API
2. **Implementar autenticação JWT**
3. **Configurar CORS** adequadamente
4. **Usar variáveis de ambiente** para senhas
5. **Configurar backup automático** do banco
6. **Implementar rate limiting**
7. **Adicionar monitoramento** (Sentry, NewRelic, etc)

## 📊 Queries Úteis

Consulte o arquivo `queries_uteis.sql` para exemplos de:
- Relatórios executivos
- Análise de inadimplência
- Performance de vendedores
- Estatísticas por tenant

## 🆘 Problemas Comuns

### Erro de Conexão

```
Erro: could not translate host name
```

**Solução:** Verifique:
- Conectividade de rede
- String de conexão correta
- Firewall não bloqueando PostgreSQL

### Erro de Permissão

```
Erro: permission denied for table
```

**Solução:** Verifique permissões do usuário PostgreSQL

### Import Error

```
ModuleNotFoundError: No module named 'psycopg2'
```

**Solução:**
```bash
pip install psycopg2-binary --break-system-packages
```

## 📞 Suporte

- 📧 Email: suporte@credgestor.com.br
- 📖 Documentação completa: `README.md`
- 🐛 Reportar bugs: GitHub Issues

## ✅ Checklist de Instalação

- [ ] Python 3.8+ instalado
- [ ] PostgreSQL acessível
- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Tabelas criadas (`python create_tables.py`)
- [ ] Testes executados com sucesso (`python test_sistema.py`)
- [ ] API funcionando (`python api_rest.py`)

## 🎉 Pronto!

Seu sistema Credgestor está instalado e pronto para uso!

Consulte a documentação completa em `README.md` para mais detalhes.
