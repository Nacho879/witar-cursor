-- Verificar estructura de la tabla invitations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
