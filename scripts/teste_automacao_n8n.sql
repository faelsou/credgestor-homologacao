-- ============================================================================
-- SCRIPT DE TESTE - AUTOMAÇÃO N8N COBRANÇA VENCIMENTO
-- ============================================================================
-- Este script cria 50 clientes com empréstimos (loans) e parcelas (installments)
-- vencendo em 12/01 e 13/01, seguindo o modelo de empréstimo da aplicação
-- Execute no Supabase SQL Editor
-- ============================================================================

-- Limpar dados de teste anteriores (opcional - descomente se necessário)
-- DELETE FROM public.installments WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM public.loans WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM public.clients WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- 1. GARANTIR QUE TENANT EXISTE
-- ============================================================================
INSERT INTO public.tenants (id, name, slug, ativo) 
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Tenant Teste Automação', 'teste-automacao', true)
ON CONFLICT (id) DO UPDATE SET ativo = true;

-- ============================================================================
-- 2. FUNÇÕES AUXILIARES PARA CÁLCULO DE PARCELAS
-- ============================================================================

-- Função para calcular parcela PRICE (Sistema de Amortização Francês)
CREATE OR REPLACE FUNCTION calculate_price_installment(
    principal NUMERIC,
    rate_decimal NUMERIC,
    periods INTEGER
) RETURNS NUMERIC AS $$
BEGIN
    IF rate_decimal = 0 THEN
        RETURN principal / NULLIF(periods, 0);
    END IF;
    RETURN principal * ((rate_decimal * POWER(1 + rate_decimal, periods)) / (POWER(1 + rate_decimal, periods) - 1));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. CRIAR 50 CLIENTES COM EMPRÉSTIMOS E PARCELAS
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    cliente_id UUID;
    loan_id UUID;
    nome_cliente TEXT;
    cpf_base TEXT;
    telefone_base TEXT;
    whatsapp_base TEXT;
    celular_base TEXT;
    
    -- Variáveis do empréstimo
    loan_amount NUMERIC(15,2);
    interest_rate NUMERIC(5,2);
    installments_count INTEGER;
    loan_model TEXT;
    start_date DATE;
    data_vencimento DATE;
    ano_atual INTEGER;
    
    -- Variáveis de cálculo de parcelas
    rate_decimal NUMERIC;
    price_installment NUMERIC(15,2);
    amortization_base NUMERIC(15,2);
    remaining_principal NUMERIC(15,2);
    total_amount NUMERIC(15,2);
    
    -- Variáveis da parcela
    parcela_num INTEGER;
    parcela_amount NUMERIC(15,2);
    parcela_interest NUMERIC(15,2);
    parcela_principal NUMERIC(15,2);
    parcela_due_date DATE;
    parcela_status TEXT;
