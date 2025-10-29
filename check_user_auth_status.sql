-- Script para verificar el estado de autenticación de los usuarios
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar usuarios en auth.users
SELECT 
  'Usuarios en auth.users' as info,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar si hay usuarios sin confirmar
SELECT 
  'Usuarios sin confirmar' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as sin_confirmar
FROM auth.users;

-- 3. Verificar roles de usuario
SELECT 
  'Roles de usuario' as info,
  ucr.user_id,
  u.email,
  ucr.role,
  ucr.is_active,
  ucr.created_at
FROM user_company_roles ucr
JOIN auth.users u ON u.id = ucr.user_id
ORDER BY ucr.created_at DESC
LIMIT 10;

-- 4. Verificar perfiles de usuario
SELECT 
  'Perfiles de usuario' as info,
  up.user_id,
  up.full_name,
  up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 10;

SELECT '✅ Verificación de usuarios completada' as resultado;
