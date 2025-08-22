-- =====================================================
-- ARREGLAR POLÍTICAS RLS DE TIME_ENTRIES
-- =====================================================

-- Desactivar RLS temporalmente en time_entries
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de time_entries
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers can view employee time entries" ON time_entries;
DROP POLICY IF EXISTS "Only admins can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Managers, admins and owners can delete time entries" ON time_entries;
DROP POLICY IF EXISTS "time_entries_policy" ON time_entries;
DROP POLICY IF EXISTS "Users can view company time entries" ON time_entries;

-- Crear política simple para time_entries
CREATE POLICY "Allow all operations for authenticated users" ON time_entries 
FOR ALL USING (auth.role() = 'authenticated');

-- Reactivar RLS en time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY; 