-- Script para activar TODAS las empresas en la base de datos (sin importar suscripción)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ⚠️ ADVERTENCIA: Este script activará TODAS las empresas, incluso las que no tienen suscripción

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

-- 2. Mostrar todas las empresas que se van a activar
SELECT 
  'Todas las empresas que se activarán' as info,
  c.id,
  c.name,
  c.status as estado_actual,
  COALESCE(s.status, 'sin_suscripcion') as subscription_status,
  c.blocked_at,
  c.blocked_reason,
  c.created_at
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active'
WHERE c.status != 'active' OR c.blocked_at IS NOT NULL
ORDER BY c.created_at DESC;

-- 3. Activar TODAS las empresas (sin importar su estado de suscripción)
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE status != 'active' OR blocked_at IS NOT NULL;

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

-- 5. Mostrar resumen final
SELECT 
  'Resumen final' as info,
  COUNT(*) FILTER (WHERE c.status = 'active' AND s.status = 'active') as empresas_activas_con_suscripcion,
  COUNT(*) FILTER (WHERE c.status = 'active' AND (s.status IS NULL OR s.status != 'active')) as empresas_activas_sin_suscripcion,
  COUNT(*) FILTER (WHERE c.status = 'trial') as empresas_en_prueba,
  COUNT(*) FILTER (WHERE c.status = 'blocked') as empresas_bloqueadas,
  COUNT(*) as total_empresas
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active';

-- 6. Listar todas las empresas activadas
SELECT 
  'Lista de todas las empresas activadas' as info,
  c.id,
  c.name,
  c.status,
  COALESCE(s.status, 'sin_suscripcion') as subscription_status,
  c.created_at
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status = 'active'
WHERE c.status = 'active'
ORDER BY c.created_at DESC;

SELECT '✅ Todas las empresas han sido activadas' as resultado;

