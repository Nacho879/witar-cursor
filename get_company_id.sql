-- Script para obtener tu company_id
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Obtener tu company_id (reemplaza TU_USER_ID con tu user_id real)
SELECT 
  ucr.company_id,
  c.name as company_name,
  ucr.role
FROM user_company_roles ucr
JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = 'TU_USER_ID' -- Reemplaza con tu user_id
  AND ucr.is_active = true;

-- 2. O si no sabes tu user_id, puedes ver todas las empresas donde tienes rol
SELECT 
  ucr.user_id,
  ucr.company_id,
  c.name as company_name,
  ucr.role,
  ucr.is_active
FROM user_company_roles ucr
JOIN companies c ON ucr.company_id = c.id
WHERE ucr.is_active = true
ORDER BY ucr.joined_at DESC;

-- 3. Una vez que tengas tu company_id, puedes usar el script verify_employee_deletion.sql
-- reemplazando 'TU_COMPANY_ID' con el UUID real de tu empresa 