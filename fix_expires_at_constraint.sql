-- Script para permitir valores NULL en expires_at
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar la estructura actual de la columna expires_at
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
  AND column_name = 'expires_at';

-- 2. Modificar la columna para permitir NULL
ALTER TABLE invitations 
ALTER COLUMN expires_at DROP NOT NULL;

-- 3. Verificar el cambio
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
  AND column_name = 'expires_at';

-- 4. Actualizar invitaciones aceptadas para establecer expires_at como NULL
UPDATE invitations 
SET expires_at = NULL
WHERE status = 'accepted';

-- 5. Verificar el resultado
SELECT 
  status,
  COUNT(*) as count,
  COUNT(expires_at) as with_expires_at,
  COUNT(*) - COUNT(expires_at) as without_expires_at
FROM invitations 
GROUP BY status
ORDER BY status; 