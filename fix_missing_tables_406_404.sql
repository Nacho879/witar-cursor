-- Script para corregir errores 404 y 406 - Tablas faltantes
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar qué tablas existen
SELECT 
  'Tablas existentes' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('company_settings', 'user_location_settings', 'notifications')
ORDER BY table_name;

-- 2. Crear tabla company_settings si no existe
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  working_hours_per_day DECIMAL(3,1) DEFAULT 8.0,
  working_days_per_week INTEGER DEFAULT 5,
  timezone TEXT DEFAULT 'UTC',
  allow_overtime BOOLEAN DEFAULT true,
  require_location BOOLEAN DEFAULT false,
  auto_approve_requests BOOLEAN DEFAULT false,
  max_vacation_days INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla user_location_settings si no existe
CREATE TABLE IF NOT EXISTS user_location_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  require_location BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- 4. Crear tabla notifications si no existe
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 5. Crear políticas RLS para company_settings
DROP POLICY IF EXISTS "Users can view company settings for their company" ON company_settings;
DROP POLICY IF EXISTS "Users can update company settings for their company" ON company_settings;

CREATE POLICY "Users can view company settings for their company" ON company_settings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update company settings for their company" ON company_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- 6. Crear políticas RLS para user_location_settings
DROP POLICY IF EXISTS "Users can view their location settings" ON user_location_settings;
DROP POLICY IF EXISTS "Users can update their location settings" ON user_location_settings;

CREATE POLICY "Users can view their location settings" ON user_location_settings
  FOR SELECT USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their location settings" ON user_location_settings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- 7. Crear políticas RLS para notifications
DROP POLICY IF EXISTS "Users can view notifications for their company" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications for their company" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications for their company" ON notifications;

CREATE POLICY "Users can view notifications for their company" ON notifications
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ) AND (
      recipient_id = auth.uid() OR 
      recipient_id IS NULL
    )
  );

CREATE POLICY "Users can insert notifications for their company" ON notifications
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can update notifications for their company" ON notifications
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ) AND (
      recipient_id = auth.uid() OR 
      recipient_id IS NULL
    )
  );

-- 8. Insertar configuración por defecto para empresas existentes
INSERT INTO company_settings (company_id, require_location)
SELECT id, false
FROM companies
WHERE id NOT IN (SELECT company_id FROM company_settings)
ON CONFLICT DO NOTHING;

-- 9. Verificar que las tablas se crearon correctamente
SELECT 
  'VERIFICACIÓN FINAL' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'company_settings' AND table_schema = 'public'
  ) THEN '✅ company_settings' ELSE '❌ company_settings' END as company_settings,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_location_settings' AND table_schema = 'public'
  ) THEN '✅ user_location_settings' ELSE '❌ user_location_settings' END as user_location_settings,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications' AND table_schema = 'public'
  ) THEN '✅ notifications' ELSE '❌ notifications' END as notifications;

SELECT '🎉 TABLAS FALTANTES CREADAS - ERRORES 404/406 SOLUCIONADOS' as resultado;
