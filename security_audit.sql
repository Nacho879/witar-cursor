-- =====================================================
-- AUDITORÍA COMPLETA DE SEGURIDAD - WITAR
-- =====================================================

-- =====================================================
-- 1. VERIFICACIÓN DE RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Estado actual de RLS en todas las tablas críticas
SELECT 
    '🔒 RLS STATUS' as audit_section,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED - CRÍTICO'
    END as rls_status,
    CASE 
        WHEN rowsecurity THEN 'Seguro'
        ELSE 'VULNERABLE - Datos expuestos'
    END as security_level
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    )
ORDER BY 
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;

-- =====================================================
-- 2. VERIFICACIÓN DE POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Políticas existentes y su configuración
SELECT 
    '🛡️ SECURITY POLICIES' as audit_section,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL AND qual != '' THEN '✅ WITH CONDITIONS'
        ELSE '⚠️ NO CONDITIONS - REVISAR'
    END as policy_quality,
    qual as policy_condition
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

-- =====================================================
-- 3. TABLAS SIN POLÍTICAS (VULNERABILIDADES CRÍTICAS)
-- =====================================================

-- Identificar tablas sin políticas de seguridad
SELECT 
    '🚨 CRITICAL VULNERABILITIES' as audit_section,
    t.tablename,
    '❌ NO SECURITY POLICIES' as vulnerability_type,
    'CRÍTICO - Datos completamente expuestos' as risk_level,
    'Crear políticas RLS inmediatamente' as action_required
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

-- =====================================================
-- 4. VERIFICACIÓN DE PERMISOS DE USUARIOS
-- =====================================================

-- Permisos actuales en las tablas
SELECT 
    '👥 USER PERMISSIONS' as audit_section,
    grantee,
    table_name,
    privilege_type,
    is_grantable,
    CASE 
        WHEN grantee = 'anon' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '❌ ANON ACCESS - CRÍTICO'
        WHEN grantee = 'authenticated' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '⚠️ AUTHENTICATED ACCESS'
        ELSE '✅ RESTRICTED ACCESS'
    END as access_level
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

-- =====================================================
-- 5. VERIFICACIÓN DE DATOS SENSIBLES
-- =====================================================

-- Verificar si hay datos sensibles expuestos
SELECT 
    '💳 SENSITIVE DATA CHECK' as audit_section,
    'companies' as table_name,
    COUNT(*) as total_companies,
    'Verificar acceso a datos de empresas' as check_note
FROM companies;

SELECT 
    '👤 USER PROFILES' as audit_section,
    'user_profiles' as table_name,
    COUNT(*) as total_profiles,
    'Verificar acceso a perfiles de usuarios' as check_note
FROM user_profiles;

SELECT 
    '💸 BILLING DATA' as audit_section,
    'invoices' as table_name,
    COUNT(*) as total_invoices,
    'Verificar acceso a datos de facturación' as check_note
FROM invoices;

-- =====================================================
-- 6. RESUMEN DE SEGURIDAD
-- =====================================================

-- Resumen general del estado de seguridad
SELECT 
    '📊 SECURITY SUMMARY' as audit_section,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as secured_tables,
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as unsecured_tables,
    ROUND(
        (COUNT(CASE WHEN rowsecurity THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 
        2
    ) as security_percentage,
    CASE 
        WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) = 0 THEN '✅ EXCELLENT'
        WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) <= 3 THEN '⚠️ GOOD'
        WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) <= 7 THEN '❌ POOR'
        ELSE '🚨 CRITICAL'
    END as overall_security_grade
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'companies', 'user_profiles', 'user_company_roles', 
        'departments', 'company_settings', 'invoices', 
        'subscriptions', 'notifications', 'time_entry_edit_requests',
        'invitations', 'requests', 'documents', 'time_entries',
        'user_location_settings'
    );

-- =====================================================
-- 7. RECOMENDACIONES DE SEGURIDAD
-- =====================================================

-- Generar recomendaciones basadas en el estado actual
SELECT 
    '🎯 SECURITY RECOMMENDATIONS' as audit_section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND rowsecurity = false
            AND tablename IN ('companies', 'user_profiles', 'invoices', 'subscriptions')
        ) THEN '🚨 CRÍTICO: Habilitar RLS en tablas sensibles inmediatamente'
        ELSE '✅ RLS habilitado en tablas críticas'
    END as recommendation_1,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables t
            LEFT JOIN pg_policies p ON t.tablename = p.tablename
            WHERE t.schemaname = 'public' 
            AND p.policyname IS NULL
            AND t.tablename IN ('companies', 'user_profiles', 'invoices', 'subscriptions')
        ) THEN '🚨 CRÍTICO: Crear políticas de seguridad para tablas sin protección'
        ELSE '✅ Políticas de seguridad configuradas'
    END as recommendation_2,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE grantee = 'anon' 
            AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
            AND table_name IN ('companies', 'user_profiles', 'invoices', 'subscriptions')
        ) THEN '🚨 CRÍTICO: Revocar permisos anónimos en tablas sensibles'
        ELSE '✅ Permisos anónimos restringidos'
    END as recommendation_3; 