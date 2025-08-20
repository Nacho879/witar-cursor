-- Script para añadir campos de nombre y apellido a la tabla invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Añadir campos de nombre y apellido
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- 2. Añadir comentarios
COMMENT ON COLUMN invitations.first_name IS 'Nombre del usuario invitado';
COMMENT ON COLUMN invitations.last_name IS 'Apellido del usuario invitado';

-- 3. Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_invitations_name_search ON invitations(first_name, last_name);

-- 4. Verificar la estructura actual de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position; 