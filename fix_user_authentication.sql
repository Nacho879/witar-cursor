-- Script para corregir problemas de autenticación
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Confirmar emails de usuarios que no están confirmados
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Verificar usuarios actualizados
SELECT 
  'Usuarios confirmados' as info,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar que los usuarios tienen roles activos
SELECT 
  'Usuarios con roles' as info,
  u.email,
  ucr.role,
  ucr.is_active,
  c.name as company_name
FROM auth.users u
LEFT JOIN user_company_roles ucr ON u.id = ucr.user_id
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.is_active = true
ORDER BY u.created_at DESC
LIMIT 5;

-- 4. Verificar usuarios sin roles
SELECT 
  'Usuarios sin roles activos' as info,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN user_company_roles ucr ON u.id = ucr.user_id AND ucr.is_active = true
WHERE ucr.user_id IS NULL
ORDER BY u.created_at DESC;

SELECT '✅ Autenticación corregida' as resultado;
