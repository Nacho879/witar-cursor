-- Añadir columna sent_at a la tabla invitations
-- Esta columna se usa para rastrear cuándo se envió la invitación

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Añadir comentario para documentar el propósito de la columna
COMMENT ON COLUMN invitations.sent_at IS 'Timestamp cuando se envió la invitación por email';

-- Crear índice para mejorar el rendimiento de consultas por fecha de envío
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON invitations(sent_at); 