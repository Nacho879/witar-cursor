-- =====================================================
-- SOLUCIÓN TEMPORAL - DESHABILITAR POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Deshabilitar RLS temporalmente en user_company_roles para permitir creación inicial
ALTER TABLE user_company_roles DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS temporalmente en companies para permitir creación inicial
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS temporalmente en departments para permitir creación inicial
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS SIMPLES SIN RECURSIÓN
-- =====================================================

-- Habilitar RLS nuevamente
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Políticas simples para user_company_roles
CREATE POLICY "Simple user_company_roles select" ON user_company_roles
    FOR SELECT USING (true);

CREATE POLICY "Simple user_company_roles insert" ON user_company_roles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Simple user_company_roles update" ON user_company_roles
    FOR UPDATE USING (true);

CREATE POLICY "Simple user_company_roles delete" ON user_company_roles
    FOR DELETE USING (true);

-- Políticas simples para companies
CREATE POLICY "Simple companies select" ON companies
    FOR SELECT USING (true);

CREATE POLICY "Simple companies insert" ON companies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Simple companies update" ON companies
    FOR UPDATE USING (true);

-- Políticas simples para departments
CREATE POLICY "Simple departments select" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Simple departments insert" ON departments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Simple departments update" ON departments
    FOR UPDATE USING (true); 