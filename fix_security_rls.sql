-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- =====================================================

-- 1. Habilitar RLS en companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política para companies: solo el owner puede ver su empresa
CREATE POLICY "Users can view own company" ON companies
    FOR ALL USING (
        id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 2. Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para user_profiles: usuarios pueden ver su propio perfil y perfiles de su empresa
CREATE POLICY "Users can view own profile and company profiles" ON user_profiles
    FOR ALL USING (
        user_id = auth.uid() OR
        user_id IN (
            SELECT user_id 
            FROM user_company_roles 
            WHERE company_id IN (
                SELECT company_id 
                FROM user_company_roles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 3. Habilitar RLS en user_company_roles
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;

-- Política para user_company_roles: usuarios pueden ver roles de su empresa
CREATE POLICY "Users can view company roles" ON user_company_roles
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 4. Habilitar RLS en departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Política para departments: usuarios pueden ver departamentos de su empresa
CREATE POLICY "Users can view company departments" ON departments
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 5. Habilitar RLS en company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Política para company_settings: solo usuarios de la empresa pueden ver configuraciones
CREATE POLICY "Users can view company settings" ON company_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 6. Habilitar RLS en invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Política para invoices: solo el owner puede ver facturas de su empresa
CREATE POLICY "Owners can view company invoices" ON invoices
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- 7. Habilitar RLS en subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para subscriptions: solo el owner puede ver suscripciones de su empresa
CREATE POLICY "Owners can view company subscriptions" ON subscriptions
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- 8. Habilitar RLS en notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política para notifications: usuarios solo pueden ver sus notificaciones
CREATE POLICY "Users can view own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- 9. Habilitar RLS en time_entry_edit_requests
ALTER TABLE time_entry_edit_requests ENABLE ROW LEVEL SECURITY;

-- Política para time_entry_edit_requests: usuarios pueden ver solicitudes de su empresa
CREATE POLICY "Users can view company edit requests" ON time_entry_edit_requests
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 10. Verificar que invitations ya tiene RLS (debería estar habilitado)
-- Si no está habilitado, habilitarlo
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Política para invitations: usuarios pueden ver invitaciones de su empresa
CREATE POLICY "Users can view company invitations" ON invitations
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 11. Verificar que requests ya tiene RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Política para requests: usuarios pueden ver solicitudes de su empresa
CREATE POLICY "Users can view company requests" ON requests
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 12. Verificar que documents ya tiene RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Política para documents: usuarios pueden ver documentos de su empresa
CREATE POLICY "Users can view company documents" ON documents
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 13. Verificar que time_entries ya tiene RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Política para time_entries: usuarios pueden ver fichajes de su empresa
CREATE POLICY "Users can view company time entries" ON time_entries
    FOR ALL USING (
        company_id IN (
            SELECT company_id 
            FROM user_company_roles 
            WHERE user_id = auth.uid()
        )
    );

-- 14. Verificar que user_location_settings ya tiene RLS
ALTER TABLE user_location_settings ENABLE ROW LEVEL SECURITY;

-- Política para user_location_settings: usuarios solo pueden ver sus propias configuraciones
CREATE POLICY "Users can view own location settings" ON user_location_settings
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================

-- Verificar el estado de RLS en todas las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
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