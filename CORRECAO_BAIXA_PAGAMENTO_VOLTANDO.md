# Correção: baixa de pagamento que volta no dia seguinte

**Data:** 2026-08-02  
**Escopo:** clientes em atraso / do dia que, após baixa, voltam a aparecer como devedores — inclusive casos com baixa há mais de um mês.

---

## Problema relatado

1. O operador dá baixa no pagamento.
2. No dia seguinte, o cliente volta a aparecer nas listas de atraso / do dia.
3. Em alguns casos, clientes já baixados há mais de um mês continuam aparecendo como devedores e exigem baixa diária, mesmo já tendo pago.

---

## Causa raiz

Três defeitos encadeados:

### 1. Histórico de pagamentos não era persistido no banco

O controle de capital pago nos empréstimos **somente juros** depende do campo `paymentHistory`.

- A tabela `installments` **não tinha** a coluna `payment_history`.
- O frontend **não enviava** nem **lia** esse campo na API.
- Resultado: no reload/login do dia seguinte, `paymentHistory` voltava vazio → capital pago = 0 → cliente voltava como devedor.

### 2. Gravação da quitação total falhava em silêncio

No fluxo de pagamento total:

- Parcelas com ID local (não-UUID) faziam o `update` falhar.
- Um único `try/catch` abortava o lote inteiro na primeira falha.
- O erro ia só para o `console`; a tela mostrava pago, mas o banco continuava com parcelas `LATE`/`PENDING`.

### 3. Semântica errada do status no modelo somente juros

Quando o cliente pagava só os juros do mês (com ou sem amortização parcial), a parcela **nunca** virava `PAID` — ficava `PARTIAL` para sempre — e ainda podia gerar nova parcela no fluxo inconsistente. Isso gerou dezenas/centenas de parcelas com `amount_paid >= amount` e `status = PARTIAL` no banco.

---

## Estratégia adotada (somente juros)

Separar dois conceitos:

| Conceito | Onde vive | Significado |
|---|---|---|
| Cobrança do mês | Status da **parcela** | Cliente pagou o que era devido neste vencimento? |
| Dívida do empréstimo | Status / `outstanding_amount` do **empréstimo** | O capital já foi quitado? |

### Regra de status da parcela

| Situação | Status da parcela |
|---|---|
| Pagou menos que os juros do mês | `PARTIAL` |
| Pagou os juros do mês (com ou sem amortização) | `PAID` |
| Não pagou e venceu | `LATE` |

### Regra do empréstimo

- Continua `ACTIVE` enquanto houver capital pendente.
- `outstanding_amount` = capital pendente + juros.
- A próxima cobrança é a **próxima parcela** criada automaticamente (vencimento +1 mês).
- Só vira `PAID` quando o capital for totalmente quitado.

---

## O que foi alterado no código

### Banco / scripts

| Arquivo | Descrição |
|---|---|
| `scripts/add_payment_history_column.sql` | Adiciona coluna `payment_history jsonb` em `installments` |
| `scripts/create_loans_table.sql` | Schema base atualizado com `payment_history` |
| `scripts/validar_pagos_e_atrasados.sql` | Consultas de validação (pagos, atraso, do dia, inconsistências) |
| `scripts/corrigir_parcelas_pagas_status.sql` | Corrige parcelas com valor quitado e status ≠ `PAID` |

### Frontend / API

| Arquivo | Descrição |
|---|---|
| `src/services/backendApi.ts` | Lê e envia `payment_history` no create/update/normalize de parcelas |
| `src/pages/App.tsx` | Helper `persistInstallmentsToBackend`, alerta ao falhar gravação, quitação total robusta, regularização de empréstimo já `PAID` com parcelas pendentes, nova semântica INTEREST_ONLY |

### Detalhes importantes em `App.tsx`

1. **`persistInstallmentsToBackend`**
   - Resolve IDs locais → UUID real do backend.
   - `try/catch` por parcela (uma falha não aborta as demais).
   - Alerta o operador se alguma parcela não for salva.

2. **Quitação total**
   - Persiste **todas** as parcelas alteradas (não só as `PAID`).
   - Usa o helper com fallback de UUID.

3. **Empréstimo já `PAID` com parcelas pendentes**
   - Na baixa, regulariza as parcelas pendentes como `PAID` (limpa o ciclo do bug antigo).

4. **Somente juros**
   - Parcela `PAID` quando juros do mês são quitados.
   - Próxima parcela criada se ainda houver capital pendente.
   - Empréstimo permanece `ACTIVE` até capital zerar.

---

## Ordem de deploy (obrigatória)

1. **Rodar no Supabase** (homologação e produção):

```sql
-- scripts/add_payment_history_column.sql
ALTER TABLE public.installments
    ADD COLUMN IF NOT EXISTS payment_history jsonb NOT NULL DEFAULT '[]'::jsonb;
```

> Sem essa coluna, o frontend novo passa a enviar `payment_history` e as atualizações de parcela falham.

2. Publicar frontend/backend com as alterações de código.

3. (Recomendado) Rodar validação e correção de dados históricos:

```text
scripts/validar_pagos_e_atrasados.sql     → diagnóstico
scripts/corrigir_parcelas_pagas_status.sql → corrige status PARTIAL com valor já quitado
```

4. Para clientes ainda presos no ciclo (empréstimo `PAID` + parcelas pendentes — consulta 5 do script de validação): após o deploy, uma nova baixa regulariza no banco.

---

## Como validar

### Consultas principais (`validar_pagos_e_atrasados.sql`)

1. Visão geral por status de parcela.
2. Parcelas pagas.
3. Parcelas em atraso.
4. Parcelas do dia.
5. **Inconsistência A:** empréstimo `PAID` com parcelas ainda pendentes (bug do ciclo diário).
6. **Inconsistência B:** `amount_paid >= amount` com status ≠ `PAID` (bug da semântica PARTIAL).
7. Resumo por cliente devedor.

### Teste funcional esperado após deploy

1. Dar baixa de **apenas juros** em um empréstimo somente juros  
   → parcela atual `PAID`, empréstimo `ACTIVE`, próxima parcela criada.
2. Dar baixa com **amortização parcial**  
   → parcela `PAID`, capital reduzido no histórico, juros da próxima parcela menores.
3. Dar baixa **total** (juros + capital)  
   → parcela `PAID`, empréstimo `PAID`, sem nova parcela.
4. Recarregar a página / fazer login no dia seguinte  
   → baixa permanece; cliente não volta como devedor indevidamente.
5. Se a gravação no servidor falhar  
   → operador vê alerta na tela (não só no console).

---

## Observações

- O script `corrigir_parcelas_pagas_status.sql` corrige o **passado** (status). A mudança no `App.tsx` evita que o problema **volte a ser gerado**.
- Filtros de tenant nos scripts SQL estão comentados (`-- AND tenant_id = '...'`); descomentar para limitar a um tenant.
- Datas “hoje” nos scripts usam fuso `America/Sao_Paulo` (banco em UTC).
