import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Plus, 
  Search, 
  Users,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  Calendar
} from 'lucide-react';
import DepartmentModal from '@/components/DepartmentModal';

export default function Departments() {
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [selectedDepartment, setSelectedDepartment] = React.useState(null);
  const [showActionsMenu, setShowActionsMenu] = React.useState(null);
  const [currentCompanyId, setCurrentCompanyId] = React.useState(null);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalEmployees: 0
  });

  React.useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('company_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!rolesError && Array.isArray(roles) && roles.length > 0) {
        const preferred = roles.find(r => ['owner', 'admin'].includes(r.role)) || roles[0];
        const companyId = preferred.company_id;
        setCurrentCompanyId(companyId);
        // Cargar departamentos básicos
        const { data: departmentsData, error } = await supabase
          .from('departments')
          .select('*')
          .eq('company_id', companyId)
          .order('name');

        if (!error && departmentsData) {
          // Cargar información del manager y empleados para cada departamento
          const departmentsWithDetails = await Promise.all(
            departmentsData.map(async (dept) => {
              let managerName = 'Sin asignar';
              
              // Si hay manager_id, obtener información del manager
              if (dept.manager_id) {
                try {
                  const { data: managerRole, error: managerRoleError } = await supabase
                    .from('user_company_roles')
                    .select('user_id')
                    .eq('id', dept.manager_id)
                    .eq('is_active', true)
                    .maybeSingle();

                  if (managerRoleError) {
                    console.warn('⚠️ Error obteniendo rol del manager:', managerRoleError);
                  } else if (managerRole && managerRole.user_id) {
                    const { data: managerProfile, error: managerProfileError } = await supabase
                      .from('user_profiles')
                      .select('full_name')
                      .eq('user_id', managerRole.user_id)
                      .maybeSingle();

                    if (managerProfileError) {
                      console.warn('⚠️ Error obteniendo perfil del manager:', managerProfileError);
                    } else if (managerProfile && managerProfile.full_name) {
                      managerName = managerProfile.full_name;
                    }
                  }
                } catch (error) {
                  console.error('❌ Error cargando información del manager:', error);
                }
              }

              // Contar empleados en el departamento
              const { count: employeeCount } = await supabase
                .from('user_company_roles')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
                .eq('department_id', dept.id)
                .eq('is_active', true)
                .neq('role', 'owner');

              return {
                ...dept,
                employee_count: employeeCount || 0,
                manager_name: managerName
              };
            })
          );

          setDepartments(departmentsWithDetails);
          calculateStats(departmentsWithDetails);
        }
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(departmentsData) {
    const total = departmentsData.length;
    const active = departmentsData.filter(d => d.status === 'active').length;
    const inactive = departmentsData.filter(d => d.status === 'inactive').length;
    const totalEmployees = departmentsData.reduce((sum, dept) => sum + (dept.employee_count || 0), 0);

    setStats({ total, active, inactive, totalEmployees });
  }

  async function toggleDepartmentStatus(departmentId, currentStatus) {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ status: currentStatus === 'active' ? 'inactive' : 'active' })
        .eq('id', departmentId);

      if (!error) {
        await loadDepartments();
        setShowActionsMenu(null);
      }
    } catch (error) {
      console.error('Error toggling department status:', error);
    }
  }

  function getStatusColor(status) {
    return status === 'active' 
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

  const filteredDepartments = departments.filter(department => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const name = department.name?.toLowerCase() || '';
      const description = department.description?.toLowerCase() || '';
      
      return name.includes(searchLower) || 
             description.includes(searchLower);
    }
    return true;
  });

  function handleDepartmentSaved(savedDepartment) {
    // Recargar todos los datos para obtener información actualizada
    // Usar un pequeño delay para asegurar que el INSERT se haya completado
    // Limpiar búsqueda para evitar que el nuevo departamento quede oculto por el filtro
    setSearchTerm('');
    if (savedDepartment?.company_id) {
      setCurrentCompanyId(savedDepartment.company_id);
    }
    setTimeout(() => {
      loadDepartments();
    }, 300);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departamentos</h1>
          <p className="text-muted-foreground mt-1">
            Organiza la estructura de tu empresa
          </p>
        </div>
        {/* Botón crear movido a la barra de búsqueda */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Activos</p>
              <p className="text-3xl font-bold text-foreground">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
              <p className="text-3xl font-bold text-foreground">{stats.inactive}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empleados</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar departamentos..."
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
            <button
              onClick={() => {
                setSelectedDepartment(null);
                setShowModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Departamento
            </button>
          </div>
        </div>
      </div>

      {/* Departments List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">Departamento</th>
                <th className="th">Manager</th>
                <th className="th">Empleados</th>
                <th className="th">Estado</th>
                <th className="th">Creado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="td text-center text-muted-foreground py-8">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No hay departamentos {searchTerm ? 'que coincidan con la búsqueda' : ''}</p>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((department) => (
                  <tr key={department.id}>
                    <td className="td">
                      <div>
                        <p className="font-medium text-foreground">{department.name}</p>
                        {department.description && (
                          <p className="text-sm text-muted-foreground">
                            {department.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      {department.manager_name}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{department.employee_count} empleados</span>
                      </div>
                    </td>
                    <td className="td">
                      <span className={`badge ${getStatusColor(department.status)}`}>
                        {department.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(department.created_at)}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDepartment(department);
                            setShowModal(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === department.id ? null : department.id)}
                          className="btn btn-ghost btn-sm relative"
                          title="Más acciones"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                          {showActionsMenu === department.id && (
                            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={() => toggleDepartmentStatus(department.id, department.status)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
                              >
                                {department.status === 'active' ? (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    Activar
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Modal */}
      <DepartmentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedDepartment(null);
        }}
        department={selectedDepartment}
        onDepartmentSaved={handleDepartmentSaved}
      />
    </div>
  );
}