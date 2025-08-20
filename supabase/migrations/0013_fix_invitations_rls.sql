-- Arreglar políticas RLS para invitaciones
-- Permitir eliminación para owners y admins

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can view invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations to their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations from their company" ON invitations;

-- Política para ver invitaciones
CREATE POLICY "Users can view invitations from their company" ON invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Política para insertar invitaciones
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

-- Política para actualizar invitaciones
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

-- Política para eliminar invitaciones
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

-- Asegurar que RLS esté habilitado
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY; 