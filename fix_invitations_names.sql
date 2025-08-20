-- Script simple para añadir campos de nombre a invitations
-- Ejecuta esto en el SQL Editor de Supabase

-- Añadir columnas si no existen
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Verificar que se añadieron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND column_name IN ('first_name', 'last_name'); 