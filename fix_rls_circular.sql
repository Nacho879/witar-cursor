-- Script para solucionar el problema circular de políticas RLS
-- El problema: usuarios sin rol activo no pueden ver sus invitaciones ni roles

-- 1. Crear política más permisiva para user_company_roles
-- Esta política permite a cualquier usuario autenticado ver sus propios roles
DROP POLICY IF EXISTS "Users can view their own roles - enhanced" ON user_company_roles;

CREATE POLICY "Users can view their own roles - enhanced" ON user_company_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 2. Crear política más permisiva para invitations
-- Esta política permite a cualquier usuario autenticado ver invitaciones para su email
DROP POLICY IF EXISTS "Users can view invitations for their email - enhanced" ON invitations;

CREATE POLICY "Users can view invitations for their email - enhanced" ON invitations
FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- 3. Crear política para permitir inserción de roles durante el proceso de invitación
DROP POLICY IF EXISTS "Allow role creation during invitation" ON user_company_roles;

CREATE POLICY "Allow role creation during invitation" ON user_company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permitir inserción si el usuario está creando su propio rol
  auth.uid() = user_id
  OR
  -- Permitir inserción si hay una invitación pendiente para ese email
  EXISTS (
    SELECT 1 FROM invitations 
    WHERE email = (
      SELECT email FROM auth.users WHERE id = user_id
    )
    AND status IN ('pending', 'sent')
  )
);

-- 4. Crear política para permitir actualización de roles durante el proceso de invitación
DROP POLICY IF EXISTS "Allow role update during invitation" ON user_company_roles;

CREATE POLICY "Allow role update during invitation" ON user_company_roles
FOR UPDATE
TO authenticated
USING (
  -- Permitir actualización si el usuario está actualizando su propio rol
  auth.uid() = user_id
  OR
  -- Permitir actualización si hay una invitación pendiente para ese email
  EXISTS (
    SELECT 1 FROM invitations 
    WHERE email = (
      SELECT email FROM auth.users WHERE id = user_id
    )
    AND status IN ('pending', 'sent')
  )
);

-- 5. Verificar que las políticas se crearon correctamente
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
  AND policyname LIKE '%enhanced%'
ORDER BY tablename, policyname; 