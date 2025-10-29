-- Script para desactivar emails automáticos de Supabase
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Desactivar confirmación de email en la configuración de auth
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_confirmations = false,
  enable_recoveries = false,
  enable_email_change = false
WHERE id = 1;

-- 2. Si no existe la configuración, crearla
INSERT INTO auth.config (
  id,
  enable_signup,
  enable_confirmations,
  enable_recoveries,
  enable_email_change,
  created_at,
  updated_at
) VALUES (
  1,
  true,
  false,
  false,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  enable_confirmations = false,
  enable_recoveries = false,
  enable_email_change = false,
  updated_at = NOW();

-- 3. Verificar la configuración actual
SELECT 
  'Configuración de Auth' as seccion,
  enable_signup,
  enable_confirmations,
  enable_recoveries,
  enable_email_change
FROM auth.config 
WHERE id = 1;

-- 4. Desactivar templates de email si existen
UPDATE auth.email_templates 
SET 
  enabled = false,
  updated_at = NOW()
WHERE template_type IN (
  'confirmation',
  'recovery', 
  'email_change',
  'magic_link',
  'invite'
);

-- 5. Verificar templates desactivados
SELECT 
  'Templates de Email' as seccion,
  template_type,
  enabled,
  updated_at
FROM auth.email_templates;

-- 6. Verificar configuración final
SELECT 
  'RESULTADO FINAL' as status,
  CASE 
    WHEN (SELECT enable_confirmations FROM auth.config WHERE id = 1) = false 
    THEN '✅ Emails automáticos DESACTIVADOS'
    ELSE '❌ Emails automáticos AÚN ACTIVOS'
  END as estado;

SELECT '✅ Script ejecutado - Emails de Supabase desactivados' as resultado;
