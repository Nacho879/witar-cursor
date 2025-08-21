-- =====================================================
-- VERIFICAR Y CAMBIAR ROL DE USUARIO A OWNER
-- =====================================================

-- 1. Verificar el usuario actual
SELECT 
    u.email,
    ucr.role,
    ucr.company_id,
    c.name as company_name,
    ucr.is_active
FROM auth.users u
JOIN user_company_roles ucr ON u.id = ucr.user_id
JOIN companies c ON ucr.company_id = c.id
WHERE u.email = 'ignaseblopez@gmail.com';

-- 2. Cambiar el rol de vuelta a 'owner'
UPDATE user_company_roles 
SET role = 'owner'
WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'ignaseblopez@gmail.com'
);

-- 3. Verificar el cambio
SELECT 
    u.email,
    ucr.role,
    ucr.company_id,
    c.name as company_name,
    ucr.is_active
FROM auth.users u
JOIN user_company_roles ucr ON u.id = ucr.user_id
JOIN companies c ON ucr.company_id = c.id
WHERE u.email = 'ignaseblopez@gmail.com'; 