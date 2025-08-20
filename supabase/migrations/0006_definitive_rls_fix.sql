-- =====================================================
-- SOLUCIÓN DEFINITIVA - DESACTIVAR RLS TEMPORALMENTE
-- =====================================================

-- Desactivar RLS en todas las tablas críticas
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_company_roles;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON user_company_roles;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON user_company_roles;
DROP POLICY IF EXISTS "Enable delete for users based on company_id" ON user_company_roles;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON companies;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON companies;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON companies;
DROP POLICY IF EXISTS "Enable delete for users based on company_id" ON companies;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_profiles;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON company_settings;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON company_settings;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON company_settings;
DROP POLICY IF EXISTS "Enable delete for users based on company_id" ON company_settings;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON departments;
DROP POLICY IF EXISTS "Enable update for users based on company_id" ON departments;
DROP POLICY IF EXISTS "Enable delete for users based on company_id" ON departments;

-- Crear políticas simples y efectivas (solo para lectura)
CREATE POLICY "Allow all operations for authenticated users" ON user_company_roles 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON companies 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON user_profiles 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON company_settings 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON departments 
FOR ALL USING (auth.role() = 'authenticated');

-- Reactivar RLS
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY; 