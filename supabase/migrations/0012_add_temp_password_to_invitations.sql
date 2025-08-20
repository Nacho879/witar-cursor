-- =====================================================
-- AÑADIR CONTRASEÑA TEMPORAL A INVITACIONES
-- =====================================================

-- Añadir columna para contraseña temporal
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);

-- Comentario para documentar la columna
COMMENT ON COLUMN invitations.temp_password IS 'Contraseña temporal generada para el usuario invitado'; 