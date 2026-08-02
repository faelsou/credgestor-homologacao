-- ============================================================================
-- CORREÇÃO: parcelas totalmente pagas pelo valor, mas com status errado
-- (resultado da consulta 6 de validar_pagos_e_atrasados.sql)
--
-- Contexto: o fluxo antigo de baixa dos empréstimos "somente juros" registrava
-- o valor pago (amount_paid) mas nunca marcava a parcela como PAID — ela ficava
-- PARTIAL para sempre. Este script regulariza o status dessas parcelas.
--
-- Critério de segurança: só altera parcelas com amount_paid >= amount
-- (nenhum saldo pendente), então não há risco de "quitar" dívida em aberto.
--
-- Executar no SQL Editor do Supabase. Rodar os passos na ordem.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASSO 1: conferir quantas parcelas serão alteradas (mesmo filtro do UPDATE)
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS parcelas_a_corrigir
FROM public.installments i
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID';
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ----------------------------------------------------------------------------
-- PASSO 2 (opcional, recomendado): backup das linhas que serão alteradas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.installments_backup_correcao_status AS
SELECT i.*, now() AS backup_em
FROM public.installments i
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID';
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ----------------------------------------------------------------------------
-- PASSO 3: corrigir o status para PAID
--   - paid_date: mantém o existente; se vazio, usa a data da última alteração
--     da parcela (melhor aproximação da data real da baixa disponível no banco)
-- ----------------------------------------------------------------------------
UPDATE public.installments i
SET status    = 'PAID',
    paid_date = COALESCE(
        i.paid_date,
        (i.updated_at AT TIME ZONE 'America/Sao_Paulo')::date
    )
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID';
-- AND i.tenant_id = 'SEU_TENANT_ID'

-- ----------------------------------------------------------------------------
-- PASSO 4: validar — deve retornar 0 linhas
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS parcelas_ainda_inconsistentes
FROM public.installments i
WHERE i.amount_paid >= i.amount
  AND i.amount > 0
  AND i.status <> 'PAID';
