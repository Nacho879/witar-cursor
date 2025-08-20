-- Script para arreglar las políticas RLS de invitaciones
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations to their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations from their company" ON invitations;

-- 2. Crear nuevas políticas más permisivas
CREATE POLICY "Users can view invitations from their company" ON invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert invitations to their company" ON invitations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update invitations from their company" ON invitations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete invitations from their company" ON invitations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('owner', 'admin')
    )
  );

-- 3. Asegurar que RLS esté habilitado
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 4. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'invitations'; 