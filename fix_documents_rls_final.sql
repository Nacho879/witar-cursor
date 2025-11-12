-- =====================================================
-- SOLUCIÓN FINAL PARA ERROR 403 EN DOCUMENTOS
-- Este script elimina TODAS las políticas y crea nuevas
-- =====================================================

-- PASO 1: Ver todas las políticas actuales
SELECT 
    '=== POLÍTICAS ACTUALES (ANTES) ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- PASO 2: Eliminar TODAS las políticas de INSERT usando un loop
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
        RAISE NOTICE 'Eliminada política: %', policy_record.policyname;
    END LOOP;
    
    -- Si no hay políticas, intentar eliminar las conocidas por si acaso
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own documents" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can create documents" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can insert documents" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "documents_policy" ON documents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view company documents" ON documents';
END $$;

-- PASO 3: Verificar que se eliminaron
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as politicas_restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 4: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear política MUY SIMPLE para admins/managers
-- Esta política es la más permisiva posible para debugging
CREATE POLICY "Admins managers owners can insert documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Solo verificar que el usuario autenticado es admin/manager/owner
        -- y que el documento pertenece a su empresa
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
    '=== POLÍTICAS FINALES CREADAS ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- PASO 8: Verificar estado de RLS
SELECT 
    '=== ESTADO FINAL RLS ===' as paso,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- PASO 9: Test de verificación - verificar que un admin puede insertar
-- (Esto solo verifica la lógica, no inserta realmente)
SELECT 
    '=== TEST DE VERIFICACIÓN ===' as paso,
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as is_admin_or_manager;

-- Mensaje final
SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;

