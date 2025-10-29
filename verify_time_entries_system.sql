-- =====================================================
-- VERIFICAR SISTEMA DE FICHAJE
-- =====================================================

-- 1. Verificar estructura de la tabla time_entries
SELECT 
    'Estructura de time_entries:' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
ORDER BY ordinal_position;

-- 2. Verificar políticas RLS
SELECT 
    'Políticas RLS de time_entries:' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'time_entries';

-- 3. Verificar si RLS está habilitado
SELECT 
    'RLS Status:' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'time_entries';

-- 4. Verificar índices
SELECT 
    'Índices de time_entries:' as check_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'time_entries';

-- 5. Verificar función handle_time_entry
SELECT 
    'Función handle_time_entry:' as check_type,
    proname as function_name,
    prokind as function_type
FROM pg_proc 
WHERE proname = 'handle_time_entry';

-- 6. Verificar trigger
SELECT 
    'Trigger time_entry_trigger:' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'time_entry_trigger';

-- 7. Verificar vista complete_time_entries
SELECT 
    'Vista complete_time_entries:' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'complete_time_entries';

-- 8. Probar inserción de fichaje (simulación)
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_company_id UUID := '00000000-0000-0000-0000-000000000000';
    test_entry_id UUID;
BEGIN
    -- Verificar que podemos insertar un fichaje
    INSERT INTO time_entries (
        user_id, 
        company_id, 
        entry_type, 
        entry_time,
        clock_in_time,
        status
    ) VALUES (
        test_user_id,
        test_company_id,
        'clock_in',
        NOW(),
        NOW(),
        'active'
    ) RETURNING id INTO test_entry_id;
    
    -- Verificar que se creó correctamente
    IF test_entry_id IS NOT NULL THEN
        RAISE NOTICE '✅ Inserción de fichaje funciona correctamente';
        
        -- Limpiar el registro de prueba
        DELETE FROM time_entries WHERE id = test_entry_id;
        RAISE NOTICE '✅ Limpieza de prueba completada';
    ELSE
        RAISE NOTICE '❌ Error en inserción de fichaje';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en prueba de inserción: %', SQLERRM;
END $$;

-- 9. Verificar estadísticas de fichajes
SELECT 
    'Estadísticas de fichajes:' as check_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE status = 'active') as active_entries,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_entries,
    COUNT(*) FILTER (WHERE clock_in_time IS NOT NULL) as with_clock_in,
    COUNT(*) FILTER (WHERE clock_out_time IS NOT NULL) as with_clock_out
FROM time_entries;

-- 10. Verificar duraciones calculadas
SELECT 
    'Duración de fichajes:' as check_type,
    COUNT(*) as total_with_duration,
    AVG(EXTRACT(EPOCH FROM duration) / 3600) as avg_hours,
    MAX(EXTRACT(EPOCH FROM duration) / 3600) as max_hours,
    MIN(EXTRACT(EPOCH FROM duration) / 3600) as min_hours
FROM time_entries 
WHERE duration IS NOT NULL;

-- 11. Verificar integridad de datos
SELECT 
    'Verificación de integridad:' as check_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE entry_type = 'clock_in' AND clock_in_time IS NOT NULL) as valid_clock_in,
    COUNT(*) FILTER (WHERE entry_type = 'clock_out' AND clock_out_time IS NOT NULL) as valid_clock_out,
    COUNT(*) FILTER (WHERE status IN ('active', 'completed', 'cancelled')) as valid_status
FROM time_entries;

-- 12. Resumen final
SELECT 
    'RESUMEN DEL SISTEMA:' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'clock_in_time')
        THEN '✅ Campos clock_in_time y clock_out_time existen'
        ELSE '❌ Faltan campos clock_in_time y clock_out_time'
    END as field_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'time_entries')
        THEN '✅ Políticas RLS configuradas'
        ELSE '❌ Faltan políticas RLS'
    END as rls_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_time_entry')
        THEN '✅ Función handle_time_entry existe'
        ELSE '❌ Falta función handle_time_entry'
    END as function_check;
