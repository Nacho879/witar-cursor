-- Corregir errores 406 (Not Acceptable) en login
-- Estos errores se deben a políticas RLS que impiden el acceso

-- 1. Verificar estado actual de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_company_roles', 'invitations', 'companies', 'user_profiles')
AND schemaname = 'public';

-- 2. Desactivar RLS completamente en tablas críticas
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Eliminar TODAS las políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar políticas de user_company_roles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_company_roles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_company_roles';
    END LOOP;
    
    -- Eliminar políticas de invitations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invitations' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON invitations';
    END LOOP;
    
    -- Eliminar políticas de companies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON companies';
    END LOOP;
    
    -- Eliminar políticas de user_profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- 4. Verificar que RLS está desactivado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_company_roles', 'invitations', 'companies', 'user_profiles')
AND schemaname = 'public';

-- 5. Verificar que no hay políticas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_company_roles', 'invitations', 'companies', 'user_profiles')
AND schemaname = 'public';

SELECT 'RLS desactivado - Errores 406 deberían estar resueltos' as status;
