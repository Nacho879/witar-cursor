-- =====================================================
-- SOLUCIÓN ULTRA SIMPLE - ERROR 42501
-- Enfoque directo: política muy permisiva para admins
-- =====================================================

-- PASO 1: ELIMINAR TODAS las políticas de INSERT
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
    END LOOP;
    
    -- Eliminar todas las políticas conocidas
    DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
    DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can insert documents" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "Allow document insert based on role" ON documents;
    DROP POLICY IF EXISTS "documents_policy" ON documents;
END $$;

-- PASO 2: Verificar que se eliminaron
SELECT 
    'Políticas restantes' as info,
    COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 3: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear política ULTRA SIMPLE para admins/managers/owners
-- Esta política es muy permisiva y debería funcionar
CREATE POLICY "Admins managers owners can insert any document" ON documents
    FOR INSERT 
    WITH CHECK (
        -- Solo verificar que el usuario es admin/manager/owner en la empresa
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
        uploaded_by = auth.uid()
    );

-- PASO 5: Crear política para usuarios que suben sus propios documentos
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

-- PASO 6: Verificar políticas creadas
SELECT 
    'Políticas creadas' as info,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- PASO 7: Test de verificación
SELECT 
    'Test de verificación' as info,
    auth.uid() as current_user,
    EXISTS (
        SELECT 1 
        FROM user_company_roles 
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND role IN ('owner', 'admin', 'manager')
        AND is_active = true
    ) as is_admin_in_company;

SELECT '✅ Script completado. Intenta subir el documento nuevamente.' as resultado;

