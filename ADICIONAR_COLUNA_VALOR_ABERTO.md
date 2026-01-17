# 📊 Adicionar Coluna Valor em Aberto - v1.0.12

## ✅ Implementação Concluída

**Versão**: v1.0.12
**Status**: ✅ Código implementado, imagens Docker criadas e enviadas para GitHub

## 📦 Mudanças Implementadas

### 1. Frontend ✅
- Adicionado campo `outstandingAmount` ao tipo `Loan`
- Criada função `calculateOutstandingAmount` para calcular valor em aberto
- Adicionada coluna "Valor em Aberto" na tabela de histórico de empréstimos
- Adicionada coluna "Valor em Aberto" na tabela de empréstimos
- Valor é calculado automaticamente baseado nas parcelas pendentes

### 2. Backend ✅
- Atualizado para aceitar e normalizar campo `outstanding_amount`
- Campo é salvo automaticamente ao criar/atualizar empréstimo
- Valor é recalculado e atualizado automaticamente após cada pagamento

### 3. Banco de Dados ⚠️
- **Script SQL criado**: `scripts/add_outstanding_amount_to_loans.sql`
- **AÇÃO NECESSÁRIA**: Executar o script SQL no banco de dados

## 🔧 Como Executar o Script SQL

### Opção 1: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `scripts/add_outstanding_amount_to_loans.sql`
4. Execute o script

### Opção 2: Via psql (linha de comando)
```bash
psql -h <seu-host-supabase> -U postgres -d postgres -f scripts/add_outstanding_amount_to_loans.sql
```

### Opção 3: Via Python (usando Supabase client)
```python
from supabase import create_client
import os

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Ler e executar o script
with open("scripts/add_outstanding_amount_to_loans.sql", "r") as f:
    sql = f.read()
    supabase.rpc("exec_sql", {"sql": sql})
```

## 📋 Cálculo do Valor em Aberto

### Para Empréstimos "Somente Juros" (INTEREST_ONLY):
- Soma de todo o capital pendente (`principalAmount > 0`)
- Soma de todos os juros pendentes (`interestAmount > 0`)
- Valor em aberto = Capital pendente + Juros pendentes

### Para Outros Modelos:
- Valor em aberto = `totalAmount` - `totalPaid`
- Onde `totalPaid` é a soma de todos os `amountPaid` das parcelas

## 🔍 Verificação

### Imagens Criadas:
- Backend: `faelsouz/credgestor-homologacao-backend:v1.0.12` ✅
- Frontend: `faelsouz/credgestor-homologacao-frontend:v1.0.12` ✅

### Git:
- Commit: `feat: v1.0.12 - Adiciona coluna Valor em Aberto em histórico e empréstimos` ✅
- Tag: `v1.0.12` ✅
- Push para GitHub: ✅

## 📝 Arquivos Modificados

- `src/types/index.ts` - Adicionado campo `outstandingAmount`
- `src/components/dashboard/LoanHistory.tsx` - Adicionada coluna e função de cálculo
- `src/components/dashboard/Loans.tsx` - Adicionada coluna e função de cálculo
- `src/services/backendApi.ts` - Adicionado campo ao payload e normalizeApiLoan
- `src/pages/App.tsx` - Adicionado cálculo e atualização automática
- `backend/main.py` - Adicionada normalização do campo `outstanding_amount`
- `scripts/add_outstanding_amount_to_loans.sql` - Script SQL para adicionar coluna

## 🧪 Testes Recomendados

1. **Executar Script SQL:**
   - Execute o script `add_outstanding_amount_to_loans.sql` no banco de dados
   - Verifique se a coluna foi criada: `SELECT outstanding_amount FROM loans LIMIT 1;`

2. **Teste de Cálculo:**
   - Acesse a página de Histórico de Empréstimos
   - Verifique se a coluna "Valor em Aberto" aparece
   - Verifique se o valor está correto baseado nas parcelas pendentes

3. **Teste de Atualização:**
   - Faça um pagamento de parcela
   - Verifique se o valor em aberto é atualizado automaticamente
   - Verifique se o valor foi salvo no banco de dados

## ⚠️ IMPORTANTE

**Antes de usar a funcionalidade em produção, execute o script SQL para adicionar a coluna no banco de dados!**

Sem executar o script, o campo `outstanding_amount` não existirá na tabela e pode causar erros ao tentar salvar.

## 🔗 URLs

- **Repositório GitHub**: https://github.com/faelsou/credgestor-homologacao
- **Tag v1.0.12**: https://github.com/faelsou/credgestor-homologacao/releases/tag/v1.0.12
- **Script SQL**: `scripts/add_outstanding_amount_to_loans.sql`

## ✅ Status Final

- ✅ Campo `outstandingAmount` adicionado ao tipo Loan
- ✅ Função de cálculo implementada
- ✅ Coluna adicionada nas tabelas de histórico e empréstimos
- ✅ Backend atualizado para aceitar o campo
- ✅ Script SQL criado
- ✅ Imagens Docker criadas e enviadas
- ✅ Commit e push para GitHub realizados
- ⚠️ **PENDENTE**: Executar script SQL no banco de dados
