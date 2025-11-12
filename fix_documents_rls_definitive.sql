-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA ERROR 403/42501 EN DOCUMENTOS
-- =====================================================

-- PASO 1: Ver TODAS las políticas actuales
SELECT 
    '=== POLÍTICAS ACTUALES ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- PASO 2: ELIMINAR TODAS las políticas de INSERT de forma agresiva
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Eliminar todas las políticas de INSERT
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
    
    -- Eliminar políticas conocidas por si acaso
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

-- PASO 3: Verificar que se eliminaron todas
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as politicas_restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 4: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear política SIMPLE para admins/managers/owners
-- Esta política es muy permisiva y solo verifica lo esencial
CREATE POLICY "Admins managers owners can insert documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Verificar que el usuario autenticado es admin/manager/owner en la empresa
        documents.company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
        AND
        -- Verificar que uploaded_by es el usuario autenticado
        documents.uploaded_by = auth.uid()
    );

-- PASO 6: Crear política para usuarios que suben sus propios documentos
CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid()
        AND uploaded_by = auth.uid()
        AND documents.company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- PASO 7: Verificar políticas creadas
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

-- PASO 8: Test de verificación - simular la inserción
-- Esto verifica que la lógica de la política funciona
SELECT 
    '=== TEST DE VERIFICACIÓN ===' as paso,
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as is_admin_or_manager,
    (
        SELECT company_id 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
        LIMIT 1
    ) as admin_company_id;

-- Mensaje final
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;

