-- =====================================================
-- SOLUCIÓN SEGURA - ERROR 42501
-- Política que verifica la empresa usando función SECURITY DEFINER
-- =====================================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS DE INSERT
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
    DROP POLICY IF EXISTS "Allow document insert with permission check" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert any document" ON documents;
    DROP POLICY IF EXISTS "Allow insert for admins managers owners" ON documents;
    DROP POLICY IF EXISTS "Allow insert for own documents" ON documents;
    DROP POLICY IF EXISTS "documents_policy" ON documents;
END $$;

-- PASO 2: Eliminar funciones anteriores
DROP FUNCTION IF EXISTS can_insert_document(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS check_document_insert_permission(UUID, UUID, UUID);

-- PASO 3: Crear función SECURITY DEFINER que verifica permisos
CREATE OR REPLACE FUNCTION verify_document_insert(
    p_company_id UUID,
    p_user_id UUID,
    p_uploaded_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Obtener usuario actual
    v_current_user_id := auth.uid();
    
    -- Verificar autenticación
    IF v_current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que uploaded_by es el usuario actual
    IF p_uploaded_by != v_current_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Obtener rol del usuario en la empresa específica
    SELECT role INTO v_user_role
    FROM user_company_roles
    WHERE user_id = v_current_user_id
    AND company_id = p_company_id
    AND is_active = true
    LIMIT 1;
    
    -- Si es admin/manager/owner, verificar que el destinatario está en la empresa
    IF v_user_role IN ('owner', 'admin', 'manager') THEN
        RETURN EXISTS (
            SELECT 1
            FROM user_company_roles
            WHERE user_id = p_user_id
            AND company_id = p_company_id
            AND is_active = true
        );
    END IF;
    
    -- Si es employee, solo puede subir para sí mismo
    IF v_user_role = 'employee' THEN
        RETURN p_user_id = v_current_user_id;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- PASO 4: Asegurar que RLS está habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear política usando la función
CREATE POLICY "Allow document insert with verification" ON documents
    FOR INSERT 
    WITH CHECK (
        verify_document_insert(
            company_id,
            user_id,
            uploaded_by
        )
    );

-- PASO 6: Verificar políticas creadas
SELECT 
    'Políticas creadas' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- PASO 7: Test
SELECT 
    'Test' as info,
    verify_document_insert(
        '1e13806a-b410-423f-a986-7957768bf85c'::uuid,
        'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid,
        auth.uid()
    ) as should_allow;

SELECT '✅ Script completado. Esta versión es más segura y verifica la empresa.' as resultado;

