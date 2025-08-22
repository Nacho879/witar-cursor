-- =====================================================
-- ARREGLAR POLÍTICAS RLS DE NOTIFICACIONES
-- =====================================================

-- Eliminar políticas existentes de notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_policy" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- Habilitar RLS en notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política para ver notificaciones: usuarios pueden ver sus propias notificaciones y notificaciones globales de su empresa
CREATE POLICY "Users can view notifications" ON notifications
    FOR SELECT USING (
        recipient_id = auth.uid() OR 
        (recipient_id IS NULL AND company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        ))
    );

-- Política para insertar notificaciones: usuarios autenticados pueden crear notificaciones para su empresa
CREATE POLICY "Users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Política para actualizar notificaciones: usuarios pueden marcar como leídas sus propias notificaciones
CREATE POLICY "Users can update notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- Política para eliminar notificaciones: usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete notifications" ON notifications
    FOR DELETE USING (recipient_id = auth.uid());

-- Verificar que las políticas se crearon correctamente
SELECT 
    'notifications_rls_fixed' as status,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname; 