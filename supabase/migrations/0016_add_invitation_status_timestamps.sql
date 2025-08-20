-- Añadir timestamps para los diferentes estados de invitaciones
-- Esto permitirá rastrear cuándo cambió cada estado

-- Timestamp cuando se aceptó la invitación
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Timestamp cuando expiró la invitación
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Timestamp cuando se canceló la invitación
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Añadir comentarios para documentar el propósito de las columnas
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp cuando se aceptó la invitación';
COMMENT ON COLUMN invitations.expired_at IS 'Timestamp cuando expiró la invitación';
COMMENT ON COLUMN invitations.cancelled_at IS 'Timestamp cuando se canceló la invitación';

-- Crear índices para mejorar el rendimiento de consultas por estado
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_at ON invitations(accepted_at);
CREATE INDEX IF NOT EXISTS idx_invitations_expired_at ON invitations(expired_at);
CREATE INDEX IF NOT EXISTS idx_invitations_cancelled_at ON invitations(cancelled_at); 