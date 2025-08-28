import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  User, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Calendar,
  Activity,
  MapPin,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
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
  const [companySettings, setCompanySettings] = React.useState(null);
  const [employeeLocationSettings, setEmployeeLocationSettings] = React.useState({});
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    activeEmployees: 0,
    managers: 0,
    employees: 0
  });

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
            loadDepartments(userRole.company_id),
            loadCompanySettings(userRole.company_id),
            loadEmployeeLocationSettings(userRole.company_id)
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
      // Obtener los roles de usuario (excluyendo el owner)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_company_roles')
        .select(`
          id,
          user_id,
          role,
          is_active,
          joined_at,
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .neq('role', 'owner') // Excluir al owner
        .order('joined_at', { ascending: false });

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        return;
      }

      if (rolesData) {
        // Obtener todos los emails de una vez usando la función Edge
        const userIds = rolesData.map(role => role.user_id);
        
        let emailsData = {};
        try {
          const { data: emailsResponse, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds }
          });

          if (!emailsError && emailsResponse && emailsResponse.success) {
            // Convertir el array de emails a un objeto con user_id como clave
            emailsResponse.emails.forEach(item => {
              emailsData[item.user_id] = item.email;
            });
          }
        } catch (error) {
          console.error('Error getting emails:', error);
        }

        // Para cada rol, obtener el perfil del usuario
        const employeesWithUserData = await Promise.all(
          rolesData.map(async (role) => {
            // Obtener perfil del usuario
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', role.user_id)
              .maybeSingle();

            if (profileError) {
              console.error('Error loading profile for user:', role.user_id, profileError);
            }

            // Obtener email del objeto de emails
            const email = emailsData[role.user_id] || 'Email no disponible';

            return {
              ...role,
              profile: profile || {},
              email: email
            };
          })
        );

        setEmployees(employeesWithUserData);
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

  async function loadCompanySettings(companyId) {
    try {
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('require_location')
        .eq('company_id', companyId)
        .single();

      if (!error && settings) {
        setCompanySettings(settings);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  }

  async function loadEmployeeLocationSettings(companyId) {
    try {
      const { data: settings, error } = await supabase
        .from('user_location_settings')
        .select('user_id, require_location')
        .eq('company_id', companyId);

      if (!error && settings) {
        const settingsMap = {};
        settings.forEach(setting => {
          settingsMap[setting.user_id] = setting.require_location;
        });
        setEmployeeLocationSettings(settingsMap);
      }
    } catch (error) {
      console.error('Error loading employee location settings:', error);
    }
  }



  async function toggleEmployeeLocationRequirement(userId) {
    try {
      if (!companyId) return;

      const currentValue = employeeLocationSettings[userId] || false;
      const newValue = !currentValue;
      
      // Primero intentar actualizar si existe
      const { data: existingRecord, error: selectError } = await supabase
        .from('user_location_settings')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing record:', selectError);
        return;
      }

      let error;
      if (existingRecord) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('user_location_settings')
          .update({ require_location: newValue })
          .eq('company_id', companyId)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // Insertar nuevo registro
        const { error: insertError } = await supabase
          .from('user_location_settings')
          .insert({
            company_id: companyId,
            user_id: userId,
            require_location: newValue
          });
        error = insertError;
      }

      if (!error) {
        setEmployeeLocationSettings(prev => ({
          ...prev,
          [userId]: newValue
        }));
      } else {
        console.error('Error updating location settings:', error);
      }
    } catch (error) {
      console.error('Error toggling employee location requirement:', error);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  async function deleteEmployee(employee) {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${employee.profile?.full_name || 'este empleado'}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {

      // Llamar a la función de Supabase para eliminar completamente el empleado
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { 
          employeeId: employee.id,
          companyId: companyId
        }
      });


      if (error) {
        console.error('Error calling delete function:', error);
        alert(`Error al eliminar el empleado: ${error.message}`);
        return;
      }

      if (data && data.success) {
        alert('Empleado eliminado exitosamente');
        await loadEmployees(companyId);
        setShowActionsMenu(null);
      } else {
        alert(`Error al eliminar el empleado: ${data?.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error al eliminar el empleado');
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

  const filteredEmployees = employees.filter(employee =>
    employee.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estadísticas
  React.useEffect(() => {
    if (employees.length > 0) {
      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.is_active).length,
        managers: employees.filter(e => e.role === 'manager').length,
        employees: employees.filter(e => e.role === 'employee').length
      });
    }
  }, [employees]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
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
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los empleados de tu empresa
          </p>
        </div>
        <div className="flex justify-end pr-16 sm:pr-0">
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Invitar Empleado</span>
            <span className="sm:hidden">Invitar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Activos</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.activeEmployees}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.totalEmployees - stats.activeEmployees}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administradores</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.managers}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 lg:p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Employees Cards */}
      <div className="card">
        <div className="p-4 lg:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Empleados</h3>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No hay empleados que coincidan con la búsqueda' : 'No hay empleados registrados'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {employee.profile?.avatar_url ? (
                        <img 
                          src={employee.profile.avatar_url} 
                          alt={employee.profile.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium text-primary">
                          {employee.profile?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {employee.profile?.full_name || 'Sin nombre'}
                      </h4>
                      {employee.profile?.position && (
                        <p className="text-sm text-muted-foreground">
                          {employee.profile.position}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {employee.departments?.name || 'Sin departamento'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">
                        {employee.email}
                      </span>
                    </div>
                    
                    {employee.profile?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {employee.profile.phone}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Ingreso: {formatDate(employee.joined_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-medium ${
                        employee.is_active ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {employee.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground capitalize">
                        {employee.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ubicación:</span>
                      </div>
                      <button
                        onClick={() => toggleEmployeeLocationRequirement(employee.user_id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          employeeLocationSettings[employee.user_id]
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {employeeLocationSettings[employee.user_id] ? (
                          <>
                            <ToggleRight className="w-3 h-3" />
                            ON
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3 h-3" />
                            OFF
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="btn btn-ghost btn-sm flex-1 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Perfil
                      </button>
                      <button
                        onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                        className={`btn btn-sm flex items-center gap-2 ${
                          employee.is_active 
                            ? 'btn-outline btn-error' 
                            : 'btn-outline btn-success'
                        }`}
                      >
                        {employee.is_active ? (
                          <>
                            <User className="w-4 h-4" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            Activar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        companyId={companyId}
        departments={departments}
        onInviteSent={() => {
          setShowInviteModal(false);
          loadEmployees(companyId);
        }}
      />

      <EmployeeProfileModal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
      />
    </div>
  );
}
