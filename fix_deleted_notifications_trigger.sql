-- =====================================================
-- CORREGIR TRIGGER DE HISTORIAL DE NOTIFICACIONES BORRADAS
-- =====================================================
-- Este script corrige el trigger para manejar columnas opcionales
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =====================================================

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS before_delete_notification ON notifications;

-- Eliminar función existente
DROP FUNCTION IF EXISTS save_deleted_notification();

-- Crear función corregida que usa row_to_json para manejar columnas opcionales
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

-- Recrear trigger
CREATE TRIGGER before_delete_notification
  BEFORE DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION save_deleted_notification();

-- Verificar que se creó correctamente
SELECT 
  '✅ Trigger corregido exitosamente' as resultado,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'before_delete_notification';

