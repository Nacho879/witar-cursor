-- Script para restaurar el rol de admin
-- Ejecutar en el SQL Editor de Supabase

-- Primero, vamos a ver qué roles tienes actualmente
SELECT 
    ucr.id,
    ucr.user_id,
    ucr.company_id,
    ucr.role,
    ucr.is_active,
    ucr.created_at,
    c.name as company_name
FROM user_company_roles ucr
JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = 'TU_USER_ID_AQUI'  -- Reemplazar con tu user_id
ORDER BY ucr.created_at DESC;

-- Para restaurar el rol de admin, ejecutar:
UPDATE user_company_roles 
SET 
    role = 'admin',
    is_active = true,
    updated_at = NOW()
WHERE user_id = 'TU_USER_ID_AQUI'  -- Reemplazar con tu user_id
AND company_id = 'TU_COMPANY_ID_AQUI';  -- Reemplazar con tu company_id

-- Para verificar que se actualizó correctamente:
SELECT 
    ucr.id,
    ucr.user_id,
    ucr.company_id,
    ucr.role,
    ucr.is_active,
    c.name as company_name
FROM user_company_roles ucr
JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = 'TU_USER_ID_AQUI'  -- Reemplazar con tu user_id
ORDER BY ucr.created_at DESC; 