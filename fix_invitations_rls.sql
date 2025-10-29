-- Script para corregir políticas RLS de la tabla invitations
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar políticas RLS actuales
SELECT 
  'Políticas RLS actuales' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- 2. Eliminar políticas problemáticas si existen
DROP POLICY IF EXISTS "Users can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their company" ON invitations;

-- 3. Crear políticas RLS correctas para invitations
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

-- 4. Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas RLS finales' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

SELECT '✅ Políticas RLS corregidas para invitations' as resultado;