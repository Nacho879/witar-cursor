-- =====================================================
-- HABILITAR RLS CON POLÍTICAS SIMPLES Y SEGURAS
-- =====================================================

-- 1. Habilitar RLS en todas las tablas críticas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_settings ENABLE ROW LEVEL SECURITY;

-- 2. Crear políticas básicas de seguridad
-- Política para companies: solo usuarios autenticados pueden ver empresas donde tienen rol
CREATE POLICY "companies_policy" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE company_id = companies.id 
            AND user_id = auth.uid()
        )
    );

-- Política para user_profiles: usuarios pueden ver su propio perfil y perfiles de su empresa
CREATE POLICY "user_profiles_policy" ON user_profiles
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = user_profiles.user_id
        )
    );

-- Política para user_company_roles: usuarios pueden ver roles de su empresa
CREATE POLICY "user_company_roles_policy" ON user_company_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr
            WHERE ucr.company_id = user_company_roles.company_id
            AND ucr.user_id = auth.uid()
        )
    );

-- Política para departments: usuarios pueden ver departamentos de su empresa
CREATE POLICY "departments_policy" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = departments.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para company_settings: usuarios pueden ver configuraciones de su empresa
CREATE POLICY "company_settings_policy" ON company_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = company_settings.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para invoices: solo owners pueden ver facturas de su empresa
CREATE POLICY "invoices_policy" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = invoices.company_id
            AND user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- Política para subscriptions: solo owners pueden ver suscripciones de su empresa
CREATE POLICY "subscriptions_policy" ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = subscriptions.company_id
            AND user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- Política para notifications: usuarios solo pueden ver sus notificaciones
CREATE POLICY "notifications_policy" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- Política para time_entry_edit_requests: usuarios pueden ver solicitudes de su empresa
CREATE POLICY "time_entry_edit_requests_policy" ON time_entry_edit_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entry_edit_requests.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para invitations: usuarios pueden ver invitaciones de su empresa
CREATE POLICY "invitations_policy" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = invitations.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para requests: usuarios pueden ver solicitudes de su empresa
CREATE POLICY "requests_policy" ON requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = requests.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para documents: usuarios pueden ver documentos de su empresa
CREATE POLICY "documents_policy" ON documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = documents.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para time_entries: usuarios pueden ver fichajes de su empresa
CREATE POLICY "time_entries_policy" ON time_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entries.company_id
            AND user_id = auth.uid()
        )
    );

-- Política para user_location_settings: usuarios solo pueden ver sus propias configuraciones
CREATE POLICY "user_location_settings_policy" ON user_location_settings
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================

-- Verificar el estado de RLS en todas las tablas
SELECT 
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