-- Añadir campos de nombre y apellido a la tabla invitations
-- Esto permitirá identificar mejor a los usuarios invitados

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Añadir comentarios para documentar el propósito de las columnas
COMMENT ON COLUMN invitations.first_name IS 'Nombre del usuario invitado';
COMMENT ON COLUMN invitations.last_name IS 'Apellido del usuario invitado';

-- Crear índice para mejorar el rendimiento de búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_invitations_name_search ON invitations(first_name, last_name); 