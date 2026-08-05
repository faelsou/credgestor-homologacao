# Batimento FE ↔ DB — Empréstimos e Parcelas (Tenant 0003)

Documento operacional do trabalho realizado em **05/08/2026** no ambiente CredGestor Homologação/Produção (tenant Cleiton Max Car).

---

## 1. Objetivo

Cruzar valores de **empréstimos** e **parcelas** entre:

- Banco PostgreSQL (Supabase) — tabelas `loans` / `installments`
- Frontend (telas Empréstimos, Parcelas, Histórico e export Excel)

Identificar inconsistências, corrigir o que for seguro via SQL e documentar bugs de produto (API e modal de recebimento).

---

## 2. Escopo do tenant

| Item | Valor |
|------|--------|
| Tenant ID | `00000000-0000-0000-0000-000000000003` |
| Nome | Aplicação - Cleiton Max Car |
| Empréstimos (aprox.) | 213 |
| Parcelas (aprox.) | 1.330 |
| Clientes (aprox.) | 166 |

---

## 3. O que foi feito

### 3.1 Batimento automatizado (Python)

Criado o script:

- `scripts/batimento_emprestimos_parcelas.py`

Ele lê loans/installments via API REST do Supabase e compara com as fórmulas do frontend (`loanBalances.ts` canônico vs `Loans.tsx`).

Uso:

```bash
python3 scripts/batimento_emprestimos_parcelas.py
python3 scripts/batimento_emprestimos_parcelas.py --tenant 00000000-0000-0000-0000-000000000003
python3 scripts/batimento_emprestimos_parcelas.py --json /tmp/batimento.json
```

Snapshot gerado (não versionar em PR de código, se for só dado):

- `scripts/batimento_emprestimos_resultado.json`

### 3.2 Resultado do batimento (tenant 0003)

**229 achados** (41 HIGH, 188 MEDIUM) em ~134 empréstimos / 94 clientes.

| Tipo | Qtd | Significado | Ação |
|------|-----|-------------|------|
| **D** | 129 | `PENDING` vencida com saldo → deveria `LATE` | SQL aplicado |
| **K** | 39 | `amount_paid` > `amount` | Revisão manual (comum em INTEREST_ONLY) |
| **G** | 31 | `outstanding_amount` ≠ fórmula canônica FE | SQL no script completo (não obrigatório) |
| **H** | 20 | Divergência Empréstimos vs Histórico (INTEREST_ONLY) | Bug de código FE |
| **J** | 9 | `total_amount` ≠ Σ parcelas | Revisão manual |
| **F** | 1 | Loan `PAID` com `outstanding_amount` > 0 | SQL no script completo |

Tipos A/B/C (status × quitação crítica) **não** apareceram neste tenant.

### 3.3 Correção tipo D (executada no Supabase)

Script dedicado:

- `scripts/corrigir_tipo_d_tenant_0003.sql`

O que faz:

```text
status PENDING + vencimento < hoje + saldo > 0  →  LATE
```

Não altera valor, pago, saldo nem histórico.

Validação pós-correção: `ainda_pending_vencidas = 0`.

Backup: `public.installments_backup_tipo_d_0003`.

### 3.4 Scripts SQL auxiliares

| Arquivo | Uso |
|---------|-----|
| `scripts/corrigir_batimento_tenant_0003.sql` | Preview + correção D/F/G/B/C + validação + leitura J/K |
| `scripts/corrigir_tipo_d_tenant_0003.sql` | Só tipo D (PENDING → LATE) |
| `scripts/listar_atrasados_tenant_0003.sql` | Lista clientes/parcelas `LATE` |
| `scripts/verificar_saldo_cristina_0003.sql` | Saldo aberto da cliente Ana Cristina Cruz Lima |

### 3.5 Bug de paginação da API (causa do export 77 vs 129)

**Problema:** PostgREST/Supabase limita ~1000 linhas por request. O tenant tem **1330** parcelas. O backend (`_apply_filters`) trazia só a primeira página.

| Fonte | Qtd LATE |
|-------|----------|
| Banco (`status = LATE`) | **129** |
| Front / export Excel (antes do fix) | **~77** |
| LATE nas 330 parcelas não carregadas | **~54** |

