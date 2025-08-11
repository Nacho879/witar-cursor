import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Plus, Search, Mail, User, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import InviteUserModal from '@/components/InviteUserModal';
import EmployeeProfileModal from '@/components/EmployeeProfileModal';

export default function Employees() {
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [companyId, setCompanyId] = React.useState(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [showActionsMenu, setShowActionsMenu] = React.useState(null);

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
            email,
            avatar_url,
            phone,
            position
          ),
          departments (
            name
          ),
          user_company_roles!user_company_roles_supervisor_id_fkey (
            user_profiles (
              full_name
            )
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
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function toggleEmployeeStatus(employeeId, currentStatus) {
    try {
      const { error } = await supabase
        .from('user_company_roles')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId);

      if (!error) {
        await loadEmployees(companyId);
        setShowActionsMenu(null);
      }
    } catch (error) {
      console.error('Error toggling employee status:', error);
    }
  }

  function getRoleDisplayName(role) {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'manager': return 'Jefe de Equipo';
      case 'employee': return 'Empleado';
      default: return role;
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(isActive) {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const name = employee.user_profiles?.full_name?.toLowerCase() || '';
    const email = employee.user_profiles?.email?.toLowerCase() || '';
    const role = getRoleDisplayName(employee.role).toLowerCase();
    const department = employee.departments?.name?.toLowerCase() || '';
    
    return name.includes(searchLower) || 
           email.includes(searchLower) || 
           role.includes(searchLower) || 
           department.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el equipo de tu empresa
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Invitar Empleado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-foreground">{employees.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Activos</p>
              <p className="text-3xl font-bold text-foreground">
                {employees.filter(e => e.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Managers</p>
              <p className="text-3xl font-bold text-foreground">
                {employees.filter(e => e.role === 'manager' && e.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departamentos</p>
              <p className="text-3xl font-bold text-foreground">{departments.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar empleados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSearchTerm('')}
              className="btn btn-ghost"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">Empleado</th>
                <th className="th">Rol</th>
                <th className="th">Departamento</th>
                <th className="th">Supervisor</th>
                <th className="th">Estado</th>
                <th className="th">Fecha de Ingreso</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="td text-center text-muted-foreground py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No hay empleados {searchTerm ? 'que coincidan con la búsqueda' : ''}</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {employee.user_profiles?.avatar_url ? (
                            <img 
                              src={employee.user_profiles.avatar_url} 
                              alt={employee.user_profiles.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-primary">
                              {employee.user_profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {employee.user_profiles?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.user_profiles?.email}
                          </p>
                          {employee.user_profiles?.position && (
                            <p className="text-xs text-muted-foreground">
                              {employee.user_profiles.position}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <span className={`badge ${getRoleColor(employee.role)}`}>
                        {getRoleDisplayName(employee.role)}
                      </span>
                    </td>
                    <td className="td">
                      {employee.departments?.name || 'Sin departamento'}
                    </td>
                    <td className="td">
                      {employee.user_company_roles?.user_profiles?.full_name || 'Sin supervisor'}
                    </td>
                    <td className="td">
                      <span className={`badge ${getStatusColor(employee.is_active)}`}>
                        {employee.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(employee.joined_at)}
                      </span>
                    </td>
                    <td className="td">
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === employee.id ? null : employee.id)}
                          className="btn btn-ghost btn-sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu === employee.id && (
                          <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowActionsMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Perfil
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowActionsMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              {employee.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        companyId={companyId}
        departments={departments}
      />

      {/* Employee Profile Modal */}
      <EmployeeProfileModal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
      />
    </div>
  );
}
