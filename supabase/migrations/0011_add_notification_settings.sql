-- =====================================================
-- AÑADIR CONFIGURACIÓN DE ALERTAS A COMPANY_SETTINGS
-- =====================================================

-- Añadir columnas de configuración de alertas
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS notify_time_clock BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_requests BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_employees BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_documents BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_invitations BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_late_arrivals BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_absences BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_overtime BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_system_warnings BOOLEAN DEFAULT TRUE;

-- Comentarios para documentar las columnas
COMMENT ON COLUMN company_settings.notify_time_clock IS 'Notificar fichajes de empleados';
COMMENT ON COLUMN company_settings.notify_requests IS 'Notificar nuevas solicitudes';
COMMENT ON COLUMN company_settings.notify_employees IS 'Notificar cambios de empleados';
COMMENT ON COLUMN company_settings.notify_documents IS 'Notificar subida/actualización de documentos';
COMMENT ON COLUMN company_settings.notify_invitations IS 'Notificar invitaciones';
COMMENT ON COLUMN company_settings.notify_late_arrivals IS 'Notificar llegadas tardías';
COMMENT ON COLUMN company_settings.notify_absences IS 'Notificar ausencias no justificadas';
COMMENT ON COLUMN company_settings.notify_overtime IS 'Notificar horas extra';
COMMENT ON COLUMN company_settings.notify_system_warnings IS 'Notificar advertencias del sistema'; 