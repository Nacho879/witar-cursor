-- =====================================================
-- DEBUG: VERIFICAR DATOS DE UBICACIÓN GPS
-- =====================================================

-- Verificar estructura de la tabla time_entries
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
AND column_name LIKE '%location%'
ORDER BY ordinal_position;

-- Verificar datos de ubicación en time_entries
SELECT 
    id,
    user_id,
    entry_type,
    entry_time,
    location_lat,
    location_lng,
    created_at
FROM time_entries 
WHERE location_lat IS NOT NULL 
   OR location_lng IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Contar registros con y sin ubicación
SELECT 
    CASE 
        WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL THEN 'Con ubicación'
        ELSE 'Sin ubicación'
    END as ubicacion_status,
    COUNT(*) as total_registros
FROM time_entries 
GROUP BY ubicacion_status;

-- Verificar los últimos 20 registros para ver si tienen ubicación
SELECT 
    id,
    entry_type,
    entry_time,
    location_lat,
    location_lng,
    CASE 
        WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL THEN '✅ Con GPS'
        ELSE '❌ Sin GPS'
    END as gps_status
FROM time_entries 
ORDER BY created_at DESC 
LIMIT 20;
