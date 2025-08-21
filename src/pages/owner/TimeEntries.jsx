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
  Activity
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
    dateFrom: '',
    dateTo: '',
    status: 'all'
  });
  
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
          await loadTimeEntries(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading time entries data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeEntries(companyId) {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profiles (
            full_name,
            avatar_url
          ),
          user_company_roles (
            role,
            departments (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .order('entry_time', { ascending: false });

      if (!error && data) {
        setTimeEntries(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  }

  async function loadEmployees() {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          user_id,
          role,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!error && data) {
        setEmployees(data);
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

  function calculateStats(entries) {
    const total = entries.length;
    const active = entries.filter(entry => !entry.clock_out).length;
    const completed = total - active;
    
    let totalHours = 0;
    entries.forEach(entry => {
      if (entry.clock_in && entry.clock_out) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        totalHours += duration / (1000 * 60 * 60);
      }
    });

    setStats({ total, active, completed, totalHours });
  }

  function getFilteredEntries() {
    let filtered = [...timeEntries];

    // Filtro por búsqueda
    if (filters.search) {
      filtered = filtered.filter(entry => 
        entry.user_profiles?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        entry.user_company_roles?.departments?.name?.toLowerCase().includes(filters.search.toLowerCase())
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
        filters.selectedDepartments.includes(entry.user_company_roles?.departments?.id)
      );
    }

    // Filtro por fecha
    if (filters.dateFrom) {
      filtered = filtered.filter(entry => 
        new Date(entry.entry_time) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => 
        new Date(entry.entry_time) <= new Date(filters.dateTo)
      );
    }

    // Filtro por estado
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(entry => !entry.clock_out);
      } else if (filters.status === 'completed') {
        filtered = filtered.filter(entry => entry.clock_out);
      }
    }

    return filtered;
  }

  function getStatusBadge(entry) {
    if (!entry.clock_out) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
          En curso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completado
      </span>
    );
  }

  function formatDuration(entry) {
    if (!entry.clock_in || !entry.clock_out) return '—';
    
    const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
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
      const headers = ['Empleado', 'Departamento', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'Ubicación'];
      const csvContent = [
        headers.join(','),
        ...filteredEntries.map(entry => [
          entry.user_profiles?.full_name || 'N/A',
          entry.user_company_roles?.departments?.name || 'N/A',
          formatDate(entry.entry_time),
          formatTime(entry.clock_in || entry.entry_time),
          entry.clock_out ? formatTime(entry.clock_out) : '—',
          formatDuration(entry),
          entry.clock_out ? 'Completado' : 'En curso',
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
      dateFrom: '',
      dateTo: '',
      status: 'all'
    });
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

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4 sm:p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Empleado o departamento..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input w-full"
                />
              </div>

              {/* Empleados */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Empleados
                </label>
                <select
                  multiple
                  value={filters.selectedEmployees}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    selectedEmployees: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="input w-full"
                >
                  {employees.map(emp => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.user_profiles?.full_name || 'Empleado'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Departamentos */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Departamentos
                </label>
                <select
                  multiple
                  value={filters.selectedDepartments}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    selectedDepartments: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="input w-full"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input w-full"
                >
                  <option value="all">Todos</option>
                  <option value="active">En curso</option>
                  <option value="completed">Completados</option>
                </select>
              </div>

              {/* Fechas */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="input w-full"
                />
              </div>

              {/* Botones */}
              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  onClick={clearFilters}
                  className="btn btn-secondary flex-1"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="btn btn-primary flex-1"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Entries Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="th text-left">Empleado</th>
                <th className="th text-left">Departamento</th>
                <th className="th text-left">Fecha</th>
                <th className="th text-left">Entrada</th>
                <th className="th text-left">Salida</th>
                <th className="th text-left">Duración</th>
                <th className="th text-left">Estado</th>
                <th className="th text-left">Ubicación</th>
                <th className="th text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="td text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No se encontraron fichajes</p>
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
                        {entry.user_company_roles?.departments?.name || 'Sin departamento'}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm">{formatDate(entry.entry_time)}</span>
                    </td>
                    <td className="td">
                      <span className="text-sm font-mono">
                        {formatTime(entry.clock_in || entry.entry_time)}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm font-mono">
                        {entry.clock_out ? formatTime(entry.clock_out) : '—'}
                      </span>
                    </td>
                    <td className="td">
                      <span className="text-sm font-mono">
                        {formatDuration(entry)}
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
                    {selectedEntry.user_profiles?.full_name || 'Empleado'}
                  </h4>
                  <p className="text-muted-foreground">
                    {selectedEntry.user_company_roles?.departments?.name || 'Sin departamento'}
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
                      {formatTime(selectedEntry.clock_in || selectedEntry.entry_time)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Salida
                    </label>
                    <p className="text-foreground font-mono">
                      {selectedEntry.clock_out ? formatTime(selectedEntry.clock_out) : '—'}
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
    </div>
  );
}
