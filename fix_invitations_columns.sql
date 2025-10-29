-- Script para agregar las columnas faltantes a la tabla invitations
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar estructura actual de la tabla invitations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columnas faltantes si no existen
DO $$
BEGIN
    -- Agregar first_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'first_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN first_name TEXT;
    END IF;

    -- Agregar last_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'last_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- 3. Verificar estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ Columnas agregadas a la tabla invitations' as resultado;