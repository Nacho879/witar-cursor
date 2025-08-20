-- Script para arreglar las columnas de timestamps de invitaciones
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar la estructura actual de la tabla invitations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position;

-- 2. Añadir columnas de timestamps si no existen
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- 3. Añadir comentarios
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp cuando se aceptó la invitación';
COMMENT ON COLUMN invitations.expired_at IS 'Timestamp cuando expiró la invitación';
COMMENT ON COLUMN invitations.cancelled_at IS 'Timestamp cuando se canceló la invitación';
COMMENT ON COLUMN invitations.sent_at IS 'Timestamp cuando se envió la invitación';

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_at ON invitations(accepted_at);
CREATE INDEX IF NOT EXISTS idx_invitations_expired_at ON invitations(expired_at);
CREATE INDEX IF NOT EXISTS idx_invitations_cancelled_at ON invitations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON invitations(sent_at);

-- 5. Actualizar invitaciones existentes que ya expiraron
UPDATE invitations 
SET status = 'expired', expired_at = expires_at
WHERE status IN ('pending', 'sent') 
AND expires_at < NOW();

-- 6. Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND column_name IN ('status', 'accepted_at', 'expired_at', 'cancelled_at', 'sent_at', 'expires_at', 'created_at')
ORDER BY ordinal_position;

-- 7. Mostrar algunas invitaciones de ejemplo
SELECT id, email, status, created_at, expires_at, accepted_at, expired_at, cancelled_at, sent_at
FROM invitations 
ORDER BY created_at DESC 
LIMIT 5; 