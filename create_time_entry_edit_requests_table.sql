-- =====================================================
-- CREAR TABLA: time_entry_edit_requests
-- =====================================================
-- Este script crea la tabla de solicitudes de edición de fichajes
-- si no existe, junto con sus índices, triggers y políticas RLS

-- =====================================================
-- 1. CREAR LA TABLA (solo si no existe)
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entry_edit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Empleado que solicita la edición
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('edit_time', 'edit_type', 'delete_entry', 'add_entry')),
    
    -- Datos actuales del fichaje (para referencia)
    current_entry_type VARCHAR(20) NOT NULL,
    current_entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    current_notes TEXT,
    
    -- Datos propuestos para la edición
    proposed_entry_type VARCHAR(20),
    proposed_entry_time TIMESTAMP WITH TIME ZONE,
    proposed_notes TEXT,
    
    -- Motivo de la solicitud
    reason TEXT NOT NULL,
    
    -- Estado de la solicitud
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Aprobación
    approved_by UUID, -- user_id del manager que aprueba/rechaza
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREAR ÍNDICES (solo si no existen)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_time_entry_edit_requests_user_id 
    ON time_entry_edit_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_edit_requests_company_id 
    ON time_entry_edit_requests(company_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_edit_requests_time_entry_id 
    ON time_entry_edit_requests(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_edit_requests_status 
    ON time_entry_edit_requests(status);

CREATE INDEX IF NOT EXISTS idx_time_entry_edit_requests_approved_by 
    ON time_entry_edit_requests(approved_by);

-- =====================================================
-- 3. CREAR FUNCIÓN PARA ACTUALIZAR updated_at (si no existe)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 4. CREAR TRIGGER (eliminar y recrear si existe)
-- =====================================================
DROP TRIGGER IF EXISTS update_time_entry_edit_requests_updated_at ON time_entry_edit_requests;

CREATE TRIGGER update_time_entry_edit_requests_updated_at 
    BEFORE UPDATE ON time_entry_edit_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE time_entry_edit_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREAR POLÍTICAS RLS (eliminar y recrear si existen)
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view company edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can create their own edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Managers can update edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can update their own pending requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "time_entry_edit_requests_policy" ON time_entry_edit_requests;

-- Política 1: Los usuarios pueden ver solicitudes de su empresa
CREATE POLICY "Users can view company edit requests" ON time_entry_edit_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entry_edit_requests.company_id
            AND user_id = auth.uid()
            AND is_active = true
        )
    );

-- Política 2: Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own edit requests" ON time_entry_edit_requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entry_edit_requests.company_id
            AND user_id = auth.uid()
            AND is_active = true
        )
    );

-- Política 3: Los managers, admins y owners pueden actualizar solicitudes de su empresa
CREATE POLICY "Managers can update edit requests" ON time_entry_edit_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entry_edit_requests.company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- Política 4: Los usuarios pueden actualizar sus propias solicitudes pendientes
CREATE POLICY "Users can update their own pending requests" ON time_entry_edit_requests
    FOR UPDATE USING (
        user_id = auth.uid()
        AND status = 'pending'
    );

-- Política 5: Los usuarios pueden cancelar sus propias solicitudes pendientes
CREATE POLICY "Users can cancel their own pending requests" ON time_entry_edit_requests
    FOR UPDATE USING (
        user_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (status = 'cancelled' OR status = 'pending')
    );

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entry_edit_requests'
    ) THEN
        RAISE NOTICE '✅ Tabla time_entry_edit_requests creada/verificada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: La tabla no se pudo crear';
    END IF;
END $$;

-- Verificar índices
SELECT 
    'Índices creados:' as info,
    indexname 
FROM pg_indexes 
WHERE tablename = 'time_entry_edit_requests'
ORDER BY indexname;

