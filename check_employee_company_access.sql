-- =====================================================
-- VERIFICAR ACCESO DE EMPLEADO A SU EMPRESA
-- Ejecutar esto para diagnosticar el problema específico
-- =====================================================

-- Reemplaza 'USER_ID_DEL_EMPLEADO' con el ID del usuario afectado
-- Puedes obtenerlo de la consola del navegador o de auth.users

-- 1. Verificar el rol del empleado
SELECT 
  '👤 Información del empleado' as info,
  ucr.id as role_id,
  ucr.user_id,
  ucr.company_id,
  ucr.role,
  ucr.is_active,
  up.full_name,
  au.email
FROM user_company_roles ucr
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.user_id = 'USER_ID_DEL_EMPLEADO'  -- ⚠️ REEMPLAZA ESTO
AND ucr.is_active = true;

-- 2. Verificar el estado de la empresa del empleado
SELECT 
  '🏢 Estado de la empresa' as info,
  c.id,
  c.name,
  c.status,
  c.blocked_at,
  c.blocked_reason,
  c.created_at
FROM companies c
WHERE c.id = (
  SELECT company_id 
  FROM user_company_roles 
  WHERE user_id = 'USER_ID_DEL_EMPLEADO'  -- ⚠️ REEMPLAZA ESTO
  AND is_active = true
  LIMIT 1
);

-- 3. Verificar si el JOIN funcionaría (simular la consulta)
SELECT 
  '🔍 Simulación del JOIN' as info,
  ucr.id as role_id,
  ucr.company_id,
  c.id as company_exists,
  c.name as company_name,
  c.status as company_status
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = 'USER_ID_DEL_EMPLEADO'  -- ⚠️ REEMPLAZA ESTO
AND ucr.is_active = true;

-- 4. Si la empresa está bloqueada, reactivarla
-- ⚠️ DESCOMENTA ESTAS LÍNEAS SI LA EMPRESA ESTÁ BLOQUEADA
/*
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE id = (
  SELECT company_id 
  FROM user_company_roles 
  WHERE user_id = 'USER_ID_DEL_EMPLEADO'  -- ⚠️ REEMPLAZA ESTO
  AND is_active = true
  LIMIT 1
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

SELECT '✅ Empresa reactivada' as resultado;
*/

