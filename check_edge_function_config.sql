-- Script para verificar la configuración de la función Edge
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar que la función existe y está activa
SELECT 
  'Estado de la función' as info,
  name,
  created_at,
  updated_at,
  status
FROM supabase_functions.functions
WHERE name = 'send-invitation-email';

-- 2. Verificar variables de entorno críticas
SELECT 
  'Variables de entorno críticas' as info,
  name,
  CASE 
    WHEN value IS NOT NULL AND length(value) > 0 THEN '✅ Configurada'
    ELSE '❌ No configurada'
  END as status
FROM supabase_functions.secrets
WHERE name IN (
  'SUPABASE_URL', 
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY', 
  'RESEND_API_KEY', 
  'FRONTEND_URL'
)
ORDER BY name;

-- 3. Verificar logs recientes de la función
SELECT 
  'Logs recientes de la función' as info,
  timestamp,
  level,
  message,
  function_name
FROM supabase_functions.logs
WHERE function_name = 'send-invitation-email'
ORDER BY timestamp DESC
LIMIT 5;

-- 4. Verificar que las tablas relacionadas existen
SELECT 
  'Tablas relacionadas' as info,
  table_name,
  CASE 
    WHEN table_name IN (
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    ) THEN '✅ Existe'
    ELSE '❌ No existe'
  END as status
FROM (VALUES 
  ('invitations'),
  ('companies'),
  ('user_company_roles'),
  ('auth.users')
) AS t(table_name);

-- 5. Verificar permisos de la función
SELECT 
  'Permisos de la función' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'invitations'
AND grantee = 'service_role';

SELECT '✅ Verificación de función Edge completada' as resultado;
