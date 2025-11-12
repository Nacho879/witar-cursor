-- Script para agregar columnas faltantes a la tabla notifications
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Agregar columna sender_id si no existe
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Agregar columna data si no existe
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Crear índice para sender_id si no existe
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND column_name IN ('sender_id', 'data')
ORDER BY column_name;

SELECT '✅ Columnas agregadas correctamente' as resultado;

