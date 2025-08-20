-- =====================================================
-- MIGRACIÓN: TABLA DE NOTIFICACIONES
-- =====================================================

-- =====================================================
-- TABLA DE NOTIFICACIONES
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Referencia a auth.users
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'request_approved', 'request_rejected', 'time_edit_request', 'invitation', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    data JSONB, -- Datos adicionales específicos del tipo de notificación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA NOTIFICACIONES
-- =====================================================
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA NOTIFICACIONES
-- =====================================================

-- Los usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar solo sus propias notificaciones
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios pueden insertar notificaciones para otros usuarios (para el sistema)
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id); 