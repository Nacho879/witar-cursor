-- Script para verificar el entorno de la función Edge
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar configuración básica
SELECT 
  'CONFIGURACIÓN BÁSICA' as info,
  'Verificando entorno de la función send-invitation-email' as descripcion;

-- 2. Verificar que la función puede acceder a las tablas necesarias
SELECT 
  'ACCESO A TABLAS' as info,
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

-- 3. Verificar permisos de service role
SELECT 
  'PERMISOS DE SERVICE ROLE' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'invitations'
AND grantee = 'service_role';

-- 4. Verificar que no hay restricciones de RLS problemáticas
SELECT 
  'POLÍTICAS RLS ACTIVAS' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 5. Verificar datos de prueba
SELECT 
  'DATOS DE PRUEBA' as info,
  id,
  email,
  first_name,
  last_name,
  status,
  created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 3;

-- 6. Verificar que la función puede hacer SELECT
SELECT 
  'TEST DE SELECT' as info,
  COUNT(*) as total_invitations
FROM invitations;

-- 7. Verificar que la función puede hacer INSERT (simulación)
SELECT 
  'TEST DE INSERT' as info,
  'Simulando inserción de invitación' as descripcion;

-- 8. Verificar configuración de email
SELECT 
  'CONFIGURACIÓN DE EMAIL' as info,
  'Usando Resend para envío de emails' as descripcion,
  'Verificar RESEND_API_KEY en variables de entorno' as nota;

SELECT '✅ VERIFICACIÓN DE ENTORNO COMPLETADA' as resultado;
