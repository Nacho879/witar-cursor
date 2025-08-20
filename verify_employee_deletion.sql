-- Script para verificar la eliminación de empleados
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Ver el total de empleados activos en la empresa
SELECT 
  role,
  COUNT(*) as total_employees
FROM user_company_roles 
WHERE company_id = 'TU_COMPANY_ID' -- Reemplaza con tu company_id real
  AND is_active = true
GROUP BY role
ORDER BY role;

-- 2. Ver empleados recientemente eliminados (inactivos)
SELECT 
  ucr.id,
  ucr.user_id,
  ucr.role,
  ucr.is_active,
  ucr.joined_at,
  ucr.left_at,
  up.full_name
FROM user_company_roles ucr
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
WHERE ucr.company_id = 'TU_COMPANY_ID' -- Reemplaza con tu company_id real
  AND ucr.is_active = false
ORDER BY ucr.left_at DESC
LIMIT 10;

-- 3. Verificar que no hay registros huérfanos
-- (Esta consulta te mostrará si hay registros sin usuario asociado)
SELECT 
  'time_entries' as table_name,
  COUNT(*) as orphaned_records
FROM time_entries te
LEFT JOIN user_company_roles ucr ON te.user_id = ucr.user_id
WHERE ucr.user_id IS NULL
  AND te.company_id = 'TU_COMPANY_ID' -- Reemplaza con tu company_id real

UNION ALL

SELECT 
  'requests' as table_name,
  COUNT(*) as orphaned_records
FROM requests r
LEFT JOIN user_company_roles ucr ON r.user_id = ucr.user_id
WHERE ucr.user_id IS NULL
  AND r.company_id = 'TU_COMPANY_ID' -- Reemplaza con tu company_id real

UNION ALL

SELECT 
  'documents' as table_name,
  COUNT(*) as orphaned_records
FROM documents d
LEFT JOIN user_company_roles ucr ON d.user_id = ucr.user_id
WHERE ucr.user_id IS NULL
  AND d.company_id = 'TU_COMPANY_ID'; -- Reemplaza con tu company_id real

-- 4. Para verificar un empleado específico (reemplaza USER_ID_REAL con el UUID real)
-- SELECT 
--   'user_company_roles' as table_name, COUNT(*) as count 
-- FROM user_company_roles WHERE user_id = 'USER_ID_REAL'
-- UNION ALL
-- SELECT 'time_entries', COUNT(*) FROM time_entries WHERE user_id = 'USER_ID_REAL'
-- UNION ALL
-- SELECT 'requests', COUNT(*) FROM requests WHERE user_id = 'USER_ID_REAL'
-- UNION ALL
-- SELECT 'documents', COUNT(*) FROM documents WHERE user_id = 'USER_ID_REAL'
-- UNION ALL
-- SELECT 'notifications', COUNT(*) FROM notifications WHERE user_id = 'USER_ID_REAL'; 