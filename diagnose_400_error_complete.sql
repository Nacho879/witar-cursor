-- DIAGNÓSTICO COMPLETO DEL ERROR 400
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA INVITATIONS
SELECT 
  '=== ESTRUCTURA DE INVITATIONS ===' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR DATOS EN INVITATIONS
SELECT 
  '=== DATOS EN INVITATIONS ===' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as null_first_name,
  COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as null_last_name,
  COUNT(CASE WHEN token IS NULL OR token = '' THEN 1 END) as null_token,
  COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as null_expires_at,
  COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as null_status,
  COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as null_email
FROM invitations;

-- 3. VERIFICAR INVITACIONES RECIENTES
SELECT 
  '=== INVITACIONES RECIENTES ===' as info,
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  company_id,
  token,
  expires_at,
  created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 5;

-- 4. VERIFICAR POLÍTICAS RLS
SELECT 
  '=== POLÍTICAS RLS ===' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 5. VERIFICAR PERMISOS DE SERVICE ROLE
SELECT 
  '=== PERMISOS SERVICE ROLE ===' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'invitations'
AND grantee = 'service_role';

-- 6. VERIFICAR QUE LA FUNCIÓN PUEDE ACCEDER A LOS DATOS
SELECT 
  '=== TEST DE ACCESO ===' as info,
  COUNT(*) as accessible_invitations
FROM invitations
WHERE company_id IN (
  SELECT company_id 
  FROM user_company_roles 
  WHERE user_id = auth.uid() 
  AND is_active = true
);

-- 7. VERIFICAR ESTRUCTURA DE USER_COMPANY_ROLES
SELECT 
  '=== ESTRUCTURA USER_COMPANY_ROLES ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_company_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. VERIFICAR ESTRUCTURA DE COMPANIES
SELECT 
  '=== ESTRUCTURA COMPANIES ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. VERIFICAR DATOS DE COMPANIES
SELECT 
  '=== DATOS COMPANIES ===' as info,
  id,
  name,
  created_at,
  status
FROM companies
ORDER BY created_at DESC
LIMIT 3;

-- 10. VERIFICAR USER_COMPANY_ROLES
SELECT 
  '=== USER_COMPANY_ROLES ===' as info,
  user_id,
  company_id,
  role,
  is_active,
  created_at
FROM user_company_roles
ORDER BY created_at DESC
LIMIT 5;

SELECT '🔍 DIAGNÓSTICO COMPLETO FINALIZADO' as resultado;
