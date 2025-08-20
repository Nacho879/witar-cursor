-- Script para arreglar la restricción de status en la tabla invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar la restricción actual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass 
AND contype = 'c';

-- 2. Eliminar la restricción existente si existe
ALTER TABLE invitations 
DROP CONSTRAINT IF EXISTS invitations_status_check;

-- 3. Crear una nueva restricción que incluya todos los estados necesarios
ALTER TABLE invitations 
ADD CONSTRAINT invitations_status_check 
CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled'));

-- 4. Verificar que la columna status existe y tiene el tipo correcto
DO $$
BEGIN
    -- Si la columna no existe, crearla
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' AND column_name = 'status'
    ) THEN
        ALTER TABLE invitations ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    -- Asegurar que el tipo sea VARCHAR
    ALTER TABLE invitations 
    ALTER COLUMN status TYPE VARCHAR(50);
    
    -- Establecer el valor por defecto
    ALTER TABLE invitations 
    ALTER COLUMN status SET DEFAULT 'pending';
END $$;

-- 5. Mostrar la estructura actual de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position;

-- 6. Mostrar las restricciones actuales
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass; 