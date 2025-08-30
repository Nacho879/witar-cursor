-- =====================================================
-- SOLUCIÓN SIMPLE - DESACTIVAR RLS TEMPORALMENTE
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Desactivar RLS temporalmente en las tablas críticas
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS esté desactivado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('companies', 'user_company_roles', 'company_settings', 'user_profiles')
AND schemaname = 'public';

-- 3. Mensaje de confirmación
SELECT 'RLS desactivado temporalmente para permitir registro de empresas' as status; 