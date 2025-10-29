-- Script para debuggear la función de invitaciones
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar estructura de la tabla invitations
SELECT 
  'Estructura de invitations' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si existen invitaciones de prueba
SELECT 
  'Invitaciones existentes' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
FROM invitations;

-- 3. Verificar permisos RLS en la tabla invitations
SELECT 
  'Políticas RLS de invitations' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'invitations';

-- 4. Verificar si la tabla invitations tiene las columnas necesarias
SELECT 
  'Verificación de columnas críticas' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'id'
  ) THEN '✅ id' ELSE '❌ id' END as id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'email'
  ) THEN '✅ email' ELSE '❌ email' END as email,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'role'
  ) THEN '✅ role' ELSE '❌ role' END as role,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'company_id'
  ) THEN '✅ company_id' ELSE '❌ company_id' END as company_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'status'
  ) THEN '✅ status' ELSE '❌ status' END as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'first_name'
  ) THEN '✅ first_name' ELSE '❌ first_name' END as first_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'last_name'
  ) THEN '✅ last_name' ELSE '❌ last_name' END as last_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'token'
  ) THEN '✅ token' ELSE '❌ token' END as token,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'expires_at'
  ) THEN '✅ expires_at' ELSE '❌ expires_at' END as expires_at;

SELECT '✅ Debug completado' as resultado;
