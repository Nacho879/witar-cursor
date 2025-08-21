-- =====================================================
-- VERIFICAR ESTRUCTURA REAL DE LAS TABLAS
-- =====================================================

-- Verificar estructura de companies
SELECT 
    'companies' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- Verificar estructura de user_profiles
SELECT 
    'user_profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Verificar estructura de user_company_roles
SELECT 
    'user_company_roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_company_roles' 
ORDER BY ordinal_position;

-- Verificar estructura de departments
SELECT 
    'departments' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'departments' 
ORDER BY ordinal_position;

-- Verificar estructura de company_settings
SELECT 
    'company_settings' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings' 
ORDER BY ordinal_position;

-- Verificar estructura de invoices
SELECT 
    'invoices' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;

-- Verificar estructura de subscriptions
SELECT 
    'subscriptions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- Verificar estructura de notifications
SELECT 
    'notifications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Verificar estructura de time_entry_edit_requests
SELECT 
    'time_entry_edit_requests' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'time_entry_edit_requests' 
ORDER BY ordinal_position;

-- Verificar estructura de invitations
SELECT 
    'invitations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
ORDER BY ordinal_position;

-- Verificar estructura de requests
SELECT 
    'requests' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'requests' 
ORDER BY ordinal_position;

-- Verificar estructura de documents
SELECT 
    'documents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;

-- Verificar estructura de time_entries
SELECT 
    'time_entries' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
ORDER BY ordinal_position;

-- Verificar estructura de user_location_settings
SELECT 
    'user_location_settings' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_location_settings' 
ORDER BY ordinal_position; 