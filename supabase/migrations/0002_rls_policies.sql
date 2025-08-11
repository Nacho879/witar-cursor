-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - SEGURIDAD
-- =====================================================

-- =====================================================
-- POLÍTICAS PARA COMPANIES
-- =====================================================

-- Los usuarios solo pueden ver empresas donde tienen un rol activo
CREATE POLICY "Users can view companies they belong to" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = companies.id 
            AND is_active = true
        )
    );

-- Solo los owners pueden crear empresas (esto se maneja en la aplicación)
CREATE POLICY "Only owners can create companies" ON companies
    FOR INSERT WITH CHECK (true);

-- Solo los owners pueden actualizar su empresa
CREATE POLICY "Only owners can update companies" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = companies.id 
            AND role = 'owner' 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA DEPARTMENTS
-- =====================================================

-- Los usuarios pueden ver departamentos de su empresa
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = departments.company_id 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden crear departamentos
CREATE POLICY "Only admins can create departments" ON departments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = departments.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden actualizar departamentos
CREATE POLICY "Only admins can update departments" ON departments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = departments.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA USER_COMPANY_ROLES
-- =====================================================

-- Los usuarios pueden ver roles en su empresa
CREATE POLICY "Users can view roles in their company" ON user_company_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr2
            WHERE ucr2.user_id = auth.uid() 
            AND ucr2.company_id = user_company_roles.company_id 
            AND ucr2.is_active = true
        )
    );

-- Solo admins y owners pueden crear roles
CREATE POLICY "Only admins can create roles" ON user_company_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = user_company_roles.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden actualizar roles
CREATE POLICY "Only admins can update roles" ON user_company_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = user_company_roles.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA INVITATIONS
-- =====================================================

-- Los usuarios pueden ver invitaciones de su empresa
CREATE POLICY "Users can view invitations in their company" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = invitations.company_id 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden crear invitaciones
CREATE POLICY "Only admins can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = invitations.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo admins y owners pueden actualizar invitaciones
CREATE POLICY "Only admins can update invitations" ON invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = invitations.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA USER_PROFILES
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Los usuarios pueden crear su propio perfil
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Los managers y admins pueden ver perfiles de empleados en su empresa
CREATE POLICY "Managers can view employee profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = user_profiles.user_id
            AND ucr1.role IN ('owner', 'admin', 'manager')
            AND ucr1.is_active = true
            AND ucr2.is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA TIME_ENTRIES
-- =====================================================

-- Los usuarios pueden ver sus propios registros de tiempo
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT USING (user_id = auth.uid());

-- Los usuarios pueden crear sus propios registros de tiempo
CREATE POLICY "Users can create their own time entries" ON time_entries
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Los managers y admins pueden ver registros de tiempo de empleados en su empresa
CREATE POLICY "Managers can view employee time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = time_entries.user_id
            AND ucr1.role IN ('owner', 'admin', 'manager')
            AND ucr1.is_active = true
            AND ucr2.is_active = true
        )
    );

-- Solo admins pueden actualizar registros de tiempo
CREATE POLICY "Only admins can update time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA REQUESTS
-- =====================================================

-- Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view their own requests" ON requests
    FOR SELECT USING (user_id = auth.uid());

-- Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own requests" ON requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Los managers y admins pueden ver solicitudes de empleados en su empresa
CREATE POLICY "Managers can view employee requests" ON requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = requests.user_id
            AND ucr1.role IN ('owner', 'admin', 'manager')
            AND ucr1.is_active = true
            AND ucr2.is_active = true
        )
    );

-- Solo admins y managers pueden aprobar/rechazar solicitudes
CREATE POLICY "Only admins can update requests" ON requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = requests.company_id 
            AND role IN ('owner', 'admin', 'manager') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA DOCUMENTS
-- =====================================================

-- Los usuarios pueden ver sus propios documentos
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (user_id = auth.uid());

-- Los usuarios pueden crear sus propios documentos
CREATE POLICY "Users can create their own documents" ON documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Los managers y admins pueden ver documentos públicos de empleados
CREATE POLICY "Managers can view public employee documents" ON documents
    FOR SELECT USING (
        (is_public = true AND EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = documents.user_id
            AND ucr1.role IN ('owner', 'admin', 'manager')
            AND ucr1.is_active = true
            AND ucr2.is_active = true
        )) OR user_id = auth.uid()
    );

-- Solo admins pueden actualizar documentos
CREATE POLICY "Only admins can update documents" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = documents.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- =====================================================
-- POLÍTICAS PARA COMPANY_SETTINGS
-- =====================================================

-- Solo admins y owners pueden ver configuraciones de su empresa
CREATE POLICY "Only admins can view company settings" ON company_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = company_settings.company_id 
            AND role IN ('owner', 'admin') 
            AND is_active = true
        )
    );

-- Solo owners pueden crear configuraciones
CREATE POLICY "Only owners can create company settings" ON company_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = company_settings.company_id 
            AND role = 'owner' 
            AND is_active = true
        )
    );

-- Solo owners pueden actualizar configuraciones
CREATE POLICY "Only owners can update company settings" ON company_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = company_settings.company_id 
            AND role = 'owner' 
            AND is_active = true
        )
    ); 