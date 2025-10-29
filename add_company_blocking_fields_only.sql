-- Script para añadir solo los campos de bloqueo a la tabla companies
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Añadir campos de bloqueo a companies si no existen
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'blocked')),
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- 2. Crear índice para consultas de estado
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 3. Actualizar empresas existentes para que tengan estado 'trial'
UPDATE companies 
SET status = 'trial' 
WHERE status IS NULL OR status = 'active';

-- 4. Verificar que los campos se añadieron correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('status', 'blocked_at', 'blocked_reason')
ORDER BY column_name;

-- 5. Verificar el estado de las empresas
SELECT 
  id,
  name,
  status,
  blocked_at,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Campos de bloqueo añadidos correctamente' as resultado;
