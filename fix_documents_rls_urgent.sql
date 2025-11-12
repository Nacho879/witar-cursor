-- =====================================================
-- SOLUCIÓN URGENTE PARA ERROR 403 EN DOCUMENTOS
-- =====================================================

-- Paso 1: Ver TODAS las políticas actuales (incluyendo las ocultas)
SELECT 
    '=== TODAS LAS POLÍTICAS DE DOCUMENTS ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- Paso 2: ELIMINAR TODAS las políticas de INSERT sin excepción
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents' 
        AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
        RAISE NOTICE 'Eliminada política: %', r.policyname;
    END LOOP;
END $$;

-- Paso 3: Verificar que se eliminaron todas
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- Paso 4: Crear UNA SOLA política muy permisiva para admins/managers
-- Esta política permite que cualquier admin/manager cree documentos
CREATE POLICY "Admins and managers can insert documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Solo verificar que el usuario es admin/manager/owner en alguna empresa
        -- y que el documento pertenece a esa empresa
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

-- Paso 5: Crear política para usuarios normales (sus propios documentos)
CREATE POLICY "Users can insert their own documents" ON documents
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

-- Paso 6: Verificar políticas finales
SELECT 
    '=== POLÍTICAS FINALES CREADAS ===' as info,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Paso 7: Verificar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Paso 8: Verificar estado final
SELECT 
    '=== ESTADO FINAL ===' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- Paso 9: Mensaje de confirmación
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;

