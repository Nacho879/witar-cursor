-- SOLUCIÓN URGENTE para el error 400 en invitaciones
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Agregar todas las columnas faltantes
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

-- 2. Crear índice único para token
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- 3. Eliminar políticas RLS problemáticas
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;

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

-- 5. Verificar que todo está correcto
SELECT 
  'VERIFICACIÓN FINAL' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'first_name'
  ) THEN '✅ first_name' ELSE '❌ first_name' END as first_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'last_name'
  ) THEN '✅ last_name' ELSE '❌ last_name' END as last_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'token'
  ) THEN '✅ token' ELSE '❌ token' END as token,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'status'
  ) THEN '✅ status' ELSE '❌ status' END as status;

SELECT '🎉 TABLA INVITATIONS CORREGIDA - PRUEBA AHORA' as resultado;
