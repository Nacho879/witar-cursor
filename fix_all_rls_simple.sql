-- =====================================================
-- DESACTIVAR RLS EN TODAS LAS TABLAS CRÍTICAS
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Desactivar RLS en todas las tablas críticas
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes
-- user_company_roles
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow initial owner creation" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles select" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles insert" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles update" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles delete" ON user_company_roles;

-- companies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON companies;
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Only owners can create companies" ON companies;
DROP POLICY IF EXISTS "Only owners can update companies" ON companies;
DROP POLICY IF EXISTS "Allow company creation" ON companies;
DROP POLICY IF EXISTS "companies_policy" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;
DROP POLICY IF EXISTS "Allow users to view their companies" ON companies;
DROP POLICY IF EXISTS "Allow owners to update their companies" ON companies;

-- user_profiles
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_policy" ON user_profiles;

-- company_settings
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Only owners can create company settings" ON company_settings;
DROP POLICY IF EXISTS "Only admins can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow authenticated users to create company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow admins to view company settings" ON company_settings;

-- departments
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON departments;
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Only admins can create departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;
DROP POLICY IF EXISTS "Simple departments select" ON departments;
DROP POLICY IF EXISTS "Simple departments insert" ON departments;
DROP POLICY IF EXISTS "Simple departments update" ON departments;

-- 3. Verificar que RLS esté desactivado en todas las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_company_roles', 'companies', 'user_profiles', 'company_settings', 'departments')
AND schemaname = 'public'
ORDER BY tablename;

-- 4. Verificar que no hay políticas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('user_company_roles', 'companies', 'user_profiles', 'company_settings', 'departments')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Mensaje de confirmación
SELECT 'RLS desactivado en todas las tablas críticas - Registro y login deberían funcionar' as status; 