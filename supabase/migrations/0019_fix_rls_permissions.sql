-- Arreglar permisos RLS que están causando errores
-- Deshabilitar RLS temporalmente para diagnosticar
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes que pueden estar causando conflictos
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles select" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles insert" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles update" ON user_company_roles;
DROP POLICY IF EXISTS "Simple user_company_roles delete" ON user_company_roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Allow initial owner creation" ON user_company_roles;

-- Crear políticas simples y permisivas
CREATE POLICY "Allow authenticated users to view roles" ON user_company_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert roles" ON user_company_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update roles" ON user_company_roles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete roles" ON user_company_roles
FOR DELETE
TO authenticated
USING (true);

-- Habilitar RLS nuevamente
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- También arreglar permisos para user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Allow authenticated users to view profiles" ON user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert profiles" ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update profiles" ON user_profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY; 