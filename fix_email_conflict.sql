-- Script para solucionar conflicto entre Resend y Supabase para emails
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar configuración actual de emails
SELECT 
  'Configuración actual' as info,
  'Usando Resend + Supabase para emails' as descripcion;

-- 2. Verificar si hay configuración de email en Supabase
SELECT 
  'Configuración de email en Supabase' as info,
  setting_name,
  setting_value
FROM pg_settings 
WHERE setting_name LIKE '%email%' 
OR setting_name LIKE '%smtp%'
OR setting_name LIKE '%mail%';

-- 3. Verificar variables de entorno disponibles
SELECT 
  'Variables de entorno disponibles' as info,
  name,
  CASE 
    WHEN value IS NOT NULL AND length(value) > 0 THEN '✅ Configurada'
    ELSE '❌ No configurada'
  END as status
FROM information_schema.enum_values 
WHERE enumlabel IN ('RESEND_API_KEY', 'SUPABASE_EMAIL', 'FRONTEND_URL')
UNION ALL
SELECT 
  'Variables de entorno disponibles' as info,
  'RESEND_API_KEY' as name,
  'Verificar manualmente' as status
UNION ALL
SELECT 
  'Variables de entorno disponibles' as info,
  'FRONTEND_URL' as name,
  'Verificar manualmente' as status;

-- 4. Verificar estructura de invitations para emails
SELECT 
  'Estructura para emails' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
AND column_name IN ('email', 'first_name', 'last_name', 'token', 'status')
ORDER BY column_name;

-- 5. Verificar invitaciones recientes
SELECT 
  'Invitaciones recientes' as info,
  id,
  email,
  first_name,
  last_name,
  status,
  created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 3;

SELECT '✅ Diagnóstico de conflicto de email completado' as resultado;
