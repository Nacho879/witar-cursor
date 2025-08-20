-- =====================================================
-- MIGRACIÓN: SOLICITUDES DE EDICIÓN DE FICHAJES
-- =====================================================

-- =====================================================
-- TABLA DE SOLICITUDES DE EDICIÓN DE FICHAJES
-- =====================================================
CREATE TABLE time_entry_edit_requests (
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
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_time_entry_edit_requests_user_id ON time_entry_edit_requests(user_id);
CREATE INDEX idx_time_entry_edit_requests_company_id ON time_entry_edit_requests(company_id);
CREATE INDEX idx_time_entry_edit_requests_time_entry_id ON time_entry_edit_requests(time_entry_id);
CREATE INDEX idx_time_entry_edit_requests_status ON time_entry_edit_requests(status);
CREATE INDEX idx_time_entry_edit_requests_approved_by ON time_entry_edit_requests(approved_by);

-- =====================================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_entry_edit_requests_updated_at 
    BEFORE UPDATE ON time_entry_edit_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 