-- Script simple para verificar la estructura de la base de datos
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar tablas de auth
SELECT 'auth' as schema, table_name FROM information_schema.tables WHERE table_schema = 'auth' ORDER BY table_name;

-- 2. Verificar tablas de public
SELECT 'public' as schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 3. Verificar usuarios recientes
SELECT email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 3;

SELECT 'Verificación completada' as resultado;
