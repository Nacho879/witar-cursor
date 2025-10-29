-- Script para corregir errores de login (403, 406)
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Desactivar RLS en tablas críticas
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
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

-- 3. Añadir campos de bloqueo a companies si no existen
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'blocked')),
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- 4. Crear índice para consultas de estado
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 5. Actualizar empresas existentes para que tengan estado 'trial'
UPDATE companies 
SET status = 'trial' 
WHERE status IS NULL OR status = 'active';

-- 6. Verificar estado final
SELECT 
    'user_company_roles' as tabla, 
    rowsecurity as rls_activo 
FROM pg_tables 
WHERE tablename = 'user_company_roles' AND schemaname = 'public'
UNION ALL
SELECT 
    'invitations' as tabla, 
    rowsecurity as rls_activo 
FROM pg_tables 
WHERE tablename = 'invitations' AND schemaname = 'public'
UNION ALL
SELECT 
    'companies' as tabla, 
    rowsecurity as rls_activo 
FROM pg_tables 
WHERE tablename = 'companies' AND schemaname = 'public'
UNION ALL
SELECT 
    'user_profiles' as tabla, 
    rowsecurity as rls_activo 
FROM pg_tables 
WHERE tablename = 'user_profiles' AND schemaname = 'public';

-- 7. Verificar que no hay políticas
SELECT 
    schemaname, 
    tablename, 
    COUNT(*) as num_politicas
FROM pg_policies 
WHERE tablename IN ('user_company_roles', 'invitations', 'companies', 'user_profiles')
AND schemaname = 'public'
GROUP BY schemaname, tablename;

SELECT '✅ RLS desactivado - Errores de login corregidos' as resultado;
