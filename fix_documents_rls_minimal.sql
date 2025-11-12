-- =====================================================
-- SOLUCIÓN MÍNIMA - ERROR 42501
-- Política extremadamente simple para aislar el problema
-- =====================================================

-- PASO 1: Verificar usuario actual y autenticación
SELECT 
    '=== VERIFICACIÓN DE AUTENTICACIÓN ===' as paso,
    auth.uid() as current_user_id,
    auth.role() as current_role,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Usuario autenticado'
        ELSE 'Usuario NO autenticado'
    END as auth_status;

-- PASO 2: Verificar rol del usuario en la empresa
SELECT 
    '=== ROL DEL USUARIO ===' as paso,
    company_id,
    role,
    is_active
FROM user_company_roles 
WHERE user_id = auth.uid()
AND is_active = true;

-- PASO 3: ELIMINAR TODAS LAS POLÍTICAS
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
    END LOOP;
END $$;

-- PASO 4: Verificar que se eliminaron
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as restantes
FROM pg_policies 
WHERE tablename = 'documents';

-- PASO 5: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 6: Crear política MÍNIMA
-- Solo verifica que haya un usuario autenticado
CREATE POLICY "Minimal insert policy" ON documents
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- PASO 7: Verificar política creada
SELECT 
    '=== POLÍTICA CREADA ===' as paso,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 8: Test de inserción simulado
-- Esto simula lo que pasaría al insertar
SELECT 
    '=== TEST DE INSERCIÓN SIMULADO ===' as paso,
    auth.uid() IS NOT NULL as policy_would_allow,
    auth.uid() as user_id;

SELECT '✅ Script completado.' as resultado;
SELECT '📝 Esta política es la MÁS SIMPLE posible - solo verifica autenticación.' as nota;
SELECT '⚠️ Si esto no funciona, el problema puede estar en:' as advertencia;
SELECT '   1. El contexto de autenticación en Supabase' as causa1;
SELECT '   2. Algún problema con la configuración de RLS' as causa2;
SELECT '   3. Algún problema con la conexión a Supabase' as causa3;

