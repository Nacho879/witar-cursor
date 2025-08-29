-- Script final para arreglar el usuario fedrajerez@gmail.com
-- Ahora que las políticas RLS están corregidas

-- 1. Verificar el estado actual
SELECT 
  'Estado actual del usuario:' as info,
  '1fc355bf-010a-4e04-b868-a999121f6407' as user_id,
  'fedrajerez@gmail.com' as email;

-- 2. Verificar invitaciones para este email
SELECT 
  'Invitaciones encontradas:' as info,
  i.*
FROM invitations i
WHERE i.email = 'fedrajerez@gmail.com'
ORDER BY i.created_at DESC;

-- 3. Verificar si ya existe un rol
SELECT 
  'Roles existentes:' as info,
  ucr.*,
  c.name as company_name
FROM user_company_roles ucr
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = '1fc355bf-010a-4e04-b868-a999121f6407';

-- 4. Crear rol activo basado en la invitación más reciente
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
  '1fc355bf-010a-4e04-b868-a999121f6407' as user_id,
  i.company_id,
  i.role,
  i.department_id,
  i.supervisor_id,
  true as is_active,
  NOW() as created_at
FROM invitations i
WHERE i.email = 'fedrajerez@gmail.com'
  AND i.status IN ('sent', 'accepted')
  AND NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr 
    WHERE ucr.user_id = '1fc355bf-010a-4e04-b868-a999121f6407'
      AND ucr.company_id = i.company_id
      AND ucr.is_active = true
  )
ORDER BY i.created_at DESC
LIMIT 1;

-- 5. Actualizar estado de invitación a 'accepted'
UPDATE invitations 
SET 
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, sent_at, created_at)
WHERE email = 'fedrajerez@gmail.com'
  AND status IN ('sent', 'pending');

-- 6. Verificar resultado final
SELECT 
  'Estado final del usuario:' as info,
  up.full_name,
  ucr.role,
  ucr.is_active,
  c.name as company_name
FROM user_profiles up
LEFT JOIN user_company_roles ucr ON up.user_id = ucr.user_id AND ucr.is_active = true
LEFT JOIN companies c ON ucr.company_id = c.id
WHERE up.user_id = '1fc355bf-010a-4e04-b868-a999121f6407'; 