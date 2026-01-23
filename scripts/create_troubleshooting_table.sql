-- Script para criar a tabela de relatórios de troubleshooting
-- Execute este script no banco de dados Supabase/PostgreSQL

-- Criar tabela de relatórios
CREATE TABLE IF NOT EXISTS troubleshooting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    specialist_type VARCHAR(50) NOT NULL CHECK (specialist_type IN ('infra', 'developer')),
    issues JSONB NOT NULL,
    diagnosis JSONB NOT NULL,
    action_plan JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'executed', 'failed', 'cancelled')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_result JSONB,
    execution_logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_troubleshooting_reports_timestamp 
    ON troubleshooting_reports(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_reports_status 
    ON troubleshooting_reports(status);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_reports_severity 
    ON troubleshooting_reports(severity);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_reports_specialist 
    ON troubleshooting_reports(specialist_type);

CREATE INDEX IF NOT EXISTS idx_troubleshooting_reports_pending 
    ON troubleshooting_reports(status, severity, timestamp DESC) 
    WHERE status = 'pending_approval';

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_troubleshooting_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_troubleshooting_reports_updated_at ON troubleshooting_reports;
CREATE TRIGGER trigger_update_troubleshooting_reports_updated_at
    BEFORE UPDATE ON troubleshooting_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_troubleshooting_reports_updated_at();

-- Criar view para relatórios pendentes
CREATE OR REPLACE VIEW vw_pending_troubleshooting_reports AS
SELECT 
    id,
    timestamp,
    specialist_type,
    severity,
    status,
    diagnosis->>'summary' as diagnosis_summary,
    jsonb_array_length(action_plan) as action_count,
    created_at,
    updated_at
FROM troubleshooting_reports
WHERE status = 'pending_approval'
ORDER BY 
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    timestamp DESC;

-- Criar view para estatísticas
CREATE OR REPLACE VIEW vw_troubleshooting_stats AS
SELECT 
    specialist_type,
    severity,
    status,
    COUNT(*) as count,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM troubleshooting_reports
GROUP BY specialist_type, severity, status
ORDER BY specialist_type, severity, status;

-- Comentários nas colunas
COMMENT ON TABLE troubleshooting_reports IS 'Relatórios de troubleshooting gerados pelo workflow n8n';
COMMENT ON COLUMN troubleshooting_reports.id IS 'ID único do relatório';
COMMENT ON COLUMN troubleshooting_reports.timestamp IS 'Timestamp do problema detectado';
COMMENT ON COLUMN troubleshooting_reports.specialist_type IS 'Tipo de especialista: infra ou developer';
COMMENT ON COLUMN troubleshooting_reports.issues IS 'JSON com problemas detectados';
COMMENT ON COLUMN troubleshooting_reports.diagnosis IS 'JSON com diagnóstico do especialista';
COMMENT ON COLUMN troubleshooting_reports.action_plan IS 'JSON com plano de ação';
COMMENT ON COLUMN troubleshooting_reports.severity IS 'Severidade: critical, high, medium, low';
COMMENT ON COLUMN troubleshooting_reports.status IS 'Status: pending_approval, approved, rejected, executed, failed, cancelled';
COMMENT ON COLUMN troubleshooting_reports.approved_by IS 'Usuário que aprovou o relatório';
COMMENT ON COLUMN troubleshooting_reports.approved_at IS 'Data/hora da aprovação';
COMMENT ON COLUMN troubleshooting_reports.executed_at IS 'Data/hora da execução';
COMMENT ON COLUMN troubleshooting_reports.execution_result IS 'JSON com resultado da execução';
COMMENT ON COLUMN troubleshooting_reports.execution_logs IS 'Logs da execução das ações';

-- Exemplo de query para ver relatórios pendentes
-- SELECT * FROM vw_pending_troubleshooting_reports;

-- Exemplo de query para ver estatísticas
-- SELECT * FROM vw_troubleshooting_stats;
