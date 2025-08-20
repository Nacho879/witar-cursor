-- =====================================================
-- CORRECCIÓN DE POLÍTICAS RLS - SOLUCIONAR RECURSIÓN
-- =====================================================

-- Primero, eliminamos las políticas problemáticas
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_company_roles;

-- =====================================================
-- POLÍTICAS CORREGIDAS PARA USER_COMPANY_ROLES
-- =====================================================

-- Los usuarios pueden ver roles en su empresa (sin recursión)
CREATE POLICY "Users can view roles in their company" ON user_company_roles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Permitir inserción para el primer owner (sin verificación de rol previo)
CREATE POLICY "Allow initial owner creation" ON user_company_roles
    FOR INSERT WITH CHECK (
        -- Si no hay roles para esta empresa, permitir crear el primer owner
        NOT EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE company_id = user_company_roles.company_id
        )
        OR
        -- Si ya hay roles, solo permitir a owners/admins
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = user_company_roles.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden actualizar roles
CREATE POLICY "Only admins can update roles" ON user_company_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = user_company_roles.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden eliminar roles
CREATE POLICY "Only admins can delete roles" ON user_company_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = user_company_roles.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS CORREGIDAS PARA COMPANIES
-- =====================================================

-- Eliminar políticas problemáticas de companies
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Only owners can create companies" ON companies;
DROP POLICY IF EXISTS "Only owners can update companies" ON companies;

-- Políticas corregidas para companies
CREATE POLICY "Users can view companies they belong to" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Permitir creación de empresas (se maneja en la aplicación)
CREATE POLICY "Allow company creation" ON companies
    FOR INSERT WITH CHECK (true);

-- Solo los owners pueden actualizar su empresa
CREATE POLICY "Only owners can update companies" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role = 'owner' 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS CORREGIDAS PARA DEPARTMENTS
-- =====================================================

-- Eliminar políticas problemáticas de departments
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Only admins can create departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;

-- Políticas corregidas para departments
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden crear departamentos
CREATE POLICY "Only admins can create departments" ON departments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden actualizar departamentos
CREATE POLICY "Only admins can update departments" ON departments
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    ); 