**Correção:** paginação em chunks de 1000 em `_apply_filters` (`backend/main.py`).

Branch / commit:

- Branch: `fix/paginacao-parcelas-batimento`
- Commit: paginação + scripts de batimento
- Abrir PR: https://github.com/faelsou/credgestor-homologacao/compare/main...fix/paginacao-parcelas-batimento?expand=1

**Importante:** o fix só vale após **redeploy da API**. Até lá o front continua exportando ~77.

### 3.6 Duplicatas reais encontradas (LATE)

Mesmo `loan_id` + número + vencimento + valor (2 IDs no banco):

| Cliente | Parcela | Vencimento | Valor |
|---------|---------|------------|-------|
| CLAUDINEI EVANGELISTA | #3 | 2026-07-01 | R$ 100 |
| ROSE - ESPOSA DO PAULO DE BARUERI | #3 | 2026-07-01 | R$ 200 |
| EDINILSON FERREIRA DE OLIVEIRA | #3 | 2026-07-05 | R$ 350 |
| FELIPE/TUFÃO - FELIPE DOS SANTOS LOPES | #4 | 2026-08-01 | R$ 551 |

SQL para listar:

```sql
SELECT c.nome, i.loan_id, i.number, i.due_date, i.amount,
       COUNT(*) AS qtd, array_agg(i.id) AS ids
FROM public.installments i
JOIN public.clients c ON c.id = i.client_id
WHERE i.tenant_id = '00000000-0000-0000-0000-000000000003'
  AND i.status = 'LATE'
GROUP BY c.nome, i.loan_id, i.number, i.due_date, i.amount
HAVING COUNT(*) > 1
ORDER BY c.nome;
```

### 3.7 Caso Cristina (Parcial / modal)

Cliente: **CRISTINA - ANA CRISTINA CRUZ LIMA**

Parcelas em aberto (saldo real = `amount − amount_paid`):

| Parcela | Venc. | Valor | Pago | Falta | Status | Loan |
|---------|-------|-------|------|-------|--------|------|
| #1 | 2026-05-30 | 351,00 | 350,16 | **0,84** | PARTIAL | `674b199e…` |
| #1 | 2026-06-08 | 500,00 | 0 | 500,00 | LATE | `ae12b4bb…` |
| #2 | 2026-06-30 | 350,16 | 0 | 350,16 | LATE | `674b199e…` |

No front, `PARTIAL` em INTEREST_ONLY aparece como **“Pgto Juros”**.

O modal “Receber” mostrava pendente **350,16** com já recebido **350,16** — **incorreto**. Saldo real: **R$ 0,84**.

---

## 4. Achados de produto (código)

### 4.1 Três fontes de “valor em aberto”

1. Coluna `loans.outstanding_amount` (persistida)
2. Fórmula canônica — `src/utils/loanBalances.ts` (Histórico)
3. Fórmula da listagem — `src/components/dashboard/Loans.tsx` (INTEREST_ONLY multiplica juros × N)

Isso gera tipos **G** e **H** no batimento.

### 4.2 Modal “Receber parcela” (`Installments.tsx`)

| Modelo | Avaliação |
|--------|-----------|
| **PRICE** | Em geral ok (`amount − amountPaid`; promessa opcional) |
| **INTEREST_ONLY** | Inconsistente |

Problemas INTEREST_ONLY no modal:

1. **Valor da parcela / Juros (resumo):** `toFixed(2)` sobre capital pendente (pode ≠ `amount` do banco com `ceil`).
2. **Valor pendente:** `Math.max(display − pago, jurosCheios)` — reincha o pendente após pagamento parcial (**bug**).
3. **Mínimo:** `Math.ceil(capitalOriginal × taxa)` — terceira fórmula.
4. Com **promessa**, o campo inicial usa valor prometido (com multa), não o saldo da parcela.

Trecho problemático:

```ts
const pendingAmount = Math.max(
  displayAmount - (selectedInstallment.amountPaid || 0),
  minInterestAmount
);
```

### 4.3 Front “Em Atraso” vs banco `LATE`

