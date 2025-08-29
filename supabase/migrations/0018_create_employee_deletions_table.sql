-- Crear tabla para auditoría de eliminaciones de empleados
CREATE TABLE IF NOT EXISTS employee_deletions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT,
  employee_email TEXT,
  deleted_by UUID NOT NULL,
  deleted_by_name TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_employee_deletions_employee_id ON employee_deletions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deletions_deleted_by ON employee_deletions(deleted_by);
CREATE INDEX IF NOT EXISTS idx_employee_deletions_company_id ON employee_deletions(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_deletions_deleted_at ON employee_deletions(deleted_at);

-- Habilitar RLS
ALTER TABLE employee_deletions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Solo admins y owners pueden ver las eliminaciones de su empresa
CREATE POLICY "Admins can view employee deletions" ON employee_deletions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = employee_deletions.company_id
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);

-- Solo admins y owners pueden insertar registros de eliminación
CREATE POLICY "Admins can insert employee deletions" ON employee_deletions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = employee_deletions.company_id
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);

-- Agregar columnas de auditoría a user_company_roles si no existen
DO $$ 
BEGIN
  -- Agregar columna deactivated_at si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_company_roles' 
                 AND column_name = 'deactivated_at') THEN
    ALTER TABLE user_company_roles ADD COLUMN deactivated_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Agregar columna deactivated_by si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_company_roles' 
                 AND column_name = 'deactivated_by') THEN
    ALTER TABLE user_company_roles ADD COLUMN deactivated_by UUID;
  END IF;
END $$; 