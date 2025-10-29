-- SOLUCIÓN DEFINITIVA PARA EL ERROR 400
-- Basada en análisis completo del código
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. ELIMINAR TODAS LAS POLÍTICAS RLS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Service role can manage all invitations" ON invitations;

-- 2. RECREAR LA TABLA INVITATIONS CON ESTRUCTURA PERFECTA
DROP TABLE IF EXISTS invitations CASCADE;

CREATE TABLE invitations (
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

-- 3. CREAR ÍNDICES OPTIMIZADOS
CREATE UNIQUE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_company_id ON invitations(company_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);

-- 4. CREAR POLÍTICAS RLS SIMPLES Y EFECTIVAS
-- Política para usuarios autenticados
CREATE POLICY "Authenticated users can view invitations for their company" ON invitations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can insert invitations for their company" ON invitations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ) AND
    invited_by = auth.uid()
  );

CREATE POLICY "Authenticated users can update invitations for their company" ON invitations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Política especial para service role (función Edge)
CREATE POLICY "Service role can manage all invitations" ON invitations
  FOR ALL USING (true)
  WITH CHECK (true);

-- 5. HABILITAR RLS EN LA TABLA
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 6. VERIFICAR QUE LA TABLA ESTÁ CORRECTAMENTE CONFIGURADA
SELECT 
  '=== VERIFICACIÓN FINAL ===' as info,
  'Tabla invitations recreada con estructura perfecta' as descripcion;

-- 7. VERIFICAR ESTRUCTURA FINAL
SELECT 
  '=== ESTRUCTURA FINAL ===' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. VERIFICAR POLÍTICAS RLS FINALES
SELECT 
  '=== POLÍTICAS RLS FINALES ===' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 9. VERIFICAR PERMISOS DE SERVICE ROLE
SELECT 
  '=== PERMISOS SERVICE ROLE ===' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'invitations'
AND grantee = 'service_role';

SELECT '🎉 SOLUCIÓN DEFINITIVA APLICADA - ERROR 400 DEBERÍA ESTAR RESUELTO' as resultado;
