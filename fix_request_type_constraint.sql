-- =====================================================
-- ARREGLAR RESTRICCIÓN DE REQUEST_TYPE EN TABLA REQUESTS
-- =====================================================
-- Ejecutar este SQL en el SQL Editor de Supabase Dashboard

-- Eliminar la restricción existente
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_request_type_check;

-- Agregar la nueva restricción que incluye 'permission'
ALTER TABLE requests ADD CONSTRAINT requests_request_type_check 
CHECK (request_type IN ('vacation', 'sick_leave', 'personal_leave', 'permission', 'other'));

-- Verificar que la restricción se aplicó correctamente
SELECT 
    'requests_request_type_check' as constraint_name,
    'CHECK (request_type IN (''vacation'', ''sick_leave'', ''personal_leave'', ''permission'', ''other''))' as constraint_definition; 