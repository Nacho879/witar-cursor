-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA CREACIÓN DE EMPRESAS
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Eliminar políticas problemáticas de companies
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Only owners can create companies" ON companies;
DROP POLICY IF EXISTS "Only owners can update companies" ON companies;
DROP POLICY IF EXISTS "Allow company creation" ON companies;
DROP POLICY IF EXISTS "companies_policy" ON companies;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON companies;

-- 2. Crear políticas corregidas para companies
-- Permitir que usuarios autenticados creen empresas (para registro)
CREATE POLICY "Allow authenticated users to create companies" ON companies
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Permitir que usuarios vean empresas donde tienen rol
CREATE POLICY "Allow users to view their companies" ON companies
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Permitir que owners actualicen su empresa
CREATE POLICY "Allow owners to update their companies" ON companies
    FOR UPDATE 
    TO authenticated
    USING (
        id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role = 'owner' 
            AND is_active = true
        )
    );

-- 3. Eliminar políticas problemáticas de user_company_roles
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow initial owner creation" ON user_company_roles;

-- 4. Crear políticas corregidas para user_company_roles
-- Permitir que usuarios autenticados creen roles (para registro inicial)
CREATE POLICY "Allow authenticated users to create roles" ON user_company_roles
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- 5. Eliminar políticas problemáticas de company_settings
DROP POLICY IF EXISTS "Only owners can create company settings" ON company_settings;
DROP POLICY IF EXISTS "Only admins can view company settings" ON company_settings;

-- 6. Crear políticas corregidas para company_settings
-- Permitir que usuarios autenticados creen configuraciones (para registro)
CREATE POLICY "Allow authenticated users to create company settings" ON company_settings
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Permitir que admins y owners vean configuraciones
CREATE POLICY "Allow admins to view company settings" ON company_settings
    FOR SELECT 
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- 7. Verificar que RLS esté habilitado
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 8. Verificar que las políticas se crearon correctamente
SELECT 'Políticas RLS corregidas para creación de empresas' as status; 