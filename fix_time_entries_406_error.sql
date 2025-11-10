-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA ERROR 406 EN TIME_ENTRIES
-- =====================================================
-- Este script arregla las políticas RLS de time_entries
-- para permitir las consultas necesarias y evitar el error 406

-- =====================================================
-- 1. VERIFICAR Y AGREGAR COLUMNA STATUS SI NO EXISTE
-- =====================================================
DO $$ 
BEGIN
    -- Agregar status si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'status'
    ) THEN
        ALTER TABLE time_entries 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'completed', 'cancelled'));
        
        -- Actualizar registros existentes
        UPDATE time_entries 
        SET status = 'completed' 
        WHERE status IS NULL OR status = '';
    END IF;
END $$;

-- =====================================================
-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- =====================================================
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers can view employee time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers can view company time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers can update company time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers can delete company time entries" ON time_entries;
DROP POLICY IF EXISTS "Only admins can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers, admins and owners can delete time entries" ON time_entries;
DROP POLICY IF EXISTS "time_entries_policy" ON time_entries;
DROP POLICY IF EXISTS "Users can view company time entries" ON time_entries;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON time_entries;

-- =====================================================
-- 3. CREAR POLÍTICAS RLS CORRECTAS Y COMPLETAS
-- =====================================================

-- SELECT: Los usuarios pueden ver sus propios registros
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT 
    USING (user_id = auth.uid());

-- SELECT: Los managers/admins/owners pueden ver registros de su empresa
CREATE POLICY "Managers can view company time entries" ON time_entries
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- INSERT: Los usuarios pueden crear sus propios registros
CREATE POLICY "Users can create their own time entries" ON time_entries
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Los usuarios pueden actualizar sus propios registros
CREATE POLICY "Users can update their own time entries" ON time_entries
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Los managers/admins/owners pueden actualizar registros de su empresa
CREATE POLICY "Managers can update company time entries" ON time_entries
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- DELETE: Los managers/admins/owners pueden eliminar registros de su empresa
CREATE POLICY "Managers can delete company time entries" ON time_entries
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- =====================================================
-- 4. REACTIVAR RLS
-- =====================================================
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_time_entries_user_company 
    ON time_entries(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_status 
    ON time_entries(status);

CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type 
    ON time_entries(entry_type);

CREATE INDEX IF NOT EXISTS idx_time_entries_entry_time 
    ON time_entries(entry_time);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_company_status_type 
    ON time_entries(user_id, company_id, status, entry_type);

-- =====================================================
-- 6. VERIFICACIÓN FINAL
-- =====================================================
-- Verificar que RLS está habilitado
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables 
WHERE tablename = 'time_entries';

-- Verificar políticas creadas
SELECT 
    'Policies' as check_type,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ WITH CONDITIONS'
        ELSE '⚠️ NO CONDITIONS'
    END as policy_status
FROM pg_policies 
WHERE tablename = 'time_entries'
ORDER BY cmd, policyname;

