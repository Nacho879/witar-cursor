import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Calendar,
  MapPin,
  User,
  Building2,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';

export default function TimeEntries() {
  const [companyId, setCompanyId] = React.useState(null);
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    completed: 0,
    totalHours: 0
  });
  
  // Estados para filtros
  const [filters, setFilters] = React.useState({
    search: '',
    selectedEmployees: [],
    selectedDepartments: [],
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: 'all'
  });

  // Cargar datos iniciales
  React.useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Iniciando carga de datos de fichajes...');

      // 1. Obtener usuario y company_id
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('No se pudo obtener el usuario autenticado');
      }

      console.log('✅ Usuario autenticado:', user.id);

      // 2. Obtener company_id del usuario
      const { data: userRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (roleError || !userRole) {
        throw new Error('No se pudo obtener el rol del usuario');
      }

      console.log('✅ Company ID obtenido:', userRole.company_id);
      setCompanyId(userRole.company_id);

      // 3. Cargar empleados (simplificado)
      console.log('🔄 Cargando empleados...');
      const { data: employeesData, error: employeesError } = await supabase
        .from('user_company_roles')
        .select('user_id, role')
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .neq('role', 'owner');

      if (employeesError) {
        console.log('❌ Error cargando empleados:', employeesError);
        setEmployees([]);
      } else {
        console.log('✅ Empleados cargados:', employeesData?.length || 0);
        setEmployees(employeesData || []);
      }

      // 4. Cargar departamentos
      console.log('🔄 Cargando departamentos...');
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', userRole.company_id);

      if (departmentsError) {
        console.log('❌ Error cargando departamentos:', departmentsError);
        setDepartments([]);
      } else {
        console.log('✅ Departamentos cargados:', departmentsData?.length || 0);
        setDepartments(departmentsData || []);
      }

      // 5. Cargar time entries (simplificado)
      console.log('🔄 Cargando fichajes...');
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', userRole.company_id)
        .gte('created_at', `${filters.dateFrom}T00:00:00`)
        .lte('created_at', `${filters.dateTo}T23:59:59`)
        .order('created_at', { ascending: false });

      if (timeEntriesError) {
        console.log('❌ Error cargando fichajes:', timeEntriesError);
        throw new Error('Error al cargar los fichajes');
      } else {
        console.log('✅ Fichajes cargados:', timeEntriesData?.length || 0);
        setTimeEntries(timeEntriesData || []);
      }

      // 6. Calcular estadísticas
      console.log('🔄 Calculando estadísticas...');
      const total = timeEntriesData?.length || 0;
      const active = timeEntriesData?.filter(entry => !entry.clock_out_time).length || 0;
      const completed = total - active;
      
      const totalHours = timeEntriesData?.reduce((acc, entry) => {
        if (entry.clock_out_time) {
          const duration = new Date(entry.clock_out_time) - new Date(entry.clock_in_time);
          return acc + (duration / (1000 * 60 * 60));
        }
        return acc;
      }, 0) || 0;

      setStats({
        total,
        active,
        completed,
        totalHours: Math.round(totalHours * 100) / 100
      });

      console.log('✅ Estadísticas calculadas:', { total, active, completed, totalHours });

    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Función para recargar datos
  const handleRefresh = React.useCallback(() => {
    loadInitialData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Control de Horarios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona y supervisa los fichajes de todos los empleados
            </p>
          </div>
        </div>
        
        <LoadingSpinner text="Cargando fichajes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Control de Horarios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona y supervisa los fichajes de todos los empleados
            </p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-700 dark:text-red-400 font-medium mb-2">Error al cargar los fichajes</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Control de Horarios</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona y supervisa los fichajes de todos los empleados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fichajes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Curso</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completados</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Horas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fichajes Recientes</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {timeEntries.length} fichajes encontrados
          </div>
        </div>

        {timeEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No se encontraron fichajes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Empleado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => {
                  const entryDate = new Date(entry.created_at);
                  const isCompleted = entry.clock_out_time;
                  
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Empleado {entry.user_id?.slice(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.entry_type === 'clock_in' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {entry.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {entryDate.toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {entryDate.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isCompleted
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {isCompleted ? 'Completado' : 'En curso'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {entry.location_lat && entry.location_lng ? (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs">GPS</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Sin GPS</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Debug Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Información de Debug</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Company ID:</strong> {companyId || 'No disponible'}</p>
            <p><strong>Empleados cargados:</strong> {employees.length}</p>
            <p><strong>Departamentos cargados:</strong> {departments.length}</p>
          </div>
          <div>
            <p><strong>Fichajes cargados:</strong> {timeEntries.length}</p>
            <p><strong>Fecha desde:</strong> {filters.dateFrom}</p>
            <p><strong>Fecha hasta:</strong> {filters.dateTo}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
