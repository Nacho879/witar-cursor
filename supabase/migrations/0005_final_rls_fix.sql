-- =====================================================
-- SOLUCIÓN FINAL - POLÍTICAS RLS CORREGIDAS
-- =====================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON departments;

-- Crear políticas simples y efectivas
CREATE POLICY "Enable insert for authenticated users only" ON user_company_roles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for users based on company_id" ON user_company_roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on company_id" ON user_company_roles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for users based on company_id" ON user_company_roles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para companies
CREATE POLICY "Enable insert for authenticated users only" ON companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON companies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON companies
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON companies
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para departments
CREATE POLICY "Enable insert for authenticated users only" ON departments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON departments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON departments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para user_profiles
CREATE POLICY "Enable insert for authenticated users only" ON user_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON user_profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON user_profiles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para company_settings
CREATE POLICY "Enable insert for authenticated users only" ON company_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON company_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON company_settings
    FOR DELETE USING (auth.role() = 'authenticated'); 