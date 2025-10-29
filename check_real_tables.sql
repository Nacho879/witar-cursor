-- Script para verificar qué tablas realmente existen
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar todas las tablas en el esquema 'auth'
SELECT 
  'Tablas en esquema auth' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- 2. Verificar todas las tablas en el esquema 'public'
SELECT 
  'Tablas en esquema public' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Verificar si existe alguna configuración de auth
SELECT 
  'Configuraciones disponibles' as info,
  schemaname,
  tablename
FROM pg_tables 
WHERE tablename LIKE '%config%' OR tablename LIKE '%setting%'
ORDER BY schemaname, tablename;

-- 4. Verificar usuarios recientes
SELECT 
  'Usuarios recientes' as info,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

SELECT '✅ Verificación completada' as resultado;