O filtro **Em Atraso** usa `isActuallyLate()` (data exibida, inclusive promessa), não só `status === LATE`.

Após a correção D, banco `LATE` e tela Em Atraso ficaram alinhados para o caso simples (sem promessa futura).

A diferença **129 vs 77** no export **não** era filtro de tela: era o **corte de 1000 registros** na API.

---

## 5. O que NÃO foi feito automaticamente

- Remoção das 4 duplicatas LATE (precisa escolher qual ID manter).
- Correção em massa dos tipos **J** (total ≠ Σ parcelas) e **K** (pago > parcela).
- Unificação das fórmulas INTEREST_ONLY no FE (`Loans.tsx` vs `loanBalances.ts`).
- ~~Correção do bug do modal (pendente reinchado).~~ **Corrigido** em `loanBalances.ts` + `Installments.tsx` / `Loans.tsx` (pendente = `amount − amountPaid`; outstanding canônico).
- Redeploy da API com a paginação (branch pronta; PR depende de auth `gh` / abertura manual do compare).

---

## 6. Como operar daqui pra frente

### 6.1 Relistar atrasados no banco

```sql
-- scripts/listar_atrasados_tenant_0003.sql
-- (coluna CPF = cpf_cnpj)
```

### 6.2 Reexecutar batimento

```bash
python3 scripts/batimento_emprestimos_parcelas.py \
  --tenant 00000000-0000-0000-0000-000000000003 \
  --json /tmp/batimento_0003.json
```

### 6.3 Após deploy da paginação

1. Redeploy `credgestor_api` com a branch `fix/paginacao-parcelas-batimento`
2. Hard refresh no browser
3. Parcelas → Em Atraso → Exportar Excel (sem filtro de data)
4. Esperado: CSV próximo de **129** linhas (não ~77)

### 6.4 Ajuste pontual Cristina (R$ 0,84)

- **Front:** Receber `0,84` na parcial, **ou**
- **SQL:** zerar saldo e marcar `PAID` se for só arredondamento (ver seção no histórico do chat / script de verificação).

---

## 7. Arquivos criados/alterados

| Arquivo | Tipo |
|---------|------|
| `backend/main.py` | Fix paginação `_apply_filters` |
| `scripts/batimento_emprestimos_parcelas.py` | Batimento FE↔DB |
| `scripts/corrigir_batimento_tenant_0003.sql` | Correção ampla tenant 0003 |
| `scripts/corrigir_tipo_d_tenant_0003.sql` | Correção D |
| `scripts/listar_atrasados_tenant_0003.sql` | Listagem LATE |
| `scripts/verificar_saldo_cristina_0003.sql` | Saldo Cristina |
| `docs/BATIMENTO_EMPRESTIMOS_PARCELAS_2026-08-05.md` | Este documento |

---

## 8. Glossário rápido dos tipos de batimento

| Código | Nome | Severidade típica |
|--------|------|-------------------|
| A | Empréstimo PAID com parcela pendente | CRITICAL |
| B | Valor quitado, status ≠ PAID | CRITICAL |
| C | Status PAID com saldo | CRITICAL |
| D | Vencida ainda PENDING | MEDIUM |
| E | ACTIVE sem parcela pendente | HIGH |
| F | PAID com outstanding > 0 | HIGH |
| G | outstanding DB ≠ FE canônico | HIGH |
| H | Fórmulas FE divergem | MEDIUM |
| I | Status loan DB ≠ FE | HIGH |
| J | total_amount ≠ Σ parcelas | HIGH |
| K | amount_paid > amount | MEDIUM |
| L | Σ payment_history ≠ amount_paid | MEDIUM |
| M | Empréstimo sem parcelas | HIGH |

---

## 9. Conclusão

1. **Tipo D corrigido** no banco (129 parcelas → `LATE`).
2. Export do front (~77) continua incompleto **até redeploy** da paginação da API.
3. Modal INTEREST_ONLY: bug de “valor pendente” reinchado **corrigido** (`amount − amountPaid`); fórmulas unificadas via `loanBalances.ts`.
4. Restam limpezas manuais: duplicatas, J/K.

Última atualização: **2026-08-05**.
