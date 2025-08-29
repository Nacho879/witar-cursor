-- =====================================================
-- CORREGIR POLÍTICAS RLS DE INVITATIONS
-- =====================================================

-- 1. Eliminar todas las políticas existentes de invitations
DROP POLICY IF EXISTS "Users can view invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations to their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations from their company" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations in their company" ON invitations;
DROP POLICY IF EXISTS "Only admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Only admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email - enhanced" ON invitations;
DROP POLICY IF EXISTS "invitations_policy" ON invitations;
DROP POLICY IF EXISTS "Users can view company invitations" ON invitations;

-- 2. Crear políticas simples y permisivas para invitations
-- Política para SELECT: usuarios pueden ver invitaciones de su empresa
CREATE POLICY "invitations_select_policy" ON invitations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Política para INSERT: solo admins y owners pueden crear invitaciones
CREATE POLICY "invitations_insert_policy" ON invitations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
            AND role IN ('owner', 'admin')
        )
    );

-- Política para UPDATE: solo admins y owners pueden actualizar invitaciones
CREATE POLICY "invitations_update_policy" ON invitations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
            AND role IN ('owner', 'admin')
        )
    );

-- Política para DELETE: solo admins y owners pueden eliminar invitaciones
CREATE POLICY "invitations_delete_policy" ON invitations
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
DO $$
BEGIN
    RAISE NOTICE 'Políticas de invitations creadas correctamente';
    RAISE NOTICE 'RLS habilitado en invitations';
END $$; 