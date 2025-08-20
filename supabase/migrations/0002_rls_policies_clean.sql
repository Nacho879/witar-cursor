-- Políticas para companies
CREATE POLICY "Users can view companies they belong to" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = companies.id 
            AND is_active = true
        )
    );

CREATE POLICY "Only owners can create companies" ON companies
    FOR INSERT WITH CHECK (true);

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

-- Políticas para departments
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = departments.company_id 
            AND is_active = true
        )
    );

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

-- Políticas para user_company_roles
CREATE POLICY "Users can view roles in their company" ON user_company_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr2
            WHERE ucr2.user_id = auth.uid() 
            AND ucr2.company_id = user_company_roles.company_id 
            AND ucr2.is_active = true
        )
    );

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

-- Políticas para invitations
CREATE POLICY "Users can view invitations in their company" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = invitations.company_id 
            AND is_active = true
        )
    );

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

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

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

-- Políticas para time_entries
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time entries" ON time_entries
    FOR INSERT WITH CHECK (user_id = auth.uid());

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

CREATE POLICY "Managers, admins and owners can delete time entries" ON time_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = auth.uid() 
            AND company_id = time_entries.company_id 
            AND role IN ('owner', 'admin', 'manager') 
            AND is_active = true
        )
    );

-- Políticas para requests
CREATE POLICY "Users can view their own requests" ON requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests" ON requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

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

-- Políticas para documents
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own documents" ON documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers can create documents for their employees" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles ucr1
            JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
            WHERE ucr1.user_id = auth.uid() 
            AND ucr2.user_id = documents.user_id
            AND ucr1.role IN ('owner', 'admin', 'manager')
            AND ucr1.is_active = true
            AND ucr2.is_active = true
            AND ucr1.company_id = documents.company_id
        )
    );

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

-- Políticas para company_settings
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