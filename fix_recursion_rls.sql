-- =====================================================
-- SOLUCIONAR RECURSIÓN INFINITA EN USER_COMPANY_ROLES
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Desactivar RLS completamente en user_company_roles
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes de user_company_roles
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

-- 3. Verificar que RLS esté desactivado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_company_roles'
AND schemaname = 'public';

-- 4. Verificar que no hay políticas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'user_company_roles'
AND schemaname = 'public';

-- 5. Mensaje de confirmación
SELECT 'RLS desactivado en user_company_roles - Recursión infinita solucionada' as status; 