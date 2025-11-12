-- =====================================================
-- DIAGNÓSTICO COMPLETO Y SOLUCIÓN DEFINITIVA
-- Error 42501: new row violates row-level security policy
-- =====================================================

-- DATOS DEL PROBLEMA (de los logs):
-- Usuario autenticado: d123df35-6b05-4730-a8b3-f197ed69ca6d
-- Rol: admin
-- Company ID: 1e13806a-b410-423f-a986-7957768bf85c
-- Destinatario (user_id): e45cc4e9-b33a-4bbe-a111-8b823de4c368
-- uploaded_by: d123df35-6b05-4730-a8b3-f197ed69ca6d

-- =====================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DE RLS
-- =====================================================
SELECT 
    '=== ESTADO RLS ===' as paso,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- =====================================================
-- PASO 2: VER TODAS LAS POLÍTICAS DE INSERT ACTUALES
-- =====================================================
SELECT 
    '=== POLÍTICAS INSERT ACTUALES ===' as paso,
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- PASO 3: VERIFICAR USUARIO Y SUS ROLES
-- =====================================================
SELECT 
    '=== USUARIO ACTUAL ===' as paso,
    auth.uid() as current_user_id,
    (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
    ) as user_email;

SELECT 
    '=== ROLES DEL USUARIO ===' as paso,
    company_id,
    role,
    is_active,
    department_id
FROM user_company_roles 
WHERE user_id = auth.uid()
ORDER BY is_active DESC, company_id;

-- =====================================================
-- PASO 4: VERIFICAR DESTINATARIO
-- =====================================================
SELECT 
    '=== DESTINATARIO ===' as paso,
    'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid as recipient_user_id,
    EXISTS (
        SELECT 1
        FROM user_company_roles
        WHERE user_id = 'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND is_active = true
    ) as recipient_in_company,
    (
        SELECT role
        FROM user_company_roles
        WHERE user_id = 'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND is_active = true
        LIMIT 1
    ) as recipient_role;

-- =====================================================
-- PASO 5: VERIFICAR SI EXISTE LA FUNCIÓN can_insert_document
-- =====================================================
SELECT 
    '=== FUNCIÓN can_insert_document ===' as paso,
    EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'can_insert_document'
    ) as function_exists;

-- =====================================================
-- PASO 6: ELIMINAR TODAS LAS POLÍTICAS DE INSERT
-- =====================================================
DO $$ 
DECLARE
    policy_record RECORD;
    policies_dropped INTEGER := 0;
BEGIN
    RAISE NOTICE '=== ELIMINANDO POLÍTICAS DE INSERT ===';
    
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
            policies_dropped := policies_dropped + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error eliminando política %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    -- Eliminar políticas conocidas manualmente (por si acaso)
    DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
    DROP POLICY IF EXISTS "Managers can create documents for their employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents" ON documents;
    DROP POLICY IF EXISTS "Admins and managers can insert documents" ON documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "Allow document insert based on role" ON documents;
    DROP POLICY IF EXISTS "documents_policy" ON documents;
    
    RAISE NOTICE 'Total de políticas eliminadas: %', policies_dropped;
END $$;

-- =====================================================
-- PASO 7: VERIFICAR QUE SE ELIMINARON
-- =====================================================
SELECT 
    '=== POLÍTICAS DESPUÉS DE ELIMINAR ===' as paso,
    COUNT(*) as politicas_restantes
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT';

