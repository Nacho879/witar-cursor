-- =====================================================
-- SOLUCIÓN PARA PERMITIR A ADMINS Y OWNERS VER TODOS LOS DEPARTAMENTOS
-- =====================================================

-- 1. Eliminar todas las políticas existentes de departments
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Only admins can create departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON departments;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Simple departments select" ON departments;
DROP POLICY IF EXISTS "Simple departments insert" ON departments;
DROP POLICY IF EXISTS "Simple departments update" ON departments;

-- 2. Política SELECT: Permitir a usuarios autenticados ver departamentos de su empresa
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- 3. Política INSERT: Solo admins y owners pueden crear departamentos
CREATE POLICY "Only admins and owners can create departments" ON departments
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

-- 4. Política UPDATE: Solo admins y owners pueden actualizar departamentos
CREATE POLICY "Only admins and owners can update departments" ON departments
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

-- 5. Política DELETE: Solo admins y owners pueden eliminar departamentos
CREATE POLICY "Only admins and owners can delete departments" ON departments
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
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

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
    AND tablename = 'departments'
ORDER BY policyname;

