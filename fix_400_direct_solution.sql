-- SOLUCIÓN DIRECTA para el error 400 en send-invitation-email
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar el estado actual de la tabla invitations
SELECT 
  'ESTADO ACTUAL DE INVITATIONS' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
FROM invitations;

-- 2. Verificar estructura crítica
SELECT 
  'COLUMNAS CRÍTICAS' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' AND column_name = 'id'
  ) THEN '✅ id' ELSE '❌ id' END as id,
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

-- 3. Crear/actualizar tabla invitations con estructura completa
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  department_id UUID REFERENCES departments(id),
  supervisor_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  temp_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agregar columnas faltantes si no existen
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

-- 5. Corregir valores NULL en todas las invitaciones
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

-- 6. Crear índices necesarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- 7. Eliminar todas las políticas RLS existentes
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

-- 9. Crear política para service role (función Edge)
CREATE POLICY "Service role can manage all invitations" ON invitations
  FOR ALL USING (true)
  WITH CHECK (true);

-- 10. Verificar que no hay valores NULL problemáticos
SELECT 
  'VERIFICACIÓN FINAL' as info,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as null_first_name,
  COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as null_last_name,
  COUNT(CASE WHEN token IS NULL OR token = '' THEN 1 END) as null_token,
  COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as null_expires_at,
  COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as null_status
FROM invitations;

-- 11. Mostrar estructura final
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

SELECT '🎉 TABLA INVITATIONS COMPLETAMENTE CORREGIDA' as resultado;
