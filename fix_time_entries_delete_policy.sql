-- Política para permitir que managers, admins y owners eliminen fichajes
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