BEGIN
    -- Obter ano atual
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    FOR i IN 1..50 LOOP
        -- Gerar IDs e dados únicos para cada cliente
        cliente_id := gen_random_uuid();
        loan_id := gen_random_uuid();
        nome_cliente := 'Cliente Teste ' || LPAD(i::TEXT, 3, '0');
        cpf_base := LPAD(i::TEXT, 11, '0');
        telefone_base := '5511' || LPAD((900000000 + i)::TEXT, 9, '0');
        whatsapp_base := '5511' || LPAD((910000000 + i)::TEXT, 9, '0');
        celular_base := '5511' || LPAD((920000000 + i)::TEXT, 9, '0');
        
        -- Definir parâmetros do empréstimo baseado no índice
        -- Distribuir entre diferentes modelos e valores
        CASE (i % 7)
            WHEN 0 THEN 
                -- PRICE - Valores médios
                loan_model := 'PRICE';
                loan_amount := 10000.00 + (i * 200);
                interest_rate := 2.5;
                installments_count := 24;
            WHEN 1 THEN 
                -- SAC - Valores menores
                loan_model := 'SAC';
                loan_amount := 5000.00 + (i * 150);
                interest_rate := 2.0;
                installments_count := 18;
            WHEN 2 THEN 
                -- FIXED_AMORTIZATION - Valores médios-altos
                loan_model := 'FIXED_AMORTIZATION';
                loan_amount := 15000.00 + (i * 300);
                interest_rate := 3.0;
                installments_count := 36;
            WHEN 3 THEN 
                -- SIMPLE_INTEREST - Valores altos
                loan_model := 'SIMPLE_INTEREST';
                loan_amount := 20000.00 + (i * 400);
                interest_rate := 2.8;
                installments_count := 30;
            WHEN 4 THEN 
                -- COMPOUND_INTEREST - Valores médios
                loan_model := 'COMPOUND_INTEREST';
                loan_amount := 12000.00 + (i * 250);
                interest_rate := 2.2;
                installments_count := 24;
            WHEN 5 THEN 
                -- PARTICULAR - Valores variados
                loan_model := 'PARTICULAR';
                loan_amount := 8000.00 + (i * 180);
                interest_rate := 2.5;
                installments_count := 20;
            ELSE 
                -- PRICE - Valores menores
                loan_model := 'PRICE';
                loan_amount := 6000.00 + (i * 120);
                interest_rate := 1.8;
                installments_count := 12;
        END CASE;
        
        -- Distribuir entre as duas datas: 12/01 e 13/01
        -- Primeiros 25 clientes vencem em 12/01, próximos 25 em 13/01
        IF i <= 25 THEN
            data_vencimento := MAKE_DATE(ano_atual, 1, 12); -- 12/01
        ELSE
            data_vencimento := MAKE_DATE(ano_atual, 1, 13); -- 13/01
        END IF;
        
        -- Calcular data de início (1 mês antes do vencimento)
        start_date := data_vencimento - INTERVAL '1 month';
        
        -- Calcular taxa decimal
        rate_decimal := interest_rate / 100.0;
        amortization_base := loan_amount / installments_count;
        
        -- Calcular total_amount e parcelas
        total_amount := 0;
        remaining_principal := loan_amount;
        
        -- Calcular parcela PRICE se necessário
        IF loan_model = 'PRICE' THEN
            price_installment := calculate_price_installment(loan_amount, rate_decimal, installments_count);
        END IF;
        
        -- Calcular total_amount somando todas as parcelas
        FOR parcela_num IN 1..installments_count LOOP
            CASE loan_model
                WHEN 'FIXED_AMORTIZATION' THEN
                    parcela_principal := amortization_base;
                    parcela_interest := 0;
                    parcela_amount := amortization_base;
                WHEN 'SIMPLE_INTEREST' THEN
                    parcela_interest := loan_amount * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                WHEN 'COMPOUND_INTEREST' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := LEAST(amortization_base, remaining_principal);
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := remaining_principal + parcela_interest - parcela_principal;
                WHEN 'SAC' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := remaining_principal - parcela_principal;
                WHEN 'PRICE' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := price_installment - parcela_interest;
                    parcela_amount := price_installment;
                    remaining_principal := remaining_principal - parcela_principal;
                WHEN 'PARTICULAR' THEN
                    parcela_interest := loan_amount * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := GREATEST(0, remaining_principal - parcela_principal);
                ELSE
                    parcela_interest := 0;
                    parcela_principal := amortization_base;
                    parcela_amount := amortization_base;
            END CASE;
            
            total_amount := total_amount + parcela_amount;
        END LOOP;
        
        -- Inserir cliente
        INSERT INTO public.clients (
            id,
            tenant_id,
            nome,
            nome_completo,
            cpf_cnpj,
            tipo_pessoa,
            email,
            telefone,
            celular,
            whatsapp,
            endereco,
            cidade,
            estado,
            cep,
            renda_mensal,
            profissao,
            ativo
        ) VALUES (
            cliente_id,
            '00000000-0000-0000-0000-000000000001',
            nome_cliente,
            nome_cliente || ' Completo',
            cpf_base,
            'PF',
            'cliente' || i || '@teste.com',
            CASE WHEN i % 3 = 0 THEN telefone_base ELSE NULL END,  -- 1/3 tem telefone
            CASE WHEN i % 3 = 1 THEN celular_base ELSE NULL END,   -- 1/3 tem celular
            CASE WHEN i % 3 = 2 THEN whatsapp_base ELSE NULL END, -- 1/3 tem whatsapp
            'Rua Teste ' || i,
            'São Paulo',
            'SP',
            '01000-' || LPAD(i::TEXT, 3, '0'),
            2000.00 + (i * 100),
            'Profissão ' || i,
            true
        )
        ON CONFLICT (tenant_id, cpf_cnpj) DO NOTHING;
        
        -- Inserir empréstimo (loan)
        INSERT INTO public.loans (
            id,
            tenant_id,
            client_id,
            amount,
            interest_rate,
            total_amount,
            outstanding_amount,
            start_date,
            installments_count,
            model,
            status,
            promissory_note
        ) VALUES (
            loan_id,
            '00000000-0000-0000-0000-000000000001',
            cliente_id,
            loan_amount,
            interest_rate,
            total_amount,
            total_amount, -- outstanding_amount inicial = total_amount
            start_date,
            installments_count,
            loan_model,
            'open',
            jsonb_build_object(
                'capital', loan_amount,
                'interestRate', interest_rate,
                'issueDate', start_date::TEXT,
                'dueDate', data_vencimento::TEXT,
                'indication', 'Sem Garantia',
                'numberHash', MD5(loan_id::TEXT),
                'observation', ''
            )
        );
        
        -- Recriar variáveis para calcular parcelas novamente
        remaining_principal := loan_amount;
        IF loan_model = 'PRICE' THEN
            price_installment := calculate_price_installment(loan_amount, rate_decimal, installments_count);
        END IF;
        
        -- Criar todas as parcelas (installments)
        FOR parcela_num IN 1..installments_count LOOP
            -- Calcular data de vencimento da parcela
            parcela_due_date := start_date + (parcela_num || ' months')::INTERVAL;
            
            -- Calcular valores da parcela conforme modelo
            CASE loan_model
                WHEN 'FIXED_AMORTIZATION' THEN
                    parcela_principal := amortization_base;
                    parcela_interest := 0;
                    parcela_amount := amortization_base;
                WHEN 'SIMPLE_INTEREST' THEN
                    parcela_interest := loan_amount * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                WHEN 'COMPOUND_INTEREST' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := LEAST(amortization_base, remaining_principal);
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := remaining_principal + parcela_interest - parcela_principal;
                WHEN 'SAC' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := remaining_principal - parcela_principal;
                WHEN 'PRICE' THEN
                    parcela_interest := remaining_principal * rate_decimal;
                    parcela_principal := price_installment - parcela_interest;
                    parcela_amount := price_installment;
                    remaining_principal := remaining_principal - parcela_principal;
                WHEN 'PARTICULAR' THEN
                    parcela_interest := loan_amount * rate_decimal;
                    parcela_principal := amortization_base;
                    parcela_amount := parcela_principal + parcela_interest;
                    remaining_principal := GREATEST(0, remaining_principal - parcela_principal);
                ELSE
                    parcela_interest := 0;
                    parcela_principal := amortization_base;
                    parcela_amount := amortization_base;
            END CASE;
            
            -- Definir status da parcela
            -- Apenas a primeira parcela vence em 12/01 ou 13/01
            IF parcela_num = 1 THEN
                parcela_due_date := data_vencimento;
                parcela_status := CASE 
                    WHEN random() < 0.7 THEN 'PENDING'  -- 70% pendente
                    ELSE 'LATE'                          -- 30% atrasado
                END;
            ELSE
                -- Outras parcelas ficam como PENDING
                parcela_status := 'PENDING';
            END IF;
            
            -- Inserir parcela apenas se for a primeira (vencendo em 12/01 ou 13/01)
            -- OU se quiser criar todas as parcelas, descomente a condição abaixo
            IF parcela_num = 1 THEN
                INSERT INTO public.installments (
                    id,
                    tenant_id,
                    loan_id,
                    client_id,
                    number,
                    due_date,
                    amount,
                    amount_paid,
                    interest_amount,
                    principal_amount,
                    status
                ) VALUES (
                    gen_random_uuid(),
                    '00000000-0000-0000-0000-000000000001',
                    loan_id,
                    cliente_id,
                    parcela_num,
                    parcela_due_date,
                    ROUND(parcela_amount, 2),
                    0,
                    ROUND(parcela_interest, 2),
                    ROUND(parcela_principal, 2),
                    parcela_status
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 4. VERIFICAÇÃO - CONSULTA PARA VALIDAR OS DADOS
-- ============================================================================
-- Esta query mostra as parcelas vencendo em 12/01 e 13/01
-- NOTA: O workflow do n8n precisa ser atualizado para usar esta estrutura
SELECT 
    inst.id as parcela_id,
    inst.number as numero_parcela,
    inst.amount as valor_parcela,
    inst.due_date as data_vencimento,
    inst.status,
    c.id as cliente_id,
    c.nome as cliente_nome,
    c.whatsapp,
    c.celular,
    c.telefone,
    l.id as loan_id,
    l.amount as valor_emprestado,
    l.total_amount as valor_total,
    l.model as modelo_emprestimo
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
JOIN public.clients c ON inst.client_id = c.id
WHERE inst.due_date IN (
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 12),  -- 12/01
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 13)   -- 13/01
)
  AND inst.status IN ('PENDING', 'LATE')
  AND c.ativo = true
  AND (c.whatsapp IS NOT NULL OR c.celular IS NOT NULL OR c.telefone IS NOT NULL)
