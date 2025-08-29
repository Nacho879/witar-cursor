-- Script para verificar y corregir políticas RLS que pueden estar causando errores 406

-- 1. Verificar políticas actuales de user_company_roles
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
WHERE tablename = 'user_company_roles'
ORDER BY policyname;

-- 2. Verificar políticas de invitations
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
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 3. Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_company_roles', 'invitations', 'user_profiles')
ORDER BY tablename;

-- 4. Crear política más permisiva para user_company_roles si es necesario
-- Esta política permite a los usuarios ver sus propios roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_company_roles;

CREATE POLICY "Users can view their own roles" ON user_company_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 5. Crear política para invitations si es necesario
DROP POLICY IF EXISTS "Users can view invitations for their email" ON invitations;

CREATE POLICY "Users can view invitations for their email" ON invitations
FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_company_roles', 'invitations')
ORDER BY tablename, policyname; 