-- =====================================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA SOLICITUDES
-- =====================================================
-- Este script actualiza las políticas RLS para que:
-- - Los administradores (admin, owner) puedan ver y gestionar TODAS las solicitudes de la empresa
-- - Los managers solo puedan ver y gestionar solicitudes de SUS empleados (mismo departamento o supervisor_id)
-- - Los empleados solo puedan ver y gestionar sus propias solicitudes

-- =====================================================
-- 1. POLÍTICAS PARA time_entry_edit_requests
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view company edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can create their own edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Managers can update edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can update their own pending requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can cancel their own pending requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "time_entry_edit_requests_policy" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Admins can view all edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Managers can view team edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Users can view own edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Admins can update all edit requests" ON time_entry_edit_requests;
DROP POLICY IF EXISTS "Managers can update team edit requests" ON time_entry_edit_requests;

-- Política 1: Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view own edit requests" ON time_entry_edit_requests
    FOR SELECT USING (user_id = auth.uid());

-- Política 2: Los administradores (admin, owner) pueden ver TODAS las solicitudes de su empresa
CREATE POLICY "Admins can view all edit requests" ON time_entry_edit_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE user_id = auth.uid()
            AND company_id = time_entry_edit_requests.company_id
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- Política 3: Los managers pueden ver solicitudes de sus empleados
-- (empleados del mismo departamento o con supervisor_id = manager)
CREATE POLICY "Managers can view team edit requests" ON time_entry_edit_requests
    FOR SELECT USING (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = time_entry_edit_requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    );

-- Política 4: Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own edit requests" ON time_entry_edit_requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = time_entry_edit_requests.company_id
            AND user_id = auth.uid()
            AND is_active = true
        )
    );

-- Política 5: Los usuarios pueden actualizar sus propias solicitudes pendientes
CREATE POLICY "Users can update their own pending requests" ON time_entry_edit_requests
    FOR UPDATE 
    USING (
        user_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Política 6: Los administradores (admin, owner) pueden actualizar TODAS las solicitudes de su empresa
CREATE POLICY "Admins can update all edit requests" ON time_entry_edit_requests
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE user_id = auth.uid()
            AND company_id = time_entry_edit_requests.company_id
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE user_id = auth.uid()
            AND company_id = time_entry_edit_requests.company_id
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- Política 7: Los managers pueden actualizar solicitudes de sus empleados
-- (empleados del mismo departamento o con supervisor_id = manager)
CREATE POLICY "Managers can update team edit requests" ON time_entry_edit_requests
    FOR UPDATE 
    USING (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = time_entry_edit_requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = time_entry_edit_requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = time_entry_edit_requests.user_id
                    AND employee_role.company_id = time_entry_edit_requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    );

-- =====================================================
-- 2. POLÍTICAS PARA requests (solicitudes normales)
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own pending requests" ON requests;
DROP POLICY IF EXISTS "Managers can view employee requests" ON requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON requests;
DROP POLICY IF EXISTS "requests_policy" ON requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON requests;
DROP POLICY IF EXISTS "Managers can view team requests" ON requests;
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON requests;
DROP POLICY IF EXISTS "Managers can update team requests" ON requests;

-- Política 1: Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT USING (user_id = auth.uid());

-- Política 2: Los administradores (admin, owner) pueden ver TODAS las solicitudes de su empresa
CREATE POLICY "Admins can view all requests" ON requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = requests.company_id
            AND ucr.role IN ('owner', 'admin')
            AND ucr.is_active = true
        )
    );

-- Política 3: Los managers pueden ver solicitudes de sus empleados
-- (empleados del mismo departamento o con supervisor_id = manager)
CREATE POLICY "Managers can view team requests" ON requests
    FOR SELECT USING (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    );

-- Política 4: Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own requests" ON requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_company_roles
            WHERE company_id = requests.company_id
            AND user_id = auth.uid()
            AND is_active = true
        )
    );

-- Política 5: Los usuarios pueden actualizar sus propias solicitudes pendientes
CREATE POLICY "Users can update their own pending requests" ON requests
    FOR UPDATE 
    USING (
        user_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Política 6: Los administradores (admin, owner) pueden actualizar TODAS las solicitudes de su empresa
CREATE POLICY "Admins can update all requests" ON requests
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 
            FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = requests.company_id
            AND ucr.role IN ('owner', 'admin')
            AND ucr.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = requests.company_id
            AND ucr.role IN ('owner', 'admin')
            AND ucr.is_active = true
        )
    );

-- Política 7: Los managers pueden actualizar solicitudes de sus empleados
-- (empleados del mismo departamento o con supervisor_id = manager)
CREATE POLICY "Managers can update team requests" ON requests
    FOR UPDATE 
    USING (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            -- Verificar que el usuario actual es un manager activo en la misma empresa
            SELECT 1 FROM user_company_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND manager_role.company_id = requests.company_id
            AND manager_role.role = 'manager'
            AND manager_role.is_active = true
            AND (
                -- Caso 1: El empleado está en el mismo departamento que el manager
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.department_id = manager_role.department_id
                    AND employee_role.department_id IS NOT NULL
                    AND employee_role.is_active = true
                )
                OR
                -- Caso 2: El empleado tiene supervisor_id = manager_role.id
                EXISTS (
                    SELECT 1 FROM user_company_roles employee_role
                    WHERE employee_role.user_id = requests.user_id
                    AND employee_role.company_id = requests.company_id
                    AND employee_role.supervisor_id = manager_role.id
                    AND employee_role.is_active = true
                )
            )
        )
    );

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('time_entry_edit_requests', 'requests')
ORDER BY tablename, policyname;

