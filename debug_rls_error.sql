-- =====================================================
-- DIAGNOSTICAR ERROR DE COLUMNA "user_id" NO EXISTE
-- =====================================================

-- Verificar qué tablas tienen columna user_id
SELECT 
    'Tables with user_id column' as check_type,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name = 'user_id' 
    AND table_schema = 'public'
ORDER BY table_name;

-- Verificar qué tablas NO tienen columna user_id
SELECT 
    'Tables WITHOUT user_id column' as check_type,
    table_name,
    string_agg(column_name, ', ') as available_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
    AND table_name NOT IN (
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
        AND table_schema = 'public'
    )
GROUP BY table_name
ORDER BY table_name;

-- Verificar columnas relacionadas con usuarios en cada tabla
SELECT 
    'User-related columns' as check_type,
    table_name,
    string_agg(column_name, ', ') as user_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
    AND (
        column_name LIKE '%user%' 
        OR column_name LIKE '%owner%' 
        OR column_name LIKE '%created_by%'
        OR column_name LIKE '%invited_by%'
        OR column_name LIKE '%approved_by%'
        OR column_name LIKE '%supervisor%'
    )
GROUP BY table_name
ORDER BY table_name;

-- Verificar estructura específica de tablas problemáticas
SELECT 
    'Detailed structure' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN ('companies', 'user_profiles', 'user_company_roles')
ORDER BY table_name, ordinal_position; 