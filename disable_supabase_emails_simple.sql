-- Script para deshabilitar emails de Supabase y usar solo Resend
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar configuración actual
SELECT 
  'Configuración actual de emails' as info,
  'Deshabilitando emails de Supabase, usando solo Resend' as descripcion;

-- 2. Deshabilitar triggers de email de Supabase si existen
DROP TRIGGER IF EXISTS on_invitation_created ON invitations;
DROP TRIGGER IF EXISTS on_invitation_updated ON invitations;

-- 3. Eliminar funciones de email de Supabase si existen
DROP FUNCTION IF EXISTS send_invitation_email();
DROP FUNCTION IF EXISTS handle_invitation_email();

-- 4. Verificar que la tabla invitations está lista para Resend
SELECT 
  'Verificación de tabla invitations' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'email'
  ) THEN '✅ email' ELSE '❌ email' END as email,
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

-- 5. Asegurar que todas las columnas necesarias existen
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

-- 6. Actualizar valores NULL
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

-- 7. Crear políticas RLS simples
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;

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

-- 8. Crear política para service role (función Edge)
CREATE POLICY "Service role can manage all invitations" ON invitations
  FOR ALL USING (true)
  WITH CHECK (true);

SELECT '✅ Emails de Supabase deshabilitados, usando solo Resend' as resultado;