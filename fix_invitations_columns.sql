-- Script para añadir columnas faltantes a la tabla invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Añadir columna sent_at
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- 2. Añadir columna temp_password
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);

-- 3. Añadir columna expires_at si no existe
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- 4. Añadir columna token si no existe
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid();

-- 5. Añadir comentarios
COMMENT ON COLUMN invitations.sent_at IS 'Timestamp cuando se envió la invitación por email';
COMMENT ON COLUMN invitations.temp_password IS 'Contraseña temporal generada para el usuario invitado';
COMMENT ON COLUMN invitations.expires_at IS 'Fecha de expiración de la invitación';
COMMENT ON COLUMN invitations.token IS 'Token único para el enlace de invitación';

-- 6. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON invitations(sent_at);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- 7. Verificar que la columna status existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'status'
    ) THEN
        ALTER TABLE invitations ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

-- 8. Mostrar la estructura actual de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position; 