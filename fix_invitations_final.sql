-- Script final para corregir completamente la tabla invitations
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Agregar todas las columnas faltantes de forma segura
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS token TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS supervisor_id UUID,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- 2. Crear índice único para token si no existe
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- 3. Eliminar políticas RLS problemáticas
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their company" ON invitations;

-- 4. Crear políticas RLS correctas
CREATE POLICY "Users can view invitations for their company" ON invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert invitations for their company" ON invitations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update invitations for their company" ON invitations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- 5. Verificar estructura final
SELECT 
  'Estructura final de invitations' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar políticas RLS finales
SELECT 
  'Políticas RLS finales' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

SELECT '✅ Tabla invitations completamente corregida' as resultado;
