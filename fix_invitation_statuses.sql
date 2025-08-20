-- Script para arreglar los estados de las invitaciones
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar el estado actual de las invitaciones
SELECT status, COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- 2. Cambiar todas las invitaciones con estado 'sent' a 'pending'
UPDATE invitations 
SET status = 'pending'
WHERE status = 'sent';

-- 3. Verificar el resultado
SELECT status, COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- 4. Mostrar algunas invitaciones de ejemplo
SELECT id, email, status, created_at, expires_at, sent_at
FROM invitations 
ORDER BY created_at DESC 
LIMIT 10; 