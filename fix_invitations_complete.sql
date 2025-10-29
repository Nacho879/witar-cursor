-- Script completo para corregir la tabla invitations
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar estructura actual de la tabla invitations
SELECT 
  'Estructura actual de invitations' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
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
        RAISE NOTICE 'Columna first_name agregada';
    ELSE
        RAISE NOTICE 'Columna first_name ya existe';
    END IF;

    -- Agregar last_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'last_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Columna last_name agregada';
    ELSE
        RAISE NOTICE 'Columna last_name ya existe';
    END IF;

    -- Agregar department_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'department_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN department_id UUID REFERENCES departments(id);
        RAISE NOTICE 'Columna department_id agregada';
    ELSE
        RAISE NOTICE 'Columna department_id ya existe';
    END IF;

    -- Agregar supervisor_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'supervisor_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN supervisor_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Columna supervisor_id agregada';
    ELSE
        RAISE NOTICE 'Columna supervisor_id ya existe';
    END IF;

    -- Agregar token si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'token'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN token TEXT UNIQUE;
        RAISE NOTICE 'Columna token agregada';
    ELSE
        RAISE NOTICE 'Columna token ya existe';
    END IF;

    -- Agregar expires_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'expires_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN expires_at TIMESTAMPTZ;
        RAISE NOTICE 'Columna expires_at agregada';
    ELSE
        RAISE NOTICE 'Columna expires_at ya existe';
    END IF;

    -- Agregar status si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invitations' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invitations ADD COLUMN status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Columna status agregada';
    ELSE
        RAISE NOTICE 'Columna status ya existe';
    END IF;
END $$;

-- 3. Verificar estructura final
SELECT 
  'Estructura final de invitations' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar que las columnas necesarias existen
SELECT 
  'Verificación de columnas requeridas' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'first_name'
  ) THEN '✅ first_name' ELSE '❌ first_name' END as first_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'last_name'
  ) THEN '✅ last_name' ELSE '❌ last_name' END as last_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'email'
  ) THEN '✅ email' ELSE '❌ email' END as email,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'role'
  ) THEN '✅ role' ELSE '❌ role' END as role,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'token'
  ) THEN '✅ token' ELSE '❌ token' END as token,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'expires_at'
  ) THEN '✅ expires_at' ELSE '❌ expires_at' END as expires_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'status'
  ) THEN '✅ status' ELSE '❌ status' END as status;

SELECT '✅ Tabla invitations corregida' as resultado;
