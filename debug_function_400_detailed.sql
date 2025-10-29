-- Script detallado para diagnosticar el error 400 en send-invitation-email
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar estructura completa de invitations
SELECT 
  'Estructura completa de invitations' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar invitaciones recientes y su contenido
SELECT 
  'Invitaciones recientes' as info,
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  company_id,
  token,
  expires_at,
  invited_by,
  created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 3;

-- 3. Verificar que todas las columnas críticas tienen datos
SELECT 
  'Verificación de datos en invitaciones' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as with_first_name,
  COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as with_last_name,
  COUNT(CASE WHEN token IS NOT NULL THEN 1 END) as with_token,
  COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as with_expires_at,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status
FROM invitations;

-- 4. Verificar políticas RLS de invitations
SELECT 
  'Políticas RLS de invitations' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 5. Verificar que la función puede acceder a los datos
SELECT 
  'Test de acceso a invitations' as info,
  COUNT(*) as accessible_invitations
FROM invitations
WHERE company_id IN (
  SELECT company_id 
  FROM user_company_roles 
  WHERE user_id = auth.uid() 
  AND is_active = true
);

-- 6. Verificar estructura de user_company_roles
SELECT 
  'Estructura de user_company_roles' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_company_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ Diagnóstico detallado completado' as resultado;
