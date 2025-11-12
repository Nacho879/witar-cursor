-- =====================================================
-- SCRIPT DE DEBUG Y CORRECCIÓN PARA DOCUMENTOS RLS
-- =====================================================

-- Paso 1: Ver todas las políticas actuales
SELECT 
    '=== POLÍTICAS ACTUALES ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- Paso 2: Verificar estructura de la tabla
SELECT 
    '=== ESTRUCTURA DE TABLA ===' as paso,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'documents'
ORDER BY ordinal_position;

-- Paso 3: Verificar RLS
SELECT 
    '=== ESTADO DE RLS ===' as paso,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- Paso 4: Eliminar TODAS las políticas de INSERT
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
DROP POLICY IF EXISTS "documents_policy" ON documents;
DROP POLICY IF EXISTS "Users can view company documents" ON documents;

-- Paso 5: Crear política simple y permisiva para admins/managers
-- Esta política permite que cualquier admin/manager de la empresa cree documentos
CREATE POLICY "Admins and managers can create documents" ON documents
    FOR INSERT 
    WITH CHECK (
        -- El usuario autenticado debe ser admin/owner/manager en la empresa
        EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
        AND
        -- El documento debe estar siendo subido por el usuario autenticado
        documents.uploaded_by = auth.uid()
    );

-- Paso 6: Crear política para usuarios que suben sus propios documentos
CREATE POLICY "Users can create their own documents" ON documents
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

-- Paso 7: Verificar políticas creadas
SELECT 
    '=== POLÍTICAS CREADAS ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Paso 8: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Paso 9: Mensaje final
SELECT '✅ Script de corrección completado' as resultado;

