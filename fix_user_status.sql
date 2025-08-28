-- Script para diagnosticar y arreglar el estado del usuario en bucle
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar el estado actual del usuario
SELECT 
  'Usuario actual:' as info,
  '5586b1fe-e615-42d5-b328-b26676c25e29' as user_id;

-- 2. Verificar si el usuario existe en auth.users
-- (Esto se verifica desde la aplicación)

-- 3. Verificar el perfil del usuario
SELECT 
  'Perfil del usuario:' as info,
  up.*
FROM user_profiles up
WHERE up.user_id = '5586b1fe-e615-42d5-b328-b26676c25e29';

-- 4. Verificar roles del usuario
SELECT 
  'Roles del usuario:' as info,
  ucr.*,
  c.name as company_name
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = '5586b1fe-e615-42d5-b328-b26676c25e29';

-- 5. Verificar invitaciones para este email
SELECT 
  'Invitaciones:' as info,
  i.*
FROM invitations i
WHERE i.email = 'nacho.hipermercode@gmail.com'
ORDER BY i.created_at DESC;

-- 6. Si no hay rol activo, crear uno basado en la invitación más reciente
INSERT INTO user_company_roles (
  user_id,
  company_id,
  role,
  department_id,
  supervisor_id,
  is_active,
  created_at
)
SELECT 
  '5586b1fe-e615-42d5-b328-b26676c25e29' as user_id,
  i.company_id,
  i.role,
  i.department_id,
  i.supervisor_id,
  true as is_active,
  NOW() as created_at
FROM invitations i
WHERE i.email = 'nacho.hipermercode@gmail.com'
  AND i.status IN ('sent', 'accepted')
  AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr 
    WHERE ucr.user_id = '5586b1fe-e615-42d5-b328-b26676c25e29'
      AND ucr.company_id = i.company_id
      AND ucr.is_active = true
  )
ORDER BY i.created_at DESC
LIMIT 1;

-- 7. Actualizar el estado de la invitación a 'accepted'
UPDATE invitations 
SET 
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, sent_at, created_at)
WHERE email = 'nacho.hipermercode@gmail.com'
  AND status IN ('sent', 'pending');

-- 8. Verificar el resultado final
SELECT 
  'Estado final del usuario:' as info,
  up.full_name,
  ucr.role,
  ucr.is_active,
  c.name as company_name
FROM user_profiles up
LEFT JOIN user_company_roles ucr ON up.user_id = ucr.user_id AND ucr.is_active = true
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE up.user_id = '5586b1fe-e615-42d5-b328-b26676c25e29'; 