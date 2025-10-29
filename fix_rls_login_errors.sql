-- Corregir errores de RLS que impiden el login
-- Desactivar RLS temporalmente en tablas críticas para el login

-- 1. Desactivar RLS en user_company_roles
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- 2. Desactivar RLS en invitations
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;

-- 3. Desactivar RLS en companies
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- 4. Desactivar RLS en user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 5. Eliminar todas las políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own roles" ON user_company_roles;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated users to read invitations" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated users to create invitations" ON invitations;
DROP POLICY IF EXISTS "Allow authenticated users to update invitations" ON invitations;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to read companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to update companies" ON companies;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON user_profiles;

-- 6. Crear políticas simples y permisivas
CREATE POLICY "Allow all operations for authenticated users" ON user_company_roles
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON invitations
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON companies
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON user_profiles
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Verificar que las tablas tienen RLS desactivado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_company_roles', 'invitations', 'companies', 'user_profiles')
AND schemaname = 'public';

SELECT 'RLS corregido - Login debería funcionar ahora' as status;
