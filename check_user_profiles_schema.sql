-- Script para verificar la estructura de la tabla user_profiles
-- Ejecuta esto en el SQL Editor de Supabase

-- Mostrar la estructura de la tabla user_profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Mostrar algunos registros de ejemplo
SELECT * FROM user_profiles LIMIT 5; 