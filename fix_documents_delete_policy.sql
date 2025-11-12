-- =====================================================
-- AGREGAR POLÍTICA RLS PARA ELIMINAR DOCUMENTOS
-- =====================================================

-- Verificar políticas actuales de DELETE
SELECT 
    '=== POLÍTICAS DELETE ACTUALES ===' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'DELETE';

-- Eliminar políticas de DELETE existentes si las hay
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Admins and managers can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
DROP POLICY IF EXISTS "Allow document deletion" ON documents;

-- Política 1: Los usuarios pueden eliminar sus propios documentos
-- (documentos donde user_id = auth.uid())
CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE 
    USING (
        user_id = auth.uid()
    );

-- Política 2: Los usuarios pueden eliminar documentos que ellos subieron
-- (documentos donde uploaded_by = auth.uid())
CREATE POLICY "Users can delete documents they uploaded" ON documents
    FOR DELETE 
    USING (
        uploaded_by = auth.uid()
    );

-- Política 3: Admins, managers y owners pueden eliminar documentos de su empresa
CREATE POLICY "Admins managers owners can delete company documents" ON documents
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- Verificar que se crearon las políticas
SELECT 
    '=== POLÍTICAS DELETE DESPUÉS DE CREAR ===' as info,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'DELETE'
ORDER BY policyname;

