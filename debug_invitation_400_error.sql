-- Script para diagnosticar el error 400 en la función de invitaciones
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar estructura actual de la tabla invitations
SELECT 
  'Estructura de invitations' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si hay invitaciones existentes y su estructura
SELECT 
  'Invitaciones existentes' as info,
  id,
  email,
  role,
  status,
  company_id,
  created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar si la tabla invitations tiene todas las columnas necesarias
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
  ) THEN '✅ expires_at' ELSE '❌ expires_at' END as expires_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'invited_by'
  ) THEN '✅ invited_by' ELSE '❌ invited_by' END as invited_by;

-- 4. Verificar políticas RLS
SELECT 
  'Políticas RLS' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

SELECT '✅ Diagnóstico completado' as resultado;
