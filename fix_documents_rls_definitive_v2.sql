-- =====================================================
-- SOLUCIÓN DEFINITIVA V2 - ERROR 42501 DOCUMENTOS
-- Usa función SECURITY DEFINER para evitar problemas de contexto
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas de INSERT existentes
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Eliminar todas las políticas de INSERT dinámicamente
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
    
    -- Eliminar políticas conocidas manualmente
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

-- PASO 2: Crear función helper para verificar permisos de inserción
-- Esta función usa SECURITY DEFINER para ejecutarse con privilegios elevados
CREATE OR REPLACE FUNCTION can_insert_document(
    p_company_id UUID,
    p_user_id UUID,
    p_uploaded_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_role TEXT;
    v_recipient_in_company BOOLEAN;
BEGIN
    -- Obtener el usuario actual
    v_current_user_id := auth.uid();
    
    -- Si no hay usuario autenticado, denegar
    IF v_current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que uploaded_by es el usuario actual
    IF p_uploaded_by != v_current_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Obtener el rol del usuario actual en la empresa
    SELECT role INTO v_user_role
    FROM user_company_roles
    WHERE user_id = v_current_user_id
    AND company_id = p_company_id
    AND is_active = true
    LIMIT 1;
    
    -- Si el usuario es owner/admin/manager, permitir si el destinatario está en la misma empresa
    IF v_user_role IN ('owner', 'admin', 'manager') THEN
        -- Verificar que el destinatario está en la misma empresa
        SELECT EXISTS (
            SELECT 1
            FROM user_company_roles
            WHERE user_id = p_user_id
            AND company_id = p_company_id
            AND is_active = true
        ) INTO v_recipient_in_company;
        
        RETURN v_recipient_in_company;
    END IF;
    
    -- Si el usuario es employee, solo puede subir documentos para sí mismo
    IF v_user_role = 'employee' THEN
        RETURN p_user_id = v_current_user_id;
    END IF;
    
    -- Por defecto, denegar
    RETURN FALSE;
END;
$$;

-- PASO 3: Crear política usando la función helper
CREATE POLICY "Allow document insert based on role" ON documents
    FOR INSERT 
    WITH CHECK (
        can_insert_document(
            company_id,
            user_id,
            uploaded_by
        ) = TRUE
    );

-- PASO 4: Verificar que la política se creó correctamente
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

-- PASO 5: Test de la función con datos de ejemplo
-- (Reemplaza los UUIDs con valores reales de tu base de datos)
SELECT 
    '=== TEST DE FUNCIÓN ===' as paso,
    can_insert_document(
        '1e13806a-b410-423f-a986-7957768bf85c'::uuid, -- company_id
        '00000000-0000-0000-0000-000000000000'::uuid, -- user_id (destinatario)
        auth.uid() -- uploaded_by (debe ser el usuario actual)
    ) as can_insert;

-- Mensaje final
SELECT '✅ Script completado. La política ahora usa una función SECURITY DEFINER.' as resultado;
SELECT '⚠️ Si aún falla, verifica que auth.uid() retorne el ID correcto del usuario.' as advertencia;