-- =====================================================
-- PASO 8: CREAR FUNCIÓN HELPER (si no existe o reemplazar)
-- =====================================================
CREATE OR REPLACE FUNCTION can_insert_document(
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
    v_recipient_in_company BOOLEAN;
BEGIN
    -- Obtener el usuario actual
    v_current_user_id := auth.uid();
    
    -- Si no hay usuario autenticado, denegar
    IF v_current_user_id IS NULL THEN
        RAISE NOTICE 'can_insert_document: No hay usuario autenticado';
        RETURN FALSE;
    END IF;
    
    -- Verificar que uploaded_by es el usuario actual
    IF p_uploaded_by != v_current_user_id THEN
        RAISE NOTICE 'can_insert_document: uploaded_by (%) no coincide con usuario actual (%)', p_uploaded_by, v_current_user_id;
        RETURN FALSE;
    END IF;
    
    -- Obtener el rol del usuario actual en la empresa
    SELECT role INTO v_user_role
    FROM user_company_roles
    WHERE user_id = v_current_user_id
    AND company_id = p_company_id
    AND is_active = true
    LIMIT 1;
    
    -- Si no tiene rol en la empresa, denegar
    IF v_user_role IS NULL THEN
        RAISE NOTICE 'can_insert_document: Usuario no tiene rol activo en la empresa';
        RETURN FALSE;
    END IF;
    
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
        
        IF NOT v_recipient_in_company THEN
            RAISE NOTICE 'can_insert_document: Destinatario no está en la misma empresa';
            RETURN FALSE;
        END IF;
        
        RAISE NOTICE 'can_insert_document: Permitido - Usuario % es % en empresa %, destinatario está en la empresa', v_current_user_id, v_user_role, p_company_id;
        RETURN TRUE;
    END IF;
    
    -- Si el usuario es employee, solo puede subir documentos para sí mismo
    IF v_user_role = 'employee' THEN
        IF p_user_id = v_current_user_id THEN
            RAISE NOTICE 'can_insert_document: Permitido - Employee subiendo para sí mismo';
            RETURN TRUE;
        ELSE
            RAISE NOTICE 'can_insert_document: Denegado - Employee no puede subir para otros';
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Por defecto, denegar
    RAISE NOTICE 'can_insert_document: Denegado - Rol desconocido o sin permisos';
    RETURN FALSE;
END;
$$;

-- =====================================================
-- PASO 9: CREAR POLÍTICA SIMPLE Y DIRECTA
-- =====================================================
CREATE POLICY "Allow document insert based on role" ON documents
    FOR INSERT 
    WITH CHECK (
        can_insert_document(
            company_id,
            user_id,
            uploaded_by
        ) = TRUE
    );

-- =====================================================
-- PASO 10: VERIFICAR POLÍTICA CREADA
-- =====================================================
SELECT 
    '=== POLÍTICA FINAL ===' as paso,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- PASO 11: TEST CON DATOS REALES
-- =====================================================
SELECT 
    '=== TEST CON DATOS REALES ===' as paso,
    can_insert_document(
        '1e13806a-b410-423f-a986-7957768bf85c'::uuid, -- company_id
        'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid, -- user_id (destinatario)
        auth.uid() -- uploaded_by (debe ser d123df35-6b05-4730-a8b3-f197ed69ca6d)
    ) as should_allow_insert;

-- =====================================================
-- PASO 12: VERIFICACIÓN FINAL
-- =====================================================
SELECT 
    '=== VERIFICACIÓN FINAL ===' as paso,
    auth.uid() as current_user,
    (
        SELECT role
        FROM user_company_roles
        WHERE user_id = auth.uid()
        AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
        AND is_active = true
        LIMIT 1
    ) as user_role,
    (
        SELECT EXISTS (
            SELECT 1
            FROM user_company_roles
            WHERE user_id = 'e45cc4e9-b33a-4bbe-a111-8b823de4c368'::uuid
            AND company_id = '1e13806a-b410-423f-a986-7957768bf85c'::uuid
            AND is_active = true
        )
    ) as recipient_in_company;

-- Mensaje final
SELECT '✅ Script completado. Revisa los resultados de cada paso.' as resultado;
SELECT '⚠️ Si el test en PASO 11 retorna FALSE, revisa los logs de la función can_insert_document.' as advertencia;
SELECT '📝 Intenta subir el documento nuevamente desde la aplicación.' as siguiente_paso;

