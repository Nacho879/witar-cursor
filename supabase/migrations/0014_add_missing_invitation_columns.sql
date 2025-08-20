-- Añadir columnas faltantes a la tabla invitations
-- Estas columnas son necesarias para el sistema de invitaciones

-- 1. Columna sent_at para rastrear cuándo se envió la invitación
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- 2. Columna temp_password para almacenar la contraseña temporal
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);

-- 3. Columna expires_at si no existe (para el token de expiración)
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- 4. Columna token si no existe (para el enlace de invitación)
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid();

-- Añadir comentarios para documentar el propósito de las columnas
COMMENT ON COLUMN invitations.sent_at IS 'Timestamp cuando se envió la invitación por email';
COMMENT ON COLUMN invitations.temp_password IS 'Contraseña temporal generada para el usuario invitado';
COMMENT ON COLUMN invitations.expires_at IS 'Fecha de expiración de la invitación';
COMMENT ON COLUMN invitations.token IS 'Token único para el enlace de invitación';

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON invitations(sent_at);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- Verificar que todas las columnas necesarias existen
DO $$
BEGIN
    -- Verificar que la columna status existe y tiene los valores correctos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'status'
    ) THEN
        ALTER TABLE invitations ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    -- Asegurar que el enum de status tenga los valores correctos
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'invitation_status_enum'
    ) THEN
        CREATE TYPE invitation_status_enum AS ENUM ('pending', 'sent', 'accepted', 'expired', 'cancelled');
    END IF;
    
    -- Actualizar la columna status si es necesario
    ALTER TABLE invitations 
    ALTER COLUMN status TYPE invitation_status_enum 
    USING status::invitation_status_enum;
    
EXCEPTION
    WHEN duplicate_object THEN
        -- El tipo ya existe, continuar
        NULL;
END $$; 