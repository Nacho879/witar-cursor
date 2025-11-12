-- =====================================================
-- POLÍTICA SEGURA FINAL - Basada en la solución que funcionó
-- Verifica que el usuario sea admin/manager/owner en la empresa
-- =====================================================

-- PASO 1: Eliminar la política simple actual
DROP POLICY IF EXISTS "Allow insert for authenticated" ON documents;

-- PASO 2: Crear política más segura que verifica el rol en la empresa
CREATE POLICY "Allow insert for admins managers owners in company" ON documents
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- PASO 3: Política para usuarios que suben sus propios documentos
CREATE POLICY "Allow insert for own documents" ON documents
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
        AND uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
            AND company_id = documents.company_id
            AND is_active = true
        )
    );

-- PASO 4: Verificar políticas creadas
SELECT 
    '=== POLÍTICAS FINALES ===' as paso,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

SELECT '✅ Política segura creada.' as resultado;
SELECT '📝 Ahora solo admins/managers/owners pueden subir documentos para otros en su empresa.' as nota;