ORDER BY inst.due_date, c.nome;

-- ============================================================================
-- 5. RESUMO ESTATÍSTICO
-- ============================================================================
SELECT 
    'Total de Clientes Criados' as descricao,
    COUNT(*)::TEXT as valor
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Clientes com WhatsApp' as descricao,
    COUNT(*)::TEXT as valor
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND whatsapp IS NOT NULL

UNION ALL

SELECT 
    'Clientes com Celular' as descricao,
    COUNT(*)::TEXT as valor
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND celular IS NOT NULL

UNION ALL

SELECT 
    'Clientes com Telefone' as descricao,
    COUNT(*)::TEXT as valor
FROM public.clients
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND telefone IS NOT NULL

UNION ALL

SELECT 
    'Empréstimos Criados' as descricao,
    COUNT(*)::TEXT as valor
FROM public.loans
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Parcelas Vencendo 12/01' as descricao,
    COUNT(*)::TEXT as valor
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
WHERE inst.due_date = MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 12)
  AND inst.status IN ('PENDING', 'LATE')
  AND l.tenant_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Parcelas Vencendo 13/01' as descricao,
    COUNT(*)::TEXT as valor
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
WHERE inst.due_date = MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 13)
  AND inst.status IN ('PENDING', 'LATE')
  AND l.tenant_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Total Parcelas (12/01 + 13/01)' as descricao,
    COUNT(*)::TEXT as valor
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
WHERE inst.due_date IN (
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 12),
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 13)
)
  AND inst.status IN ('PENDING', 'LATE')
  AND l.tenant_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- 6. CONSULTA POR MODELO E DATA
