-- =====================================================
-- CORREGIR COMPLETAMENTE LAS POLÍTICAS RLS PARA DOCUMENTOS
-- Permitir que admins y managers puedan subir documentos a empleados
-- =====================================================

-- Primero, verificar qué políticas existen actualmente
SELECT 
    'Políticas actuales de documentos' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- Eliminar TODAS las políticas de INSERT existentes para empezar limpio
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
DROP POLICY IF EXISTS "documents_policy" ON documents;
DROP POLICY IF EXISTS "Users can view company documents" ON documents;

-- Política 1: Los usuarios pueden crear sus propios documentos
-- (cuando user_id = auth.uid() y uploaded_by = auth.uid())
CREATE POLICY "Users can create their own documents" ON documents
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND uploaded_by = auth.uid()
        AND company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Política 2: Admins, owners y managers pueden crear documentos para otros usuarios
-- Esta es la política que permite que un admin suba un documento a un empleado
CREATE POLICY "Admins and managers can create documents for employees" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Verificar que el usuario autenticado es admin/owner/manager en la empresa
        documents.company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
        AND
        -- El documento debe estar siendo subido por el usuario autenticado
        documents.uploaded_by = auth.uid()
        AND
        -- Verificar que el destinatario (user_id) pertenece a la misma empresa
        documents.user_id IN (
            SELECT user_id 
            FROM user_company_roles 
            WHERE company_id = documents.company_id
            AND is_active = true
        )
    );

-- Verificar que las políticas se crearon correctamente
SELECT 
    '✅ Políticas de INSERT para documentos' as resultado,
    policyname,
    cmd,
    permissive,
    roles,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Verificar que RLS está habilitado
SELECT 
    'Estado de RLS en documents' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- Si RLS no está habilitado, habilitarlo
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Mensaje final
SELECT '✅ Script completado. Las políticas han sido actualizadas.' as mensaje;

