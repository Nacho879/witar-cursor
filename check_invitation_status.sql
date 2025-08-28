-- Script para verificar y corregir la restricción de status en invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar la restricción actual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass 
AND contype = 'c';

-- 2. Verificar los valores actuales de status
SELECT status, COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- 3. Verificar la estructura de la columna status
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND column_name = 'status';

-- 4. Eliminar la restricción existente si es muy restrictiva
ALTER TABLE invitations 
DROP CONSTRAINT IF EXISTS invitations_status_check;

-- 5. Crear una nueva restricción que incluya 'sent'
ALTER TABLE invitations 
ADD CONSTRAINT invitations_status_check 
CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled'));

-- 6. Verificar que la restricción se aplicó correctamente
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass 
AND contype = 'c'; 