-- ============================================================================
-- Visualizar distribuição de valores e modelos por data de vencimento
SELECT 
    inst.due_date as data_vencimento,
    l.model as modelo,
    COUNT(*) as quantidade_parcelas,
    MIN(inst.amount) as valor_minimo,
    MAX(inst.amount) as valor_maximo,
    AVG(inst.amount)::NUMERIC(15,2) as valor_medio,
    SUM(inst.amount)::NUMERIC(15,2) as valor_total
FROM public.installments inst
JOIN public.loans l ON inst.loan_id = l.id
WHERE inst.due_date IN (
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 12),
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 13)
)
  AND inst.status IN ('PENDING', 'LATE')
  AND l.tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY inst.due_date, l.model
ORDER BY inst.due_date, l.model;

-- ============================================================================
-- 7. QUERY PARA ATUALIZAR O WORKFLOW DO N8N
-- ============================================================================
-- Use esta query no n8n ao invés da query antiga que usa 'parcelas' e 'propostas'
-- 
-- SELECT 
--   inst.id as parcela_id,
--   inst.number as numero_parcela,
--   inst.amount as valor_parcela,
--   inst.due_date as data_vencimento,
--   inst.status,
--   c.id as cliente_id,
--   c.nome as cliente_nome,
--   c.whatsapp,
--   c.celular,
--   c.telefone,
--   l.id as loan_id,
--   l.total_amount as valor_aprovado
-- FROM public.installments inst
-- JOIN public.loans l ON inst.loan_id = l.id
-- JOIN public.clients c ON inst.client_id = c.id
-- WHERE inst.due_date = CURRENT_DATE
--   AND inst.status IN ('PENDING', 'LATE')
--   AND c.ativo = true
--   AND (c.whatsapp IS NOT NULL OR c.celular IS NOT NULL OR c.telefone IS NOT NULL)
-- ORDER BY inst.due_date, c.nome;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Após executar este script:
-- 1. Os dados estarão na estrutura correta (loans e installments)
-- 2. As parcelas estarão calculadas corretamente conforme os modelos de empréstimo
-- 3. 25 parcelas vencem em 12/01 e 25 em 13/01
-- 4. IMPORTANTE: Atualize o workflow do n8n para usar a query da seção 7 acima
-- ============================================================================
