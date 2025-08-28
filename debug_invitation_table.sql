-- Script completo para diagnosticar el problema con la tabla invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar la estructura completa de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position;

-- 2. Verificar las restricciones de la tabla
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'invitations'::regclass;

-- 3. Verificar las políticas RLS
SELECT 
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

-- 4. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'invitations';

-- 5. Verificar los triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'invitations';

-- 6. Verificar datos de ejemplo
SELECT 
  id,
  email,
  status,
  token,
  created_at,
  expires_at
FROM invitations 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Verificar si hay algún problema con el token específico
SELECT 
  id,
  email,
  status,
  token,
  created_at,
  expires_at
FROM invitations 
WHERE token = 'e9d45280-3d2d-4350-92c9-3630d9fb3c15';

-- 8. Verificar si hay caracteres especiales o problemas en los tokens
SELECT 
  id,
  email,
  status,
  token,
  length(token) as token_length,
  created_at
FROM invitations 
WHERE token IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10; 