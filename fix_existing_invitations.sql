-- Script para arreglar invitaciones existentes que ya tienen usuarios creados
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Ver el estado actual de las invitaciones
SELECT 
  status,
  COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- 2. Encontrar invitaciones que tienen usuarios creados pero no están marcadas como aceptadas
SELECT 
  i.id,
  i.email,
  i.status,
  i.created_at,
  i.sent_at,
  i.accepted_at,
  i.expires_at,
  ucr.user_id,
  ucr.role,
  up.full_name
FROM invitations i
LEFT JOIN user_company_roles ucr ON i.email = (
  SELECT email FROM user_profiles WHERE user_id = ucr.user_id LIMIT 1
)
LEFT JOIN user_profiles up ON ucr.user_id = up.user_id
WHERE i.status IN ('pending', 'sent')
  AND ucr.user_id IS NOT NULL
ORDER BY i.created_at DESC;

-- 3. Actualizar invitaciones que ya tienen usuarios creados
UPDATE invitations 
SET 
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, sent_at, created_at),
  expires_at = null -- Cancelar la fecha de expiración
WHERE id IN (
  SELECT i.id
  FROM invitations i
  LEFT JOIN user_company_roles ucr ON i.email = (
    SELECT email FROM user_profiles WHERE user_id = ucr.user_id LIMIT 1
  )
  WHERE i.status IN ('pending', 'sent')
    AND ucr.user_id IS NOT NULL
);

-- 4. Verificar el resultado
SELECT 
  status,
  COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- 5. Mostrar algunas invitaciones actualizadas
SELECT 
  id,
  email,
  status,
  created_at,
  sent_at,
  accepted_at,
  expires_at,
  first_name,
  last_name
FROM invitations 
ORDER BY created_at DESC 
LIMIT 10; 