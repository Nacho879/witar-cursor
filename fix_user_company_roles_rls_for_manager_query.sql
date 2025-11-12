-- =====================================================
-- SOLUCIÓN PARA PERMITIR CONSULTAS A user_company_roles POR ID
-- Esto corrige el error 406 al obtener información del manager
-- =====================================================

-- 1. Eliminar todas las políticas existentes de user_company_roles
DROP POLICY IF EXISTS "Allow authenticated users to view roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete roles" ON user_company_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_company_roles;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON user_company_roles;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON user_company_roles;
DROP POLICY IF EXISTS "Enable delete for users based on company_id" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles select" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles insert" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles update" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles delete" ON user_company_roles;
DROP POLICY IF EXISTS "Allow initial owner creation" ON user_company_roles;

-- 2. Política SELECT: Permitir a usuarios autenticados ver roles de su empresa
-- Esto incluye poder consultar por id para obtener información del manager
CREATE POLICY "Users can view roles in their company" ON user_company_roles
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND (
            -- El usuario puede ver su propio rol
            user_id = auth.uid() OR
            -- O puede ver roles de usuarios en su misma empresa
            company_id IN (
                SELECT company_id 
                FROM user_company_roles 
                WHERE user_id = auth.uid() 
                AND is_active = true
            )
        )
    );

-- 3. Política INSERT: Solo admins y owners pueden crear roles
CREATE POLICY "Only admins and owners can create roles" ON user_company_roles
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- 4. Política UPDATE: Solo admins y owners pueden actualizar roles
CREATE POLICY "Only admins and owners can update roles" ON user_company_roles
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- 5. Política DELETE: Solo admins y owners pueden eliminar roles
CREATE POLICY "Only admins and owners can delete roles" ON user_company_roles
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- 6. Asegurar que RLS esté habilitado
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- 7. Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'user_company_roles'
ORDER BY policyname;


