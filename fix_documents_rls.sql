-- Política para permitir que managers creen documentos para sus empleados
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