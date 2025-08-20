-- =====================================================
-- MIGRACIÓN: ACTUALIZAR TABLA DE NOTIFICACIONES
-- =====================================================

-- Agregar columnas necesarias para el sistema de notificaciones
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS recipient_id UUID,
ADD COLUMN IF NOT EXISTS sender_id UUID,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- Actualizar políticas RLS para usar recipient_id
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Los usuarios pueden ver sus notificaciones (recipient_id) y notificaciones generales (recipient_id IS NULL)
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (
        auth.uid() = recipient_id OR 
        recipient_id IS NULL
    );

-- Los usuarios pueden actualizar sus notificaciones
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Los usuarios pueden eliminar sus notificaciones
CREATE POLICY "Users can delete their notifications" ON notifications
    FOR DELETE USING (auth.uid() = recipient_id);

-- El sistema puede insertar notificaciones (mantener política existente)
-- CREATE POLICY "System can insert notifications" ON notifications
--     FOR INSERT WITH CHECK (true); 