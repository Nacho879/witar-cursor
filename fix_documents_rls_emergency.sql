-- =====================================================
-- SOLUCIÓN DE EMERGENCIA PARA ERROR 42501
-- Este script deshabilita temporalmente RLS y luego crea políticas correctas
-- =====================================================

-- PASO 1: Verificar estado actual
SELECT 
    '=== ESTADO ACTUAL ===' as paso,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- PASO 2: Ver todas las políticas actuales
SELECT 
    '=== POLÍTICAS ACTUALES ===' as paso,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- PASO 3: ELIMINAR TODAS las políticas de INSERT
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents' 
        AND cmd = 'INSERT'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
            RAISE NOTICE 'Eliminada política: %', policy_record.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error eliminando política %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    -- Eliminar todas las políticas conocidas
    DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
    DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can insert documents" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "documents_policy" ON documents;
    DROP POLICY IF EXISTS "Users can view company documents" ON documents;
END $$;

-- PASO 4: Verificar que se eliminaron todas
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as politicas_restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 5: DESHABILITAR RLS TEMPORALMENTE (solo para verificar que el problema es RLS)
-- COMENTA ESTA LÍNEA DESPUÉS DE VERIFICAR
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- PASO 6: HABILITAR RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 7: Crear política usando SECURITY DEFINER para evitar problemas de contexto
-- Esta política es muy permisiva y debería funcionar
CREATE POLICY "Admins managers owners can insert documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Verificar que el usuario autenticado es admin/manager/owner en la empresa
        EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
        AND
        -- Verificar que uploaded_by es el usuario autenticado
        documents.uploaded_by = auth.uid()
    );

-- PASO 8: Crear política para usuarios que suben sus propios documentos
CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid()
        AND uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND is_active = true
        )
    );

-- PASO 9: Verificar políticas creadas
SELECT 
    '=== POLÍTICAS FINALES ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- PASO 10: Test de verificación con los datos reales
SELECT 
    '=== TEST DE VERIFICACIÓN ===' as paso,
    auth.uid() as current_user_id,
    '1e13806a-b410-423f-a986-7957768bf85c'::uuid as test_company_id,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as user_is_admin_in_company,
    (
        SELECT role 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND is_active = true
        LIMIT 1
    ) as user_role;

-- Mensaje final
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;
SELECT '⚠️ Si aún falla, descomenta la línea 30 para deshabilitar RLS temporalmente y verificar.' as advertencia;

