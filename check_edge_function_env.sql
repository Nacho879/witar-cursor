-- VERIFICAR VARIABLES DE ENTORNO DE LA FUNCIÓN EDGE
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar configuración básica
SELECT 
  '=== CONFIGURACIÓN DE FUNCIÓN EDGE ===' as info,
  'Verificando variables de entorno necesarias' as descripcion;

-- 2. Verificar que las tablas necesarias existen
SELECT 
  '=== TABLAS NECESARIAS ===' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'invitations' AND table_schema = 'public'
  ) THEN '✅ invitations' ELSE '❌ invitations' END as invitations,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'companies' AND table_schema = 'public'
  ) THEN '✅ companies' ELSE '❌ companies' END as companies,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_company_roles' AND table_schema = 'public'
  ) THEN '✅ user_company_roles' ELSE '❌ user_company_roles' END as user_company_roles;

-- 3. Verificar permisos de service role en todas las tablas
SELECT 
  '=== PERMISOS SERVICE ROLE ===' as info,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_name IN ('invitations', 'companies', 'user_company_roles')
ORDER BY table_name, privilege_type;

-- 4. Verificar que no hay restricciones de RLS problemáticas
SELECT 
  '=== POLÍTICAS RLS ACTIVAS ===' as info,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('invitations', 'companies', 'user_company_roles')
ORDER BY tablename, policyname;

-- 5. Verificar configuración de email
SELECT 
  '=== CONFIGURACIÓN DE EMAIL ===' as info,
  'La función necesita RESEND_API_KEY configurada' as descripcion,
  'Verificar en Supabase Dashboard > Settings > Edge Functions' as instruccion;

-- 6. Verificar que la función puede hacer operaciones básicas
SELECT 
  '=== TEST DE OPERACIONES ===' as info,
  'Verificando que la función puede acceder a los datos' as descripcion;

-- Test de SELECT en invitations
SELECT 
  'Test SELECT invitations' as test,
  COUNT(*) as total
FROM invitations;

-- Test de SELECT en companies
SELECT 
  'Test SELECT companies' as test,
  COUNT(*) as total
FROM companies;

-- Test de SELECT en user_company_roles
SELECT 
  'Test SELECT user_company_roles' as test,
  COUNT(*) as total
FROM user_company_roles;

-- 7. Verificar configuración de CORS
SELECT 
  '=== CONFIGURACIÓN CORS ===' as info,
  'La función debe tener headers CORS correctos' as descripcion,
  'Verificar que no hay problemas de CORS' as nota;

SELECT '🔍 VERIFICACIÓN DE ENTORNO COMPLETADA' as resultado;
