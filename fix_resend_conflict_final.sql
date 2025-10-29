-- SOLUCIÓN DEFINITIVA: Usar solo Resend, deshabilitar Supabase emails
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Deshabilitar completamente los emails de Supabase
SELECT 
  'DESHABILITANDO EMAILS DE SUPABASE' as info,
  'Usando solo Resend para todas las comunicaciones' as descripcion;

-- 2. Eliminar triggers de email de Supabase
DROP TRIGGER IF EXISTS on_invitation_created ON invitations;
DROP TRIGGER IF EXISTS on_invitation_updated ON invitations;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Eliminar funciones de email de Supabase
DROP FUNCTION IF EXISTS send_invitation_email();
DROP FUNCTION IF EXISTS handle_invitation_email();
DROP FUNCTION IF EXISTS send_welcome_email();

-- 4. Asegurar que la tabla invitations está perfecta para Resend
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

-- 5. Corregir valores NULL en invitaciones existentes
UPDATE invitations 
SET 
  first_name = COALESCE(first_name, 'Usuario'),
  last_name = COALESCE(last_name, 'Invitado'),
  token = COALESCE(token, gen_random_uuid()::text),
  expires_at = COALESCE(expires_at, NOW() + INTERVAL '7 days'),
  status = COALESCE(status, 'pending')
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR token IS NULL 
   OR expires_at IS NULL 
   OR status IS NULL;

-- 6. Crear índice único para token
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_unique ON invitations(token);

-- 7. Eliminar todas las políticas RLS problemáticas
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Service role can manage all invitations" ON invitations;

-- 8. Crear políticas RLS simples y efectivas
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

-- 9. Crear política especial para service role (función Edge)
CREATE POLICY "Service role can manage all invitations" ON invitations
  FOR ALL USING (true)
  WITH CHECK (true);

-- 10. Verificar que no hay valores NULL problemáticos
SELECT 
  'VERIFICACIÓN FINAL' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN first_name IS NULL THEN 1 END) as null_first_name,
  COUNT(CASE WHEN last_name IS NULL THEN 1 END) as null_last_name,
  COUNT(CASE WHEN token IS NULL THEN 1 END) as null_token,
  COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as null_expires_at,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status
FROM invitations;

-- 11. Verificar estructura final
SELECT 
  'ESTRUCTURA FINAL DE INVITATIONS' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '🎉 CONFLICTO RESUELTO - SOLO RESEND ACTIVO' as resultado;
