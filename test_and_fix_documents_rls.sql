-- =====================================================
-- TEST Y CORRECCIÓN DEFINITIVA PARA DOCUMENTOS RLS
-- =====================================================

-- PASO 1: Verificar usuario actual y sus roles
SELECT 
    '=== USUARIO ACTUAL ===' as paso,
    auth.uid() as user_id,
    (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
    ) as user_email;

-- PASO 2: Verificar roles del usuario actual
SELECT 
    '=== ROLES DEL USUARIO ===' as paso,
    company_id,
    role,
    is_active
FROM user_company_roles 
WHERE user_id = auth.uid()
AND is_active = true;

-- PASO 3: Ver TODAS las políticas actuales
SELECT 
    '=== POLÍTICAS ACTUALES ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- PASO 4: ELIMINAR TODAS las políticas de INSERT
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
    
    -- Eliminar políticas conocidas
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

-- PASO 5: Verificar que se eliminaron
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as politicas_restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 6: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 7: Crear política SIMPLE y DIRECTA para admins/managers/owners
-- Esta política verifica solo lo esencial
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

-- PASO 10: Test de la política - verificar que un admin puede insertar
-- Simulamos los datos que se están enviando
SELECT 
    '=== TEST DE POLÍTICA ===' as paso,
    auth.uid() as current_user,
    '1e13806a-b410-423f-a986-7957768bf85c'::uuid as test_company_id,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as should_be_allowed;

-- Mensaje final
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;

