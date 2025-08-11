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

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        const { data, error } = await supabase
          .from('departments')
          .select(`
            *,
            user_company_roles!departments_manager_id_fkey (
              user_profiles (
                full_name,
                email
              )
            ),
            employees:user_company_roles!user_company_roles_department_id_fkey (
              id,
              user_profiles (
                full_name
              )
            )
          `)
          .eq('company_id', userRole.company_id)
          .order('name');

        if (!error && data) {
          setDepartments(data);
          calculateStats(data);
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
    const totalEmployees = departmentsData.reduce((sum, dept) => sum + (dept.employees?.length || 0), 0);

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
      const managerName = department.user_company_roles?.user_profiles?.full_name?.toLowerCase() || '';
      
      return name.includes(searchLower) || 
             description.includes(searchLower) || 
             managerName.includes(searchLower);
    }
    return true;
  });

  function handleDepartmentSaved(savedDepartment) {
    if (selectedDepartment) {
      // Actualizar departamento existente
      setDepartments(prev => prev.map(dept => 
        dept.id === savedDepartment.id ? savedDepartment : dept
      ));
    } else {
      // Añadir nuevo departamento
      setDepartments(prev => [...prev, savedDepartment]);
    }
    calculateStats([...departments, savedDepartment]);
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
                      {department.user_company_roles?.user_profiles?.full_name || 'Sin manager'}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{department.employees?.length || 0} empleados</span>
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
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === department.id ? null : department.id)}
                          className="btn btn-ghost btn-sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu === department.id && (
                          <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                            <button
                              onClick={() => {
                                setSelectedDepartment(department);
                                setShowModal(true);
                                setShowActionsMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalles
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDepartment(department);
                                setShowModal(true);
                                setShowActionsMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => toggleDepartmentStatus(department.id, department.status)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              {department.status === 'active' ? 'Desactivar' : 'Activar'}
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
