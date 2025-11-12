-- =====================================================
-- SOLUCIÓN FINAL - ERROR 42501 DOCUMENTOS
-- Este script verifica el estado actual y aplica la solución
-- =====================================================

-- =====================================================
-- PASO 1: DIAGNÓSTICO - Ver estado actual
-- =====================================================
SELECT 
    '=== DIAGNÓSTICO INICIAL ===' as paso,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

SELECT 
    '=== POLÍTICAS ACTUALES ===' as paso,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS DE INSERT
-- =====================================================
DO $$ 
DECLARE
    policy_record RECORD;
    count_dropped INTEGER := 0;
BEGIN
    RAISE NOTICE '=== ELIMINANDO POLÍTICAS ===';
    
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents' 
        AND cmd = 'INSERT'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
            RAISE NOTICE 'Eliminada: %', policy_record.policyname;
            count_dropped := count_dropped + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error eliminando %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    -- Eliminar políticas conocidas manualmente
    DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
    DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can insert documents" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "Allow document insert based on role" ON documents;
    DROP POLICY IF EXISTS "Allow document insert with permission check" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert any document" ON documents;
    DROP POLICY IF EXISTS "documents_policy" ON documents;
    
    RAISE NOTICE 'Total eliminadas: %', count_dropped;
END $$;

-- Verificar que se eliminaron
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- =====================================================
-- PASO 3: ELIMINAR FUNCIONES ANTERIORES
-- =====================================================
DROP FUNCTION IF EXISTS can_insert_document(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS check_document_insert_permission(UUID, UUID, UUID);

-- =====================================================
-- PASO 4: ASEGURAR QUE RLS ESTÁ HABILITADO
-- =====================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 5: CREAR POLÍTICA SIMPLE SIN FUNCIONES
-- Esta política es directa y no usa funciones
-- =====================================================
CREATE POLICY "Admins managers owners can insert documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Verificar que el usuario es admin/manager/owner en la empresa del documento
        EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
        AND
        -- Verificar que uploaded_by es el usuario actual
        documents.uploaded_by = auth.uid()
    );

-- Política para usuarios que suben sus propios documentos
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

-- =====================================================
-- PASO 6: VERIFICAR POLÍTICAS CREADAS
-- =====================================================
SELECT 
    '=== POLÍTICAS FINALES ===' as paso,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- PASO 7: TEST DE VERIFICACIÓN
-- =====================================================
SELECT 
    '=== TEST DE VERIFICACIÓN ===' as paso,
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as user_is_admin,
    EXISTS (
        SELECT 1
        FROM user_company_roles
        WHERE user_id = 'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND is_active = true
    ) as recipient_in_company;

-- =====================================================
-- MENSAJE FINAL
-- =====================================================
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;
SELECT '📝 Si aún falla, ejecuta el siguiente comando para deshabilitar RLS temporalmente y verificar:' as siguiente;
SELECT '   ALTER TABLE documents DISABLE ROW LEVEL SECURITY;' as comando_deshabilitar;
SELECT '   (Luego vuelve a habilitarlo con: ALTER TABLE documents ENABLE ROW LEVEL SECURITY;)' as nota;

