-- Script para verificar y corregir el estado del período de prueba para ilopez@witar.es
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar la empresa de ilopez@witar.es
SELECT 
  'Información de la empresa' as info,
  c.id,
  c.name,
  c.created_at,
  c.subscription_status,
  c.status,
  EXTRACT(DAY FROM (NOW() - c.created_at)) as dias_desde_creacion
FROM companies c
JOIN user_company_roles ucr ON c.id = ucr.company_id
JOIN auth.users u ON ucr.user_id = u.id
WHERE u.email = 'ilopez@witar.es'
  AND ucr.role = 'owner'
  AND ucr.is_active = true;

-- 2. Verificar empleados actuales de la empresa
SELECT 
  'Empleados actuales' as info,
  COUNT(*) as total_empleados,
  COUNT(CASE WHEN ucr.role = 'owner' THEN 1 END) as owners,
  COUNT(CASE WHEN ucr.role != 'owner' AND ucr.is_active = true THEN 1 END) as empleados_activos
FROM user_company_roles ucr
JOIN auth.users u ON ucr.user_id = u.id
WHERE ucr.company_id = (
  SELECT c.id 
  FROM companies c
  JOIN user_company_roles ucr2 ON c.id = ucr2.company_id
  JOIN auth.users u2 ON ucr2.user_id = u2.id
  WHERE u2.email = 'ilopez@witar.es'
    AND ucr2.role = 'owner'
    AND ucr2.is_active = true
);

-- 3. Verificar si la empresa está en período de prueba
WITH company_info AS (
  SELECT 
    c.id,
    c.name,
    c.created_at,
    c.subscription_status,
    c.status,
    EXTRACT(DAY FROM (NOW() - c.created_at)) as dias_desde_creacion
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  JOIN auth.users u ON ucr.user_id = u.id
  WHERE u.email = 'ilopez@witar.es'
    AND ucr.role = 'owner'
    AND ucr.is_active = true
)
SELECT 
  'Estado del período de prueba' as info,
  id,
  name,
  dias_desde_creacion,
  CASE 
    WHEN dias_desde_creacion < 14 AND subscription_status != 'active' THEN 'EN PERÍODO DE PRUEBA'
    WHEN dias_desde_creacion >= 14 AND subscription_status != 'active' THEN 'PERÍODO DE PRUEBA EXPIRADO'
    WHEN subscription_status = 'active' THEN 'SUSCRIPCIÓN ACTIVA'
    ELSE 'ESTADO DESCONOCIDO'
  END as estado_empresa,
  CASE 
    WHEN dias_desde_creacion < 14 AND subscription_status != 'active' THEN 14 - dias_desde_creacion
    ELSE 0
  END as dias_restantes_prueba
FROM company_info;

-- 4. Si la empresa está en período de prueba, asegurar que no esté bloqueada
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL
WHERE id = (
  SELECT c.id 
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  JOIN auth.users u ON ucr.user_id = u.id
  WHERE u.email = 'ilopez@witar.es'
    AND ucr.role = 'owner'
    AND ucr.is_active = true
)
AND EXTRACT(DAY FROM (NOW() - created_at)) < 14
AND subscription_status != 'active';

-- 5. Verificar el resultado final
SELECT 
  'Estado final de la empresa' as info,
  c.id,
  c.name,
  c.status,
  c.subscription_status,
  EXTRACT(DAY FROM (NOW() - c.created_at)) as dias_desde_creacion,
  CASE 
    WHEN EXTRACT(DAY FROM (NOW() - c.created_at)) < 14 AND c.subscription_status != 'active' THEN 'EN PERÍODO DE PRUEBA - EMPLEADOS ILIMITADOS'
    ELSE 'APLICAR LÍMITES NORMALES'
  END as politica_empleados
FROM companies c
JOIN user_company_roles ucr ON c.id = ucr.company_id
JOIN auth.users u ON ucr.user_id = u.id
WHERE u.email = 'ilopez@witar.es'
  AND ucr.role = 'owner'
  AND ucr.is_active = true;

SELECT '✅ Verificación completada para ilopez@witar.es' as resultado;
