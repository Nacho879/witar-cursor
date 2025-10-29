-- Script para verificar la configuración de la función Edge
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar que la función existe
SELECT 
  'Funciones Edge disponibles' as info,
  name,
  created_at,
  updated_at
FROM supabase_functions.functions
WHERE name = 'send-invitation-email';

-- 2. Verificar variables de entorno de la función
SELECT 
  'Variables de entorno' as info,
  name,
  value
FROM supabase_functions.secrets
WHERE name IN ('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'FRONTEND_URL');

-- 3. Verificar logs recientes de la función (si están disponibles)
SELECT 
  'Logs recientes' as info,
  timestamp,
  level,
  message
FROM supabase_functions.logs
WHERE function_name = 'send-invitation-email'
ORDER BY timestamp DESC
LIMIT 10;

SELECT '✅ Verificación de función Edge completada' as resultado;
