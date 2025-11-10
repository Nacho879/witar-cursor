-- =====================================================
-- CREAR HISTORIAL DE NOTIFICACIONES BORRADAS
-- =====================================================

-- Crear tabla para historial de notificaciones borradas
CREATE TABLE IF NOT EXISTS deleted_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL, -- ID original de la notificación
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuario que borró la notificación
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha de borrado
  original_created_at TIMESTAMP WITH TIME ZONE, -- Fecha original de creación
  original_updated_at TIMESTAMP WITH TIME ZONE -- Fecha original de actualización
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_deleted_notifications_company_id ON deleted_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_deleted_notifications_recipient_id ON deleted_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deleted_notifications_deleted_at ON deleted_notifications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_notifications_deleted_by ON deleted_notifications(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_notifications_original_id ON deleted_notifications(original_id);

-- Crear función para guardar en historial antes de borrar
-- Usa SQL dinámico para manejar diferentes estructuras de tabla
CREATE OR REPLACE FUNCTION save_deleted_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_sql TEXT;
  v_old_json JSONB;
  v_sender_id TEXT := 'NULL';
  v_data TEXT := '''{}''::jsonb';
  v_read_at TEXT := 'NULL';
  v_has_sender_id BOOLEAN;
  v_has_data BOOLEAN;
  v_has_read_at BOOLEAN;
  v_has_is_read BOOLEAN;
BEGIN
  -- Convertir OLD a JSON para acceder dinámicamente a las columnas
  v_old_json := row_to_json(OLD)::jsonb;
  
  -- Verificar qué columnas existen en la tabla notifications
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sender_id'
  ) INTO v_has_sender_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'data'
  ) INTO v_has_data;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) INTO v_has_read_at;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) INTO v_has_is_read;
  
  -- Construir valores para columnas opcionales desde JSON
  IF v_has_sender_id AND v_old_json ? 'sender_id' THEN
    IF v_old_json->>'sender_id' IS NOT NULL THEN
      v_sender_id := quote_literal(v_old_json->>'sender_id');
    END IF;
  END IF;
  
  IF v_has_data AND v_old_json ? 'data' THEN
    IF v_old_json->'data' IS NOT NULL THEN
      v_data := quote_literal(v_old_json->'data'::text) || '::jsonb';
    END IF;
  END IF;
  
  IF v_has_read_at AND v_old_json ? 'read_at' THEN
    IF v_old_json->>'read_at' IS NOT NULL THEN
      v_read_at := quote_literal(v_old_json->>'read_at') || '::timestamp with time zone';
    END IF;
  ELSIF v_has_is_read AND v_old_json ? 'is_read' THEN
    -- Si existe is_read, convertir a read_at
    IF (v_old_json->>'is_read')::boolean = true THEN
      IF v_old_json ? 'updated_at' AND v_old_json->>'updated_at' IS NOT NULL THEN
        v_read_at := quote_literal(v_old_json->>'updated_at') || '::timestamp with time zone';
      ELSIF v_old_json ? 'created_at' AND v_old_json->>'created_at' IS NOT NULL THEN
        v_read_at := quote_literal(v_old_json->>'created_at') || '::timestamp with time zone';
      END IF;
    END IF;
  END IF;
  
  -- Construir SQL dinámico usando valores del JSON
  v_sql := format('
    INSERT INTO deleted_notifications (
      original_id,
      company_id,
      recipient_id,
      sender_id,
      type,
      title,
      message,
      data,
      read_at,
      deleted_by,
      original_created_at,
      original_updated_at
    ) VALUES (
      %L,
      %L,
      %L,
      %s,
      %L,
      %L,
      %L,
      %s,
      %s,
      %L,
      %L,
      COALESCE(%L::timestamp with time zone, %L::timestamp with time zone)
    )',
    v_old_json->>'id',
    v_old_json->>'company_id',
    v_old_json->>'recipient_id',
    v_sender_id,
    v_old_json->>'type',
    v_old_json->>'title',
    v_old_json->>'message',
    v_data,
    v_read_at,
    auth.uid(),
    v_old_json->>'created_at',
    COALESCE(v_old_json->>'updated_at', v_old_json->>'created_at'),
    v_old_json->>'created_at'
  );
  
  -- Ejecutar SQL dinámico
  EXECUTE v_sql;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta antes de borrar
CREATE TRIGGER before_delete_notification
  BEFORE DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION save_deleted_notification();

-- Crear función para limpiar registros mayores a 15 días
CREATE OR REPLACE FUNCTION cleanup_old_deleted_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar registros con más de 15 días
  DELETE FROM deleted_notifications
  WHERE deleted_at < NOW() - INTERVAL '15 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en deleted_notifications
ALTER TABLE deleted_notifications ENABLE ROW LEVEL SECURITY;

-- Política para ver historial: usuarios pueden ver sus propias notificaciones borradas
CREATE POLICY "Users can view their deleted notifications" ON deleted_notifications
    FOR SELECT USING (
        recipient_id = auth.uid() OR 
        deleted_by = auth.uid() OR
        (recipient_id IS NULL AND company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        ))
    );

-- Política para admins/owners: pueden ver todas las notificaciones borradas de su empresa
CREATE POLICY "Admins can view all deleted notifications" ON deleted_notifications
    FOR SELECT USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
            AND role IN ('owner', 'admin')
        )
    );

-- Comentarios en la tabla
COMMENT ON TABLE deleted_notifications IS 'Historial de notificaciones borradas, se mantiene por 15 días';
COMMENT ON COLUMN deleted_notifications.deleted_at IS 'Fecha en que se borró la notificación';
COMMENT ON COLUMN deleted_notifications.deleted_by IS 'Usuario que borró la notificación';
COMMENT ON COLUMN deleted_notifications.original_id IS 'ID original de la notificación antes de ser borrada';

