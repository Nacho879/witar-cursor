import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Plus, Search, Mail, User } from 'lucide-react';
import InviteUserModal from '@/components/InviteUserModal';

export default function Employees() {
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [companyId, setCompanyId] = React.useState(null);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyId(userRole.company_id);
          await Promise.all([
            loadEmployees(userRole.company_id),
            loadDepartments(userRole.company_id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees(companyId) {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          id,
          role,
          is_active,
          joined_at,
          user_profiles (
            full_name,
            email
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .order('joined_at', { ascending: false });

      if (!error && data) {
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  async function loadDepartments(companyId) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (!error && data) {
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  function getRoleDisplayName(role) {
    switch (role) {
      case 'owner': return 'Dueño';
      case 'admin': return 'Administrador';
      case 'manager': return 'Jefe de Equipo';
      case 'employee': return 'Empleado';
      default: return role;
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const name = employee.user_profiles?.full_name?.toLowerCase() || '';
    const email = employee.user_profiles?.email?.toLowerCase() || '';
    return name.includes(searchLower) || email.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold">Empleados</h1>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invitar Usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              className="input flex-1 border-0 focus:ring-0 p-0"
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th className="th">Empleado</th>
              <th className="th">Correo</th>
              <th className="th">Rol</th>
              <th className="th">Departamento</th>
              <th className="th">Estado</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id}>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span>{employee.user_profiles?.full_name || 'Sin nombre'}</span>
                  </div>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{employee.user_profiles?.email || 'Sin email'}</span>
                  </div>
                </td>
                <td className="td">
                  <span className="badge">{getRoleDisplayName(employee.role)}</span>
                </td>
                <td className="td">
                  {employee.departments?.name || 'Sin departamento'}
                </td>
                <td className="td">
                  <span className={`badge ${employee.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {employee.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="td">
                  <button className="btn btn-ghost btn-sm">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        companyId={companyId}
        departments={departments}
      />
    </div>
  );
}
