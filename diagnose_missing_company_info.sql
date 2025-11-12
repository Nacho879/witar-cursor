-- =====================================================
-- DIAGNÓSTICO: Empleados sin información de empresa
-- =====================================================

-- 1. Verificar empleados que tienen user_company_roles pero sin información de empresa
SELECT 
    ucr.id as role_id,
    ucr.user_id,
    ucr.company_id,
    ucr.role,
    ucr.is_active,
    up.full_name,
    au.email,
    c.name as company_name,
    c.id as company_exists
FROM user_company_roles ucr
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
LEFT JOIN auth.users au ON ucr.user_id = au.id
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.is_active = true
ORDER BY 
    CASE WHEN c.id IS NULL THEN 0 ELSE 1 END,
    ucr.company_id;

-- 2. Contar empleados sin empresa asociada
SELECT 
    COUNT(*) as empleados_sin_empresa,
    COUNT(DISTINCT ucr.company_id) as company_ids_afectados
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.is_active = true
AND c.id IS NULL;

-- 3. Verificar company_ids que no existen en la tabla companies
SELECT DISTINCT
    ucr.company_id,
    COUNT(*) as num_empleados_afectados
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.is_active = true
AND c.id IS NULL
GROUP BY ucr.company_id;

-- 4. Verificar si hay empresas que fueron eliminadas pero tienen empleados activos
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(ucr.id) as empleados_activos
FROM companies c
INNER JOIN user_company_roles ucr ON c.id = ucr.company_id
WHERE ucr.is_active = true
GROUP BY c.id, c.name
ORDER BY empleados_activos DESC;

-- 5. Verificar empleados con múltiples roles activos (puede causar problemas)
SELECT 
    user_id,
    COUNT(*) as num_roles_activos,
    STRING_AGG(company_id::text, ', ') as company_ids
FROM user_company_roles
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1;

