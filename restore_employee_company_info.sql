-- =====================================================
-- RESTAURAR INFORMACIÓN DE EMPRESA PARA EMPLEADOS
-- Este script corrige empleados que perdieron información de empresa
-- después del bloqueo/desbloqueo del período de prueba
-- =====================================================

-- 1. DIAGNÓSTICO: Identificar empleados afectados
-- Empleados con company_id válido pero empresa bloqueada o inaccesible
WITH empleados_afectados AS (
  SELECT 
    ucr.id as role_id,
    ucr.user_id,
    ucr.company_id,
    ucr.role,
    ucr.is_active,
    c.id as company_exists,
    c.name as company_name,
    c.status as company_status,
    c.blocked_at,
    up.full_name,
    au.email
  FROM user_company_roles ucr
  LEFT JOIN companies c ON ucr.company_id = c.id
  LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
  LEFT JOIN auth.users au ON ucr.user_id = au.id
  WHERE ucr.is_active = true
  AND (
    -- Empresa no existe
    c.id IS NULL
    -- O empresa está bloqueada
    OR c.status = 'blocked'
    OR c.blocked_at IS NOT NULL
  )
)
SELECT 
  '📊 DIAGNÓSTICO: Empleados afectados' as info,
  COUNT(*) as total_empleados_afectados,
  COUNT(DISTINCT company_id) as empresas_afectadas
FROM empleados_afectados;

-- 2. Mostrar detalles de empleados afectados
SELECT 
  '👥 Detalles de empleados afectados' as info,
  ucr.user_id,
  ucr.company_id,
  up.full_name,
  au.email,
  c.name as company_name,
  c.status as company_status,
  c.blocked_at,
  CASE 
    WHEN c.id IS NULL THEN '❌ Empresa no existe'
    WHEN c.status = 'blocked' THEN '🔒 Empresa bloqueada'
    WHEN c.blocked_at IS NOT NULL THEN '⏸️ Empresa con blocked_at'
    ELSE '❓ Estado desconocido'
  END as problema
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.is_active = true
AND (
  c.id IS NULL
  OR c.status = 'blocked'
  OR c.blocked_at IS NOT NULL
)
ORDER BY c.id, up.full_name;

-- 3. Verificar empresas que necesitan ser reactivadas
SELECT 
  '🏢 Empresas que necesitan reactivación' as info,
  c.id,
  c.name,
  c.status,
  c.blocked_at,
  c.blocked_reason,
  COUNT(ucr.id) as empleados_activos
FROM companies c
INNER JOIN user_company_roles ucr ON c.id = ucr.company_id
WHERE ucr.is_active = true
AND (c.status = 'blocked' OR c.blocked_at IS NOT NULL)
GROUP BY c.id, c.name, c.status, c.blocked_at, c.blocked_reason
ORDER BY empleados_activos DESC;

-- 4. SOLUCIÓN: Reactivar empresas bloqueadas que tienen empleados activos
-- IMPORTANTE: Deshabilitar RLS temporalmente para permitir la actualización
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Reactivar empresas que están bloqueadas pero tienen empleados activos
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT c.id
  FROM companies c
  INNER JOIN user_company_roles ucr ON c.id = ucr.company_id
  WHERE ucr.is_active = true
  AND (c.status = 'blocked' OR c.blocked_at IS NOT NULL)
);

-- Volver a habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 5. Verificar el resultado después de la corrección
SELECT 
  '✅ RESULTADO: Empresas reactivadas' as info,
  c.id,
  c.name,
  c.status,
  c.blocked_at,
  COUNT(ucr.id) as empleados_activos
FROM companies c
INNER JOIN user_company_roles ucr ON c.id = ucr.company_id
WHERE ucr.is_active = true
AND c.id IN (
  SELECT DISTINCT company_id
  FROM user_company_roles
  WHERE is_active = true
)
GROUP BY c.id, c.name, c.status, c.blocked_at
ORDER BY empleados_activos DESC;

-- 6. Verificar empleados que aún tienen problemas (empresas que no existen)
SELECT 
  '⚠️ ATENCIÓN: Empleados con company_id que no existe' as info,
  ucr.user_id,
  ucr.company_id,
  up.full_name,
  au.email,
  '❌ Esta empresa no existe en la tabla companies' as problema
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.is_active = true
AND c.id IS NULL
ORDER BY ucr.company_id, up.full_name;

-- 7. Resumen final
SELECT 
  '📈 RESUMEN FINAL' as info,
  (SELECT COUNT(*) FROM user_company_roles WHERE is_active = true) as total_empleados_activos,
  (SELECT COUNT(DISTINCT company_id) FROM user_company_roles WHERE is_active = true) as total_empresas_con_empleados,
  (SELECT COUNT(*) FROM companies WHERE status = 'active') as empresas_activas,
  (SELECT COUNT(*) FROM companies WHERE status = 'blocked') as empresas_bloqueadas,
  (SELECT COUNT(*) 
   FROM user_company_roles ucr 
   LEFT JOIN companies c ON ucr.company_id = c.id 
   WHERE ucr.is_active = true AND c.id IS NULL) as empleados_sin_empresa;

SELECT '🎉 Proceso de restauración completado' as resultado;

