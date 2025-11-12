-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA ACCESO A COMPANIES
-- Este script corrige las políticas RLS que están bloqueando
-- el acceso a la información de empresas para empleados
-- =====================================================

-- 1. Verificar políticas RLS actuales en companies
SELECT 
  '📋 Políticas RLS actuales en companies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 2. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Allow users to view their companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to view companies" ON companies;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON companies;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON companies;
DROP POLICY IF EXISTS "companies_policy" ON companies;
DROP POLICY IF EXISTS "Users can view own company" ON companies;

-- 3. Crear política corregida que permite acceso a empresas donde el usuario tiene rol activo
CREATE POLICY "Allow users to view their companies" ON companies
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- 4. Verificar que la empresa existe y está activa
SELECT 
  '🏢 Estado de la empresa' as info,
  id,
  name,
  status,
  blocked_at,
  blocked_reason,
  created_at
FROM companies
WHERE id = '1e13806a-b410-423f-a986-7957768bf85c';

-- 5. Si la empresa está bloqueada, reactivarla
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE id = '1e13806a-b410-423f-a986-7957768bf85c'
AND (status = 'blocked' OR blocked_at IS NOT NULL);

-- 6. Verificar que el usuario tiene acceso a esta empresa
SELECT 
  '👤 Verificación de acceso del usuario' as info,
  ucr.user_id,
  ucr.company_id,
  ucr.role,
  ucr.is_active,
  c.id as company_exists,
  c.name as company_name,
  c.status as company_status
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.company_id = '1e13806a-b410-423f-a986-7957768bf85c'
AND ucr.is_active = true;

-- 7. Verificar las políticas después de la corrección
SELECT 
  '✅ Políticas RLS después de la corrección' as info,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

SELECT '🎉 Políticas RLS corregidas' as resultado;

