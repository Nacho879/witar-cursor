-- Script para añadir timestamps de estados a las invitaciones
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Añadir columnas de timestamps
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Añadir comentarios
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp cuando se aceptó la invitación';
COMMENT ON COLUMN invitations.expired_at IS 'Timestamp cuando expiró la invitación';
COMMENT ON COLUMN invitations.cancelled_at IS 'Timestamp cuando se canceló la invitación';

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_at ON invitations(accepted_at);
CREATE INDEX IF NOT EXISTS idx_invitations_expired_at ON invitations(expired_at);
CREATE INDEX IF NOT EXISTS idx_invitations_cancelled_at ON invitations(cancelled_at);

-- 4. Actualizar invitaciones existentes que ya expiraron
UPDATE invitations 
SET status = 'expired', expired_at = expires_at
WHERE status IN ('pending', 'sent') 
AND expires_at < NOW();

-- 5. Verificar la estructura actual de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND column_name IN ('status', 'accepted_at', 'expired_at', 'cancelled_at', 'sent_at', 'expires_at')
ORDER BY ordinal_position; 