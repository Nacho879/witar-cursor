-- =====================================================
-- ÚLTIMO INTENTO - ERROR 42501
-- Usa auth.role() en lugar de auth.uid()
-- =====================================================

-- PASO 1: Verificar autenticación
SELECT 
    '=== VERIFICACIÓN ===' as paso,
    auth.uid() as user_id,
    auth.role() as role,
    auth.jwt() as jwt_exists;

-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS DE FORMA AGRESIVA
DO $$ 
DECLARE
    policy_record RECORD;
    sql_cmd TEXT;
BEGIN
    -- Primero, obtener todas las políticas y eliminarlas
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        sql_cmd := format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
        BEGIN
            EXECUTE sql_cmd;
            RAISE NOTICE 'Eliminada: %', policy_record.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error eliminando %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    -- Eliminar políticas conocidas directamente
    DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Managers can create documents for their employees" ON public.documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents for employees" ON public.documents;
    DROP POLICY IF EXISTS "Admins and managers can create documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins and managers can insert documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
    DROP POLICY IF EXISTS "Allow document insert based on role" ON public.documents;
    DROP POLICY IF EXISTS "Allow document insert with permission check" ON public.documents;
    DROP POLICY IF EXISTS "Admins managers owners can insert any document" ON public.documents;
    DROP POLICY IF EXISTS "Allow insert for admins managers owners" ON public.documents;
    DROP POLICY IF EXISTS "Allow insert for own documents" ON public.documents;
    DROP POLICY IF EXISTS "Allow document insert with verification" ON public.documents;
    DROP POLICY IF EXISTS "Minimal insert policy" ON public.documents;
    DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.documents;
    DROP POLICY IF EXISTS "Managers can view public employee documents" ON public.documents;
    DROP POLICY IF EXISTS "Only admins can update documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can update own uploaded documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can delete own uploaded documents" ON public.documents;
    DROP POLICY IF EXISTS "documents_policy" ON public.documents;
END $$;

-- PASO 3: Verificar que se eliminaron TODAS
SELECT 
    '=== POLÍTICAS RESTANTES ===' as paso,
    COUNT(*) as total
FROM pg_policies 
WHERE tablename = 'documents';

-- PASO 4: Asegurar RLS habilitado
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear política usando auth.role()
CREATE POLICY "Allow insert for authenticated" ON documents
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND uploaded_by = auth.uid()
    );

-- PASO 6: Política para SELECT
CREATE POLICY "Allow select own documents" ON documents
    FOR SELECT 
    USING (
        user_id = auth.uid()
        OR uploaded_by = auth.uid()
    );

-- PASO 7: Verificar políticas creadas
SELECT 
    '=== POLÍTICAS FINALES ===' as paso,
    policyname,
    cmd,
    with_check,
    qual
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- PASO 8: Test
SELECT 
    '=== TEST ===' as paso,
    auth.role() = 'authenticated' as role_check,
    auth.uid() IS NOT NULL as uid_check,
    auth.uid() as user_id;

SELECT '✅ Script completado.' as resultado;
SELECT '📝 Esta política usa auth.role() = ''authenticated'' en lugar de auth.uid().' as nota;

