-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA LOGIN
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Eliminar políticas existentes que pueden estar causando conflictos
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_company_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_company_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_company_roles;
DROP POLICY IF EXISTS "Allow initial owner creation" ON user_company_roles;
DROP POLICY IF EXISTS "Allow authenticated users to create roles" ON user_company_roles;

-- 2. Desactivar RLS temporalmente en user_company_roles
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que RLS esté desactivado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_company_roles'
AND schemaname = 'public';

-- 4. Crear política simple para user_company_roles
CREATE POLICY "Allow all operations for authenticated users" ON user_company_roles
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Habilitar RLS nuevamente
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- 6. Verificar políticas existentes
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

-- 7. Mensaje de confirmación
SELECT 'Políticas RLS corregidas para login - Error PGRST116 solucionado' as status; 