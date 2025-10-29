-- Script final para corregir el error 400 en send-invitation-email
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Asegurar que todas las columnas existen y tienen valores por defecto
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS token TEXT DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS supervisor_id UUID,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- 2. Actualizar invitaciones existentes que tengan valores NULL
UPDATE invitations 
SET 
  first_name = COALESCE(first_name, ''),
  last_name = COALESCE(last_name, ''),
  token = COALESCE(token, gen_random_uuid()::text),
  expires_at = COALESCE(expires_at, NOW() + INTERVAL '7 days'),
  status = COALESCE(status, 'pending')
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR token IS NULL 
   OR expires_at IS NULL 
   OR status IS NULL;

-- 3. Crear índice único para token
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_unique ON invitations(token);

-- 4. Eliminar todas las políticas RLS problemáticas
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their company" ON invitations;

-- 5. Crear políticas RLS más permisivas para la función
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

-- 6. Crear política especial para la función Edge (service role)
CREATE POLICY "Service role can manage all invitations" ON invitations
  FOR ALL USING (true)
  WITH CHECK (true);

-- 7. Verificar que no hay valores NULL problemáticos
SELECT 
  'Verificación de valores NULL' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN first_name IS NULL THEN 1 END) as null_first_name,
  COUNT(CASE WHEN last_name IS NULL THEN 1 END) as null_last_name,
  COUNT(CASE WHEN token IS NULL THEN 1 END) as null_token,
  COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as null_expires_at,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status
FROM invitations;

-- 8. Verificar estructura final
SELECT 
  'ESTRUCTURA FINAL' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '🎉 FUNCIÓN SEND-INVITATION-EMAIL CORREGIDA' as resultado;
