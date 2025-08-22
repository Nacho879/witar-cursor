import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
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
import { motion, AnimatePresence } from 'framer-motion';

export default function TimeEntries() {
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState(null);
  
  // Estados para filtros
  const [filters, setFilters] = React.useState({
    search: '',
    selectedEmployees: [],
    selectedDepartments: [],
    dateFrom: new Date().toISOString().split('T')[0], // Hoy por defecto
    dateTo: new Date().toISOString().split('T')[0],   // Hoy por defecto
    status: 'all'
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(50);
  const [totalItems, setTotalItems] = React.useState(0);
  
  // Estados para la interfaz
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState(null);
  const [showEntryModal, setShowEntryModal] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    completed: 0,
    totalHours: 0
  });

  React.useEffect(() => {
    loadTimeEntriesData();
  }, []);

  React.useEffect(() => {
    if (companyId) {
      loadEmployees();
      loadDepartments();
    }
  }, [companyId]);

  // Recargar datos cuando cambien las fechas o la página
  React.useEffect(() => {
    if (companyId) {
      loadTimeEntries(companyId, filters.dateFrom, filters.dateTo, currentPage);
    }
  }, [companyId, filters.dateFrom, filters.dateTo, currentPage]);

  async function loadTimeEntriesData() {
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
          await loadTimeEntries(userRole.company_id, filters.dateFrom, filters.dateTo, currentPage);
        }
      }
    } catch (error) {
      console.error('Error loading time entries data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeEntries(companyId, dateFrom = null, dateTo = null, page = 1) {
    try {
      setLoading(true);
      
      // Construir la consulta base
      let query = supabase
        .from('time_entries')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros de fecha si se proporcionan
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('entry_time', fromDate.toISOString());
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('entry_time', toDate.toISOString());
      }

      // Aplicar paginación
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('entry_time', { ascending: false });

      // Ejecutar la consulta
      const { data: timeEntries, error: timeEntriesError, count } = await query;

      if (timeEntriesError) {
        console.error('Error loading time entries:', timeEntriesError);
        return;
      }

      // Actualizar el total de elementos
      setTotalItems(count || 0);

      if (timeEntries && timeEntries.length > 0) {
        // Obtener los user_ids únicos
        const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];

        // Obtener perfiles de usuario
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading user profiles:', profilesError);
        }

        // Obtener roles de usuario
        const { data: roles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, role, department_id')
          .eq('company_id', companyId)
          .in('user_id', userIds)
          .eq('is_active', true);

        if (rolesError) {
          console.error('Error loading user roles:', rolesError);
        }

        // Obtener departamentos si hay roles con department_id
        let departments = [];
        if (roles && roles.some(role => role.department_id)) {
          const departmentIds = [...new Set(roles.map(role => role.department_id).filter(Boolean))];
          const { data: deps, error: depsError } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', departmentIds);

          if (!depsError && deps) {
            departments = deps;
          }
        }

        // Combinar los datos
        const enrichedTimeEntries = timeEntries.map(entry => {
          const profile = profiles?.find(p => p.user_id === entry.user_id);
          const role = roles?.find(r => r.user_id === entry.user_id);
          const department = departments.find(d => d.id === role?.department_id);

          return {
            ...entry,
            user_profiles: profile || null,
            user_company_roles: role ? {
              ...role,
              departments: department || null
            } : null,
            // Agregar campos directos para facilitar el filtrado
            employee_name: profile?.full_name || 'Empleado',
            department_name: department?.name || 'Sin departamento',
            department_id: role?.department_id || null
          };
        });

        console.log('Time entries loaded:', enrichedTimeEntries.length, 'of', count, 'total');
        setTimeEntries(enrichedTimeEntries);
        calculateStats(enrichedTimeEntries);
      } else {
        setTimeEntries([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      // Obtener roles de usuario
      const { data: roles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id, role, department_id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        return;
      }

      if (roles && roles.length > 0) {
        // Obtener los user_ids únicos
        const userIds = [...new Set(roles.map(role => role.user_id))];

        // Obtener perfiles de usuario
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading user profiles:', profilesError);
        }

        // Obtener departamentos si hay roles con department_id
        let departments = [];
        if (roles.some(role => role.department_id)) {
          const departmentIds = [...new Set(roles.map(role => role.department_id).filter(Boolean))];
          const { data: deps, error: depsError } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', departmentIds);

          if (!depsError && deps) {
            departments = deps;
          }
        }

        // Combinar los datos
        const enrichedEmployees = roles.map(role => {
          const profile = profiles?.find(p => p.user_id === role.user_id);
          const department = departments.find(d => d.id === role.department_id);

          return {
            user_id: role.user_id,
            role: role.role,
            user_profiles: profile || null,
            departments: department || null
          };
        });

        setEmployees(enrichedEmployees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  async function loadDepartments() {
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

  // Función helper para determinar si un fichaje está completado
  function isEntryCompleted(entry) {
    // Un fichaje está completado si es un evento de salida
    // Los eventos de entrada y inicio de pausa están "en curso"
    return entry.entry_type === 'clock_out' || entry.entry_type === 'break_end';
  }

  // Función helper para obtener el texto del tipo de evento
  function getEntryTypeText(entry) {
    switch (entry.entry_type) {
      case 'clock_in':
        return 'Entrada';
      case 'clock_out':
        return 'Salida';
      case 'break_start':
        return 'Inicio Pausa';
      case 'break_end':
        return 'Fin Pausa';
      default:
        return 'N/A';
    }
  }

  // Función helper para determinar si un evento está "en curso" (necesita una salida)
  function isEntryInProgress(entry) {
    // Un evento está en progreso si es una entrada o inicio de pausa
    // que aún no tiene su correspondiente salida
    return entry.entry_type === 'clock_in' || entry.entry_type === 'break_start';
  }

  function calculateStats(entries) {
    const total = entries.length;
    
    // Usar las funciones helper para contar correctamente
    const active = entries.filter(entry => isEntryInProgress(entry)).length;
    const completed = entries.filter(entry => isEntryCompleted(entry)).length;
    
    // Para esta estructura, calcular horas totales requeriría agrupar entries por sesión
    // Por ahora, solo contamos el número de eventos
    let totalHours = 0; // TODO: Implementar cálculo de horas agrupando por sesiones

    console.log('Stats calculated:', { total, active, completed, totalHours });
    setStats({ total, active, completed, totalHours });
  }

  function getFilteredEntries() {
    let filtered = [...timeEntries];
    
    // Filtro por búsqueda (búsqueda en tiempo real)
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(entry => 
        entry.employee_name?.toLowerCase().includes(searchTerm) ||
        entry.department_name?.toLowerCase().includes(searchTerm) ||
        entry.user_company_roles?.role?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por empleados seleccionados
    if (filters.selectedEmployees.length > 0) {
      filtered = filtered.filter(entry => 
        filters.selectedEmployees.includes(entry.user_id)
      );
    }

    // Filtro por departamentos seleccionados
    if (filters.selectedDepartments.length > 0) {
      filtered = filtered.filter(entry => 
        filters.selectedDepartments.includes(entry.department_id)
      );
    }

    // Filtro por estado (las fechas ya se aplican en la consulta de la BD)
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(entry => isEntryInProgress(entry));
      } else if (filters.status === 'completed') {
        filtered = filtered.filter(entry => isEntryCompleted(entry));
      }
    }

    return filtered;
  }

  function getStatusBadge(entry) {
    // Determinar el estado basado en el tipo de evento
    const isInProgress = isEntryInProgress(entry);
    const isCompleted = isEntryCompleted(entry);

    if (isInProgress) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
          En curso
        </span>
      );
    } else if (isCompleted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Evento
        </span>
      );
    }
  }

  function formatDuration(entry) {
    // Para esta estructura, cada entry es un evento individual
    // No podemos calcular duración con un solo registro
    // Esto se calcularía agrupando entries por sesión de trabajo
    return '—';
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  async function exportToCSV() {
    try {
      setExportLoading(true);
      const filteredEntries = getFilteredEntries();
      
      // Crear CSV
      const headers = ['Empleado', 'Departamento', 'Fecha', 'Hora', 'Tipo', 'Estado', 'Ubicación'];
      const csvContent = [
        headers.join(','),
        ...filteredEntries.map(entry => [
          entry.employee_name || 'N/A',
          entry.department_name || 'N/A',
          formatDate(entry.entry_time),
          formatTime(entry.entry_time),
          getEntryTypeText(entry),
          isEntryInProgress(entry) ? 'En curso' : 
          isEntryCompleted(entry) ? 'Completado' : 'Evento',
          entry.location_lat && entry.location_lng ? 'Sí' : 'No'
        ].join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fichajes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExportLoading(false);
    }
  }

  function clearFilters() {
    setFilters({
      search: '',
      selectedEmployees: [],
      selectedDepartments: [],
      dateFrom: new Date().toISOString().split('T')[0], // Hoy por defecto
      dateTo: new Date().toISOString().split('T')[0],   // Hoy por defecto
      status: 'all'
    });
    setCurrentPage(1);
  }

  const filteredEntries = getFilteredEntries();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Control de Horario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y supervisa los fichajes de tu equipo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={exportToCSV}
            disabled={exportLoading}
            className="btn btn-secondary flex items-center gap-2"
          >
            {exportLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Fichajes</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">En Curso</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.active}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Completados</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.completed}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{Math.round(stats.totalHours)}h</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Búsqueda principal */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Buscar empleados o departamentos
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre de empleado o departamento..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn flex items-center gap-2 ${
                showFilters ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            <button
              onClick={clearFilters}
              className="btn btn-outline flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Filtros activos */}
        {(filters.selectedEmployees.length > 0 || 
          filters.selectedDepartments.length > 0 || 
          filters.status !== 'all' || 
          filters.dateFrom || 
          filters.dateTo) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.selectedEmployees.length > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                <span>{filters.selectedEmployees.length} empleado(s)</span>
                <button
                  onClick={() => setFilters({ ...filters, selectedEmployees: [] })}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.selectedDepartments.length > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                <span>{filters.selectedDepartments.length} departamento(s)</span>
                <button
                  onClick={() => setFilters({ ...filters, selectedDepartments: [] })}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.status !== 'all' && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                <span>Estado: {filters.status === 'active' ? 'En curso' : 'Completados'}</span>
                <button
                  onClick={() => setFilters({ ...filters, status: 'all' })}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                <span>
                  {filters.dateFrom && filters.dateTo 
                    ? `${filters.dateFrom} - ${filters.dateTo}`
                    : filters.dateFrom 
                    ? `Desde ${filters.dateFrom}`
                    : `Hasta ${filters.dateTo}`
                  }
                </span>
                <button
                  onClick={() => setFilters({ ...filters, dateFrom: '', dateTo: '' })}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 sm:p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Empleados */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Empleados específicos
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {employees.map(emp => (
                    <label key={emp.user_id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.selectedEmployees.includes(emp.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              selectedEmployees: [...filters.selectedEmployees, emp.user_id]
                            });
                          } else {
                            setFilters({
                              ...filters,
                              selectedEmployees: filters.selectedEmployees.filter(id => id !== emp.user_id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{emp.user_profiles?.full_name || 'Empleado'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Departamentos */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Departamentos
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {departments.map(dept => (
                    <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.selectedDepartments.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              selectedDepartments: [...filters.selectedDepartments, dept.id]
                            });
                          } else {
                            setFilters({
                              ...filters,
                              selectedDepartments: filters.selectedDepartments.filter(id => id !== dept.id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Estado y Fechas */}
              <div className="space-y-4">
                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado del fichaje
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="input w-full"
                  >
                    <option value="all">Todos los eventos</option>
                    <option value="active">Solo en curso (entradas/pausas)</option>
                    <option value="completed">Solo completados (salidas/fin pausas)</option>
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Rango de fechas
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      placeholder="Desde"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="input w-full"
                    />
                    <input
                      type="date"
                      placeholder="Hasta"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Entries Table */}
      <div className="card overflow-hidden">
        {/* Table Header with Results Info */}
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                Registros de Fichaje
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrando {filteredEntries.length} registros del {filters.dateFrom} al {filters.dateTo}</span>
                {(filters.search || filters.selectedEmployees.length > 0 || filters.selectedDepartments.length > 0 || filters.status !== 'all') && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    Filtrado
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Date Range Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }));
                    setCurrentPage(1);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Hoy
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    setFilters(prev => ({ 
                      ...prev, 
                      dateFrom: yesterday.toISOString().split('T')[0], 
                      dateTo: yesterday.toISOString().split('T')[0] 
                    }));
                    setCurrentPage(1);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Ayer
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    setFilters(prev => ({ 
                      ...prev, 
                      dateFrom: weekAgo.toISOString().split('T')[0], 
                      dateTo: today.toISOString().split('T')[0] 
                    }));
                    setCurrentPage(1);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Última semana
                </button>
              </div>
              
              <button
                onClick={exportToCSV}
                disabled={exportLoading || filteredEntries.length === 0}
                className="btn btn-outline btn-sm flex items-center gap-2"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Exportar
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="th text-left">Empleado</th>
                <th className="th text-left">Departamento</th>
                <th className="th text-left">Fecha</th>
                <th className="th text-left">Hora</th>
                <th className="th text-left">Tipo</th>
                <th className="th text-left">Estado</th>
                <th className="th text-left">Ubicación</th>
                <th className="th text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="td text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Clock className="w-16 h-16 text-muted-foreground" />
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          {timeEntries.length === 0 ? 'No hay fichajes registrados' : 'No se encontraron resultados'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {timeEntries.length === 0 
                            ? 'Aún no se han registrado fichajes en el sistema.'
                            : 'Intenta ajustar los filtros de búsqueda para encontrar los registros que buscas.'
                          }
                        </p>
                        {timeEntries.length > 0 && (
                          <button
                            onClick={clearFilters}
                            className="btn btn-primary btn-sm"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {entry.user_profiles?.avatar_url ? (
                            <img
                              src={entry.user_profiles.avatar_url}
                              alt={entry.user_profiles.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {entry.user_profiles?.full_name || 'Empleado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user_company_roles?.role || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <span className="text-sm">
                        {entry.department_name || 'Sin departamento'}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm">{formatDate(entry.entry_time)}</span>
                    </td>
                    <td className="td">
                      <span className="text-sm font-mono">
                        {formatTime(entry.entry_time)}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm">
                        {getEntryTypeText(entry)}
                      </span>
                    </td>
                    <td className="td">
                      {getStatusBadge(entry)}
                    </td>
                    <td className="td">
                      {entry.location_lat && entry.location_lng ? (
                        <span className="inline-flex items-center text-green-600 text-sm">
                          <MapPin className="w-3 h-3 mr-1" />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600 text-sm">
                          <XCircle className="w-3 h-3 mr-1" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowEntryModal(true);
                          }}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Entry Details Modal */}
      {showEntryModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Detalles del Fichaje
                </h3>
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedEntry.user_profiles?.avatar_url ? (
                    <img
                      src={selectedEntry.user_profiles.avatar_url}
                      alt={selectedEntry.user_profiles.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-foreground">
                    {selectedEntry.employee_name || 'Empleado'}
                  </h4>
                  <p className="text-muted-foreground">
                    {selectedEntry.department_name || 'Sin departamento'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEntry.user_company_roles?.role || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Time Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Fecha
                    </label>
                    <p className="text-foreground">{formatDate(selectedEntry.entry_time)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Entrada
                    </label>
                    <p className="text-foreground font-mono">
                      {formatTime(selectedEntry.entry_time)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Salida
                    </label>
                    <p className="text-foreground font-mono">
                      {selectedEntry.entry_type === 'clock_out' || selectedEntry.entry_type === 'break_end' 
                        ? formatTime(selectedEntry.entry_time) 
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Duración
                    </label>
                    <p className="text-foreground font-mono">
                      {formatDuration(selectedEntry)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Estado
                    </label>
                    {getStatusBadge(selectedEntry)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Ubicación
                    </label>
                    {selectedEntry.location_lat && selectedEntry.location_lng ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <MapPin className="w-4 h-4" />
                        <span>Registrada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span>No registrada</span>
                      </div>
                    )}
                  </div>
                  {selectedEntry.notes && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Notas
                      </label>
                      <p className="text-foreground text-sm">{selectedEntry.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Map (if available) */}
              {selectedEntry.location_lat && selectedEntry.location_lng && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Ubicación
                  </label>
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Lat: {selectedEntry.location_lat.toFixed(6)}, 
                      Lng: {selectedEntry.location_lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${selectedEntry.location_lat},${selectedEntry.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm mt-2 inline-block"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalItems > itemsPerPage && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline btn-sm"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {Math.ceil(totalItems / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                className="btn btn-outline btn-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
