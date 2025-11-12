-- Script para activar todas las empresas en la base de datos
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Ver estado actual de las empresas antes de activar
SELECT 
  'Estado ANTES de activar' as info,
  c.status,
  COALESCE(s.status, 'sin_suscripcion') as subscription_status,
  COUNT(*) as cantidad
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active'
GROUP BY c.status, COALESCE(s.status, 'sin_suscripcion')
ORDER BY c.status, subscription_status;

-- 2. Mostrar empresas que se van a activar (con suscripción activa)
SELECT 
  'Empresas que se activarán (con suscripción activa)' as info,
  c.id,
  c.name,
  c.status as estado_actual,
  s.status as subscription_status,
  c.blocked_at,
  c.blocked_reason
FROM companies c
INNER JOIN subscriptions s ON c.id = s.company_id
WHERE s.status = 'active'
  AND (c.status != 'active' OR c.blocked_at IS NOT NULL)
ORDER BY c.created_at DESC;

-- 3. Activar todas las empresas que tengan suscripción activa
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT company_id 
  FROM subscriptions 
  WHERE status = 'active'
)
AND (status != 'active' OR blocked_at IS NOT NULL);

-- 4. Verificar el resultado
SELECT 
  'Estado DESPUÉS de activar' as info,
  c.status,
  COALESCE(s.status, 'sin_suscripcion') as subscription_status,
  COUNT(*) as cantidad
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active'
GROUP BY c.status, COALESCE(s.status, 'sin_suscripcion')
ORDER BY c.status, subscription_status;

-- 5. Mostrar resumen de empresas activadas
SELECT 
  'Resumen final' as info,
  COUNT(*) FILTER (WHERE c.status = 'active' AND s.status = 'active') as empresas_activas_con_suscripcion,
  COUNT(*) FILTER (WHERE c.status = 'active' AND (s.status IS NULL OR s.status != 'active')) as empresas_activas_sin_suscripcion,
  COUNT(*) FILTER (WHERE c.status = 'trial') as empresas_en_prueba,
  COUNT(*) FILTER (WHERE c.status = 'blocked') as empresas_bloqueadas,
  COUNT(*) as total_empresas
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active';

SELECT '✅ Activación de empresas completada' as resultado;

