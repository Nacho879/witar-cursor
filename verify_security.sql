-- =====================================================
-- VERIFICACIÓN COMPLETA DE SEGURIDAD
-- =====================================================

-- 1. Verificar que RLS está habilitado en todas las tablas
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
ORDER BY tablename;

-- 2. Verificar políticas existentes
SELECT 
    'Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ WITH CONDITIONS'
        ELSE '⚠️ NO CONDITIONS'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
ORDER BY tablename, policyname;

-- 3. Verificar tablas sin políticas (CRÍTICO)
SELECT 
    'Missing Policies' as check_type,
    t.tablename,
    '❌ NO POLICIES FOUND' as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
    AND t.tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
    AND p.policyname IS NULL
ORDER BY t.tablename;

-- 4. Verificar permisos de usuarios
SELECT 
    'User Permissions' as check_type,
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
    AND table_name IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
ORDER BY table_name, grantee;

-- 5. Resumen de seguridad
SELECT 
    'Security Summary' as check_type,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as tables_without_rls,
    CASE 
        WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) = 0 THEN '✅ ALL TABLES SECURED'
        ELSE '❌ UNSECURED TABLES FOUND'
    END as overall_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    ); 