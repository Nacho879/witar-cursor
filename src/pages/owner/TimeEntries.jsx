import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import Card from '@/components/Card';
import GPSDebugger from '@/components/GPSDebugger';
import LocationMapModal from '@/components/LocationMapModal';
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
  const [showGPSDebug, setShowGPSDebug] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState(null);
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    completed: 0,
    totalHours: 0
  });
  const [userNames, setUserNames] = React.useState({});
  
  // Estados para filtros
  const [filters, setFilters] = React.useState({
    search: '',
    selectedEmployees: [],
    selectedDepartments: [],
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: 'all'
  });
  const [allEmployees, setAllEmployees] = React.useState(true);
  const [selectedEmployee, setSelectedEmployee] = React.useState('all');
  const [selectedRoles, setSelectedRoles] = React.useState(['employee', 'manager', 'admin']);
  const [viewMode, setViewMode] = React.useState('day'); // 'day' | 'month' | 'range'
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [rangeFrom, setRangeFrom] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [rangeTo, setRangeTo] = React.useState(() => new Date().toISOString().split('T')[0]);

  // Cargar datos iniciales
  React.useEffect(() => {
    loadInitialData();
  }, []);

  // Recargar cuando cambien filtros de empleados/roles o rangos
  React.useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEmployees, selectedEmployee, selectedRoles, filters.dateFrom, filters.dateTo]);

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

      // 5. Determinar usuarios a incluir según filtros de empleados/roles
      let filteredUserIds = (employeesData || []).map(e => e.user_id);
      if (Array.isArray(selectedRoles) && selectedRoles.length > 0 && selectedRoles.length < 3) {
        const roleUsers = (employeesData || []).filter(e => selectedRoles.includes(e.role));
        filteredUserIds = filteredUserIds.filter(id => roleUsers.some(u => u.user_id === id));
      }
      // Si no está tildado "Todos los empleados", igualmente no se filtra por un empleado concreto

      // 5a. Cargar time entries con filtros
      console.log('🔄 Cargando fichajes...');
      let timeEntriesData = [];
      let timeEntriesError = null;
      if (filteredUserIds.length === 0) {
        timeEntriesData = [];
      } else {
        const query = supabase
          .from('time_entries')
          .select('*')
          .eq('company_id', userRole.company_id)
          .in('user_id', filteredUserIds)
          .gte('created_at', `${filters.dateFrom}T00:00:00`)
          .lte('created_at', `${filters.dateTo}T23:59:59`)
          .order('created_at', { ascending: false });
        const { data, error } = await query;
        timeEntriesData = data || [];
        timeEntriesError = error || null;
      }

      if (timeEntriesError) {
        console.log('❌ Error cargando fichajes:', timeEntriesError);
        throw new Error('Error al cargar los fichajes');
      } else {
        console.log('✅ Fichajes cargados:', timeEntriesData?.length || 0);
        setTimeEntries(timeEntriesData || []);
      }

      // 5b. Cargar nombres de usuarios para los fichajes
      try {
        const uniqueUserIds = Array.from(new Set((timeEntriesData || []).map(e => e.user_id).filter(Boolean)));
        if (uniqueUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', uniqueUserIds);

          if (!profilesError && profilesData) {
            const map = {};
            for (const p of profilesData) {
              map[p.user_id] = p.full_name || '';
            }
            setUserNames(map);
          }
        }
      } catch (nameErr) {
        console.warn('No se pudieron cargar nombres de usuarios:', nameErr);
      }

      // 6. Calcular estadísticas
      console.log('🔄 Calculando estadísticas...');
      const total = timeEntriesData?.length || 0;
      const active = timeEntriesData?.filter(entry => entry.status === 'active').length || 0;
      const completed = timeEntriesData?.filter(entry => entry.status === 'completed').length || 0;
      
      const totalHours = timeEntriesData?.reduce((acc, entry) => {
        if (entry.duration) {
          // Si tenemos duration calculado, usarlo
          const hours = entry.duration / (1000 * 60 * 60);
          return acc + hours;
        } else if (entry.clock_in_time && entry.clock_out_time) {
          // Si no, calcular manualmente
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

  // Actualiza dateFrom/dateTo automáticamente según modo de vista
  React.useEffect(() => {
    let startStr = filters.dateFrom;
    let endStr = filters.dateTo;
    if (viewMode === 'day' && selectedDate) {
      startStr = selectedDate;
      endStr = selectedDate;
    } else if (viewMode === 'month' && selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      startStr = start.toISOString().split('T')[0];
      endStr = end.toISOString().split('T')[0];
    } else if (viewMode === 'range') {
      startStr = rangeFrom || startStr;
      endStr = rangeTo || endStr;
    }
    if (startStr !== filters.dateFrom || endStr !== filters.dateTo) {
      setFilters(prev => ({ ...prev, dateFrom: startStr, dateTo: endStr }));
      // Recargar datos al cambiar el rango
      // Esperar a que el estado se aplique
      setTimeout(() => loadInitialData(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate, selectedMonth, rangeFrom, rangeTo]);

  // Función para mostrar ubicación en mapa
  const handleShowLocation = (entry) => {
    if (entry.location_lat && entry.location_lng) {
      setSelectedLocation({
        lat: entry.location_lat,
        lng: entry.location_lng,
        accuracy: entry.location_accuracy,
        timestamp: entry.entry_time || entry.created_at
      });
      setShowLocationModal(true);
    }
  };

  // Exportar CSV (similar a admin)
  function exportToCSV() {
    const headers = ['Empleado', 'Fecha', 'Hora', 'Tipo', 'Estado'];
    const csvData = (timeEntries || []).map(entry => {
      const entryDate = new Date(entry.entry_time || entry.created_at);
      const isCompleted = entry.status === 'completed';
      const employeeName = userNames[entry.user_id] || `Empleado ${entry.user_id?.slice(0, 8) || ''}`;
      return [
        employeeName,
        entryDate.toLocaleDateString('es-ES'),
        entryDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        entry.entry_type === 'clock_in' ? 'Entrada' : 'Salida',
        isCompleted ? 'Completado' : 'En curso'
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fichajes_${filters.dateFrom}_${filters.dateTo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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
          <Button onClick={() => setShowGPSDebug(!showGPSDebug)} variant="outline">
            <MapPin className="w-4 h-4 mr-2" />
            Debug GPS
          </Button>
        </div>
      </div>

      {/* Filtros al estilo admin */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar empleado
            </label>
            <input
              type="text"
              placeholder="Nombre, email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input w-full"
            />
          </div>

          {/* Empleados */}
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Empleados</label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={allEmployees}
                onChange={(e) => setAllEmployees(e.target.checked)}
              />
              Todos los empleados
            </label>
          </div>

          {/* Roles */}
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Roles</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={selectedRoles.includes('employee')}
                  onChange={(e) => {
                    setSelectedRoles(prev => e.target.checked ? Array.from(new Set([...prev, 'employee'])) : prev.filter(r => r !== 'employee'));
                  }}
                />
                Empleado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={selectedRoles.includes('manager')}
                  onChange={(e) => {
                    setSelectedRoles(prev => e.target.checked ? Array.from(new Set([...prev, 'manager'])) : prev.filter(r => r !== 'manager'));
                  }}
                />
                Manager
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={selectedRoles.includes('admin')}
                  onChange={(e) => {
                    setSelectedRoles(prev => e.target.checked ? Array.from(new Set([...prev, 'admin'])) : prev.filter(r => r !== 'admin'));
                  }}
                />
                Administrador
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="owner-date-mode"
                  className="accent-blue-600"
                  checked={viewMode === 'day'}
                  onChange={() => setViewMode('day')}
                />
                Día
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="owner-date-mode"
                  className="accent-blue-600"
                  checked={viewMode === 'range'}
                  onChange={() => setViewMode('range')}
                />
                Rango
              </label>
            </div>
            {viewMode === 'day' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input w-full"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 w-full">
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="input w-full"
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="input w-full"
                />
              </div>
            )}
          </div>
          <div className="flex items-end lg:col-span-1 justify-start lg:justify-end">
            <button
              onClick={exportToCSV}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
          
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
                  const entryDate = new Date(entry.entry_time || entry.created_at);
                  const isCompleted = entry.status === 'completed';
                  
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {userNames[entry.user_id] || `Empleado ${entry.user_id?.slice(0, 8)}...`}
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
                          <button
                            onClick={() => handleShowLocation(entry)}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            title="Ver ubicación en mapa"
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs">Ver mapa</span>
                          </button>
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

      {showGPSDebug && (
        <div className="mt-8">
          <GPSDebugger companyId={companyId} />
        </div>
      )}

      {/* Modal de ubicación */}
      <LocationMapModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        location={selectedLocation}
      />
    </div>
  );
}
