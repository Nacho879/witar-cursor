-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA LOGIN
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Desactivar RLS temporalmente en user_company_roles para permitir login
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS esté desactivado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_company_roles'
AND schemaname = 'public';

-- 3. Crear política simple para user_company_roles
CREATE POLICY "Allow all operations for authenticated users" ON user_company_roles
FOR ALL USING (auth.role() = 'authenticated');

-- 4. Habilitar RLS nuevamente
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- 5. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_company_roles'
AND schemaname = 'public';

-- 6. Mensaje de confirmación
SELECT 'Políticas RLS corregidas para login' as status; 