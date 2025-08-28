-- Crear tabla para logs de emails
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimización
CREATE INDEX idx_email_logs_email_id ON email_logs(email_id);
CREATE INDEX idx_email_logs_event_type ON email_logs(event_type);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_timestamp ON email_logs(timestamp);

-- Habilitar RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para email_logs
-- Solo admins pueden ver logs de emails
CREATE POLICY "Admins can view email logs" ON email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.role = 'admin'
            AND ucr.is_active = true
        )
    );

-- Solo el sistema puede insertar logs
CREATE POLICY "System can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (true);

-- Función para limpiar logs antiguos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS void AS $$
BEGIN
    -- Eliminar logs más antiguos de 90 días
    DELETE FROM email_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql; 