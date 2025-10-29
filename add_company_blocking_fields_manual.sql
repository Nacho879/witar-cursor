-- Añadir campos para el sistema de bloqueo por suscripción
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'blocked')),
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Crear índice para consultas de estado
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Actualizar empresas existentes para que tengan estado 'trial' si no tienen suscripción
UPDATE companies 
SET status = 'trial' 
WHERE id NOT IN (
  SELECT DISTINCT company_id 
  FROM subscriptions 
  WHERE status = 'active'
);

-- Comentarios para documentación
COMMENT ON COLUMN companies.status IS 'Estado de la empresa: active, trial, blocked';
COMMENT ON COLUMN companies.blocked_at IS 'Fecha y hora cuando la empresa fue bloqueada';
COMMENT ON COLUMN companies.blocked_reason IS 'Razón del bloqueo de la empresa';

SELECT 'Campos de bloqueo añadidos a la tabla companies' as status;
