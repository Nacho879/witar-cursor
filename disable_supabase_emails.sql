-- =====================================================
-- DESACTIVAR EMAILS AUTOMÁTICOS DE SUPABASE
-- Ejecuta esto en el SQL Editor de Supabase
-- =====================================================

-- 1. Verificar configuración actual de emails
SELECT 
    name,
    value,
    description
FROM auth.config 
WHERE name LIKE '%email%';

-- 2. Desactivar confirmación de email automática
UPDATE auth.config 
SET value = 'false' 
WHERE name = 'enable_signup';

-- 3. Desactivar emails de confirmación
UPDATE auth.config 
SET value = 'false' 
WHERE name = 'enable_confirmations';

-- 4. Verificar cambios
SELECT 
    name,
    value,
    description
FROM auth.config 
WHERE name LIKE '%email%' OR name LIKE '%confirm%' OR name LIKE '%signup%';

-- 5. Mensaje de confirmación
SELECT 'Emails automáticos de Supabase desactivados' as status; 