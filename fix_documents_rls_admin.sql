-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA DOCUMENTOS
-- Permitir que admins y managers puedan subir documentos a empleados
-- =====================================================

-- Eliminar políticas existentes de INSERT si existen
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;

-- Política 1: Los usuarios pueden crear sus propios documentos
CREATE POLICY "Users can create their own documents" ON documents
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        uploaded_by = auth.uid()
    );

-- Política 2: Admins, owners y managers pueden crear documentos para otros usuarios
-- Esta política permite que un admin/manager suba un documento asignado a otro usuario
CREATE POLICY "Admins and managers can create documents for employees" ON documents
    FOR INSERT WITH CHECK (
        -- Verificar que el usuario autenticado es admin/owner/manager en la empresa
        EXISTS (
            SELECT 1 FROM user_company_roles ucr_uploader
            WHERE ucr_uploader.user_id = auth.uid()
            AND ucr_uploader.company_id = documents.company_id
            AND ucr_uploader.role IN ('owner', 'admin', 'manager')
            AND ucr_uploader.is_active = true
        )
        AND
        -- Verificar que el documento está siendo subido por el usuario autenticado
        documents.uploaded_by = auth.uid()
        AND
        (
            -- Si el documento está asignado a un usuario específico, verificar que ese usuario pertenece a la misma empresa
            documents.user_id IS NULL OR
            EXISTS (
                SELECT 1 FROM user_company_roles ucr_recipient
                WHERE ucr_recipient.user_id = documents.user_id
                AND ucr_recipient.company_id = documents.company_id
                AND ucr_recipient.is_active = true
            )
        )
    );

-- Verificar que las políticas se crearon correctamente
SELECT 
    '✅ Políticas de documentos actualizadas' as resultado,
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
AND cmd = 'INSERT'
ORDER BY policyname;

