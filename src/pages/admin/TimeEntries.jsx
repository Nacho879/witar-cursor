import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Search, 
  Calendar,
  User,
  Eye,
  TrendingUp,
  Activity,
  MapPin,
  X,
  Download,
  Filter,
  Building,
  Users
} from 'lucide-react';
import LocationMapModal from '@/components/LocationMapModal';

export default function AdminTimeEntries() {
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = React.useState('all');
  const [allEmployees, setAllEmployees] = React.useState(true);
  const [selectedRoles, setSelectedRoles] = React.useState(['employee', 'manager', 'admin']);
  const [isRoundTrip, setIsRoundTrip] = React.useState(false); // false: ida (un día), true: ida y vuelta (rango)
  const [rangeFrom, setRangeFrom] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [rangeTo, setRangeTo] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState(null);
  const [selectedLocations, setSelectedLocations] = React.useState([]);
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = React.useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = React.useState(null);
  const [employeeDetailEntries, setEmployeeDetailEntries] = React.useState([]);
  const [stats, setStats] = React.useState({
    totalEntries: 0,
    activeEmployees: 0,
    totalHours: 0,
    averageHours: 0,
    withLocation: 0,
    withoutLocation: 0
  });

  // Cargar empleados y departamentos solo una vez al montar
  React.useEffect(() => {
    loadEmployeesAndDepartments();
  }, []);

  // Cargar fichajes cuando se carguen los empleados o cambien los filtros relevantes
  React.useEffect(() => {
    // Solo cargar si ya tenemos empleados cargados
    if (employees.length > 0) {
      loadTimeEntriesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, rangeFrom, rangeTo, isRoundTrip, selectedRoles, employees.length]);

  // Memoizar el handler de roles para evitar re-renders innecesarios
  const handleRoleChange = React.useCallback((role, checked) => {
    setSelectedRoles(prev => {
      if (checked) {
        return Array.from(new Set([...prev, role]));
      } else {
        return prev.filter(r => r !== role);
      }
    });
  }, []);

  // Sincroniza el estado del toggle con el valor del empleado seleccionado
  React.useEffect(() => {
    if (allEmployees && selectedEmployee !== 'all') {
      setSelectedEmployee('all');
    }
  }, [allEmployees]);

  // Suscripción en tiempo real para fichajes
  React.useEffect(() => {
    let subscription;

    async function setupRealtimeSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Suscribirse a cambios en time_entries de la empresa
      subscription = supabase
        .channel('time_entries_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_entries'
          },
          (payload) => {
            // Verificar si el cambio es de la empresa actual
            if (payload.new && payload.new.company_id === userRole.company_id) {
  
              // Recargar datos cuando hay cambios
              loadTimeEntriesData();
            }
          }
        )
        .subscribe();

      return () => {
        if (subscription) {
          supabase.removeChannel(subscription);
        }
      };
    }

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  async function loadEmployeesAndDepartments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Cargar departamentos
      const { data: deps, error: depsError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', userRole.company_id)
        .order('name');

      if (!depsError && deps) {
        setDepartments(deps);
      }

      // Cargar empleados
      const { data: users, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id, role, department_id')
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .in('role', ['employee', 'manager', 'admin']);

      if (!usersError && users) {
        const userIds = users.map(u => u.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          const employeesWithProfiles = users.map(user => {
            const profile = profiles.find(p => p.user_id === user.user_id);
            const department = deps?.find(d => d.id === user.department_id);
            return {
              id: user.user_id,
              name: profile?.full_name || 'Usuario sin nombre',
              avatar_url: profile?.avatar_url,
              role: user.role,
              department: department?.name || 'Sin departamento',
              department_id: user.department_id
            };
          });
          setEmployees(employeesWithProfiles);
        }
      }
    } catch (error) {
      console.error('Error loading employees and departments:', error);
    }
  }

  async function loadTimeEntriesData() {
    try {
      // Solo mostrar loading en la primera carga, no en cada cambio de filtro
      if (timeEntries.length === 0) {
      setLoading(true);
      } else {
        setUpdating(true);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setUpdating(false);
        return;
      }

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) {
        setLoading(false);
        setUpdating(false);
        return;
      }

      // Usar los empleados ya cargados en lugar de recargarlos cada vez
      if (employees.length === 0) {
        // Si no hay empleados cargados aún, esperar
        setLoading(false);
        setUpdating(false);
        return;
      }

      // Obtener IDs de empleados basados en los roles seleccionados
      let filteredUserIds = employees
        .filter(emp => {
          // Filtrar por roles seleccionados
      if (Array.isArray(selectedRoles) && selectedRoles.length > 0 && selectedRoles.length < 3) {
            return selectedRoles.includes(emp.role);
      }
          return true;
        })
        .map(emp => emp.id);

      if (filteredUserIds.length > 0) {
        // Cargar fichajes según modo
        let startDate;
        let endDate;
        if (!isRoundTrip) {
          // Ida: un solo día
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Ida y vuelta: rango
          startDate = new Date(rangeFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(rangeTo);
          endDate.setHours(23, 59, 59, 999);
        }

        const { data: entries, error } = await supabase
          .from('time_entries')
          .select('*')
          .in('user_id', filteredUserIds)
          .gte('entry_time', startDate.toISOString())
          .lte('entry_time', endDate.toISOString())
          .order('entry_time', { ascending: true });

        if (!error && entries) {
          // Usar los perfiles ya cargados en employees en lugar de recargarlos
            const entriesWithProfiles = entries.map(entry => {
              const employee = employees.find(e => e.id === entry.user_id);
              return {
                ...entry,
              user_profiles: employee ? {
                user_id: employee.id,
                full_name: employee.name,
                avatar_url: employee.avatar_url
              } : null,
                employee_info: employee || null
              };
            });

            setTimeEntries(entriesWithProfiles);
            calculateStats(entriesWithProfiles);
        } else if (error) {
          console.error('Error loading time entries:', error);
        }
      } else {
        setTimeEntries([]);
        setStats({
          totalEntries: 0,
          activeEmployees: 0,
          totalHours: 0,
          averageHours: 0,
          withLocation: 0,
          withoutLocation: 0
        });
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }

  function calculateStats(entries) {
    const uniqueUsers = new Set(entries.map(entry => entry.user_id));
    const activeEmployees = uniqueUsers.size;
    
    // Calcular horas totales considerando pausas
    let totalHours = 0;
    const dailyEntries = {};
    
    // Agrupar fichajes por usuario y día
    entries.forEach(entry => {
      const dateKey = new Date(entry.entry_time).toDateString();
      const userDateKey = `${entry.user_id}_${dateKey}`;
      if (!dailyEntries[userDateKey]) {
        dailyEntries[userDateKey] = [];
      }
      dailyEntries[userDateKey].push(entry);
    });

    // Calcular horas trabajadas por usuario y día
    Object.values(dailyEntries).forEach(dayEntries => {
      const sortedEntries = dayEntries.sort((a, b) => 
        new Date(a.entry_time) - new Date(b.entry_time)
      );
      
      let totalMinutes = 0;
      let clockInTime = null;
      let breakStartTime = null;
      let totalBreakMinutes = 0;
      
      // Procesar fichajes en orden cronológico
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        
        if (entry.entry_type === 'clock_in') {
          clockInTime = new Date(entry.entry_time);
        } else if (entry.entry_type === 'clock_out' && clockInTime) {
          const clockOutTime = new Date(entry.entry_time);
          const diffMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          totalMinutes += diffMinutes;
          clockInTime = null;
        } else if (entry.entry_type === 'break_start') {
          breakStartTime = new Date(entry.entry_time);
        } else if (entry.entry_type === 'break_end' && breakStartTime) {
          const breakEndTime = new Date(entry.entry_time);
          const breakMinutes = (breakEndTime - breakStartTime) / (1000 * 60);
          totalBreakMinutes += breakMinutes;
          breakStartTime = null;
        }
      }
      
      // Restar tiempo de pausas del total
      totalMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
      totalHours += totalMinutes / 60;
    });

    // Calcular estadísticas de ubicación (usar location_lat y location_lng)
    const withLocation = entries.filter(entry => 
      entry.location_lat && entry.location_lng
    ).length;
    const withoutLocation = entries.length - withLocation;

    setStats({
      totalEntries: entries.length,
      activeEmployees,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: activeEmployees > 0 ? Math.round((totalHours / activeEmployees) * 100) / 100 : 0,
      withLocation,
      withoutLocation
    });
  }

  function getEmployeeStatus(employeeId) {
    // Obtener fichajes según el modo (día único o rango)
    let employeeEntries;
    if (!isRoundTrip) {
      // Modo día único: filtrar por selectedDate
      employeeEntries = timeEntries.filter(entry => 
      entry.user_id === employeeId && 
      new Date(entry.entry_time).toDateString() === new Date(selectedDate).toDateString()
    );
    } else {
      // Modo rango: filtrar por rango de fechas
      const startDate = new Date(rangeFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(rangeTo);
      endDate.setHours(23, 59, 59, 999);
      
      employeeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.entry_time);
        return entry.user_id === employeeId && 
               entryDate >= startDate && 
               entryDate <= endDate;
      });
    }

    if (employeeEntries.length === 0) return 'No registrado';
    
    // Obtener el último fichaje del rango
    const lastEntry = employeeEntries.sort((a, b) => 
      new Date(b.entry_time) - new Date(a.entry_time)
    )[0];
    
    if (lastEntry.entry_type === 'clock_in') return 'Trabajando';
    if (lastEntry.entry_type === 'clock_out') return 'Finalizado';
    if (lastEntry.entry_type === 'break_start') return 'En pausa';
    if (lastEntry.entry_type === 'break_end') return 'Trabajando';
    
    return 'Desconocido';
  }

  function getStatusColor(status) {
    switch (status) {
      case 'Trabajando': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'En pausa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Finalizado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'No registrado': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  function getLocationInfo(employeeId) {
    // Obtener fichajes según el modo (día único o rango)
    let employeeEntries;
    if (!isRoundTrip) {
      // Modo día único: filtrar por selectedDate
      employeeEntries = timeEntries.filter(entry => 
      entry.user_id === employeeId && 
      new Date(entry.entry_time).toDateString() === new Date(selectedDate).toDateString()
    );
    } else {
      // Modo rango: filtrar por rango de fechas
      const startDate = new Date(rangeFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(rangeTo);
      endDate.setHours(23, 59, 59, 999);
      
      employeeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.entry_time);
        return entry.user_id === employeeId && 
               entryDate >= startDate && 
               entryDate <= endDate;
      });
    }

    if (employeeEntries.length === 0) return null;
    
    // Buscar el último fichaje con ubicación
    const entriesWithLocation = employeeEntries.filter(entry => 
      entry.location_lat && entry.location_lng
    );
    if (entriesWithLocation.length === 0) return null;
    
    const lastEntryWithLocation = entriesWithLocation.sort((a, b) => 
      new Date(b.entry_time) - new Date(a.entry_time)
    )[0];
    
    return {
      lat: lastEntryWithLocation.location_lat,
      lng: lastEntryWithLocation.location_lng,
      accuracy: lastEntryWithLocation.location_accuracy,
      timestamp: lastEntryWithLocation.entry_time
    };
  }

  function showLocationModal(locationData) {
    setSelectedLocation(locationData);
    setIsLocationModalOpen(true);
  }

  function exportToCSV() {
    const headers = ['Empleado', 'Departamento', 'Rol', 'Fecha', 'Hora', 'Tipo', 'Estado'];
    const csvData = timeEntries.map(entry => [
      entry.user_profiles?.full_name || 'Sin nombre',
      entry.employee_info?.department || 'Sin departamento',
      entry.employee_info?.role || 'Sin rol',
      new Date(entry.entry_time).toLocaleDateString('es-ES'),
      new Date(entry.entry_time).toLocaleTimeString('es-ES'),
      entry.entry_type,
      getEmployeeStatus(entry.user_id)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileTag = !isRoundTrip
      ? new Date(selectedDate).toISOString().split('T')[0]
      : `${rangeFrom}_${rangeTo}`;
    link.setAttribute('download', `fichajes_${fileTag}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(employee.role);
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
                  </div>
      </div>

      {/* Location Modal */}
      {isLocationModalOpen && selectedLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Detalles de Ubicación</h3>
              <button
                onClick={() => {
                  setIsLocationModalOpen(false);
                  setSelectedLocation(null);
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Coordenadas
                  </label>
                  <div className="bg-secondary p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>Latitud:</strong> {selectedLocation.latitude}
                    </p>
                    <p className="text-sm">
                      <strong>Longitud:</strong> {selectedLocation.longitude}
                    </p>
                  </div>
                </div>
                
                {selectedLocation.address && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Dirección
                    </label>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-sm">{selectedLocation.address}</p>
                    </div>
                  </div>
                )}

                {selectedLocation.accuracy && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Precisión
                    </label>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-sm">
                        <strong>Precisión:</strong> {selectedLocation.accuracy} metros
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Enlace a Google Maps
                  </label>
                  <a
                    href={`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Ver en Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Control de Horario</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona y supervisa los fichajes de toda la empresa
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Fichajes</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalEntries}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empleados Activos</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Promedio por Empleado</p>
              <p className="text-3xl font-bold text-foreground">{stats.averageHours}h</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Con Ubicación</p>
              <p className="text-3xl font-bold text-foreground">{stats.withLocation}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>
          
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Empleados</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-600 cursor-pointer"
                checked={allEmployees}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAllEmployees(e.target.checked);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
              Todos los empleados
            </label>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Roles</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600 cursor-pointer"
                  checked={selectedRoles.includes('employee')}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRoleChange('employee', e.target.checked);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                Empleado
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600 cursor-pointer"
                  checked={selectedRoles.includes('manager')}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRoleChange('manager', e.target.checked);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                Manager
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600 cursor-pointer"
                  checked={selectedRoles.includes('admin')}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRoleChange('admin', e.target.checked);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                Administrador
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="mode-ida"
                  type="radio"
                  name="flight-mode"
                  className="accent-blue-600"
                  checked={!isRoundTrip}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsRoundTrip(false);
                  }}
                />
                <label htmlFor="mode-ida" className="text-sm cursor-pointer">Día</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="mode-ida-vuelta"
                  type="radio"
                  name="flight-mode"
                  className="accent-blue-600"
                  checked={isRoundTrip}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsRoundTrip(true);
                  }}
                />
                <label htmlFor="mode-ida-vuelta" className="text-sm cursor-pointer">Rango</label>
              </div>
            </div>
            {!isRoundTrip ? (
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

      {/* Employees Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Estado de Empleados - {!isRoundTrip
              ? new Date(selectedDate).toLocaleDateString('es-ES')
              : `${rangeFrom} a ${rangeTo}`}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">Empleado</th>
                <th className="th">Departamento</th>
                <th className="th">Rol</th>
                {isRoundTrip && <th className="th">Fecha</th>}
                <th className="th">Entrada</th>
                <th className="th">Pausa</th>
                <th className="th">Salida</th>
                <th className="th">Estado</th>
                <th className="th">Ubicación</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isRoundTrip ? 10 : 9} className="td text-center text-muted-foreground">
                    No hay empleados para mostrar
                  </td>
                </tr>
              ) : (
                (() => {
                  // Si es modo rango, mostrar una fila por cada día con fichajes
                  if (isRoundTrip) {
                    const rows = [];
                    
                    filteredEmployees.forEach(employee => {
                      // Obtener todos los fichajes del empleado en el rango
                      const startDate = new Date(rangeFrom);
                      startDate.setHours(0, 0, 0, 0);
                      const endDate = new Date(rangeTo);
                      endDate.setHours(23, 59, 59, 999);
                      
                      const employeeEntries = timeEntries.filter(entry => {
                        const entryDate = new Date(entry.entry_time);
                        return entry.user_id === employee.id && 
                               entryDate >= startDate && 
                               entryDate <= endDate;
                      });
                      
                      // Agrupar fichajes por día
                      const entriesByDay = {};
                      employeeEntries.forEach(entry => {
                        const dateKey = new Date(entry.entry_time).toISOString().split('T')[0];
                        if (!entriesByDay[dateKey]) {
                          entriesByDay[dateKey] = [];
                        }
                        entriesByDay[dateKey].push(entry);
                      });
                      
                      // Ordenar días cronológicamente
                      const sortedDays = Object.entries(entriesByDay).sort(([dateA], [dateB]) => {
                        return new Date(dateA) - new Date(dateB);
                      });
                      
                      // Si no hay fichajes, mostrar una fila indicando que no hay fichajes
                      if (sortedDays.length === 0) {
                        rows.push(
                          <tr key={employee.id}>
                            <td className="td">
                              <div className="flex items-center gap-3">
                                {employee.avatar_url ? (
                                  <img 
                                    src={employee.avatar_url} 
                                    alt={employee.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                                <span className="font-medium">{employee.name}</span>
                              </div>
                            </td>
                            <td className="td">{employee.department}</td>
                            <td className="td capitalize">{employee.role}</td>
                            <td className="td text-muted-foreground">-</td>
                            <td className="td text-muted-foreground">-</td>
                            <td className="td text-muted-foreground">-</td>
                            <td className="td text-muted-foreground">-</td>
                            <td className="td">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('No registrado')}`}>
                                No registrado
                              </span>
                            </td>
                            <td className="td">
                              <span className="text-muted-foreground text-sm">Sin ubicación</span>
                            </td>
                            <td className="td">
                              <button
                                onClick={() => {
                                  setEmployeeDetailEntries([]);
                                  setSelectedEmployeeForDetail(employee);
                                  setShowEmployeeDetailModal(true);
                                }}
                                className="btn btn-ghost btn-sm"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        // Crear una fila por cada día con fichajes
                        sortedDays.forEach(([dateKey, dayEntries]) => {
                          const sortedDayEntries = dayEntries.sort((a, b) => 
                            new Date(a.entry_time) - new Date(b.entry_time)
                          );
                          const lastEntry = sortedDayEntries[sortedDayEntries.length - 1];
                          
                          // Separar fichajes por tipo
                          const entrada = sortedDayEntries.find(e => e.entry_type === 'clock_in');
                          const salida = sortedDayEntries.find(e => e.entry_type === 'clock_out');
                          const pausas = sortedDayEntries.filter(e => 
                            e.entry_type === 'break_start' || e.entry_type === 'break_end'
                          );
                          
                          // Determinar estado del día
                          let dayStatus = 'No registrado';
                          if (lastEntry) {
                            if (lastEntry.entry_type === 'clock_in') dayStatus = 'Trabajando';
                            else if (lastEntry.entry_type === 'clock_out') dayStatus = 'Finalizado';
                            else if (lastEntry.entry_type === 'break_start') dayStatus = 'En pausa';
                            else if (lastEntry.entry_type === 'break_end') dayStatus = 'Trabajando';
                          }
                          
                          // Buscar todas las ubicaciones del día
                          const entriesWithLocation = dayEntries.filter(entry => 
                            entry.location_lat && entry.location_lng
                          );
                          const locationsArray = entriesWithLocation
                            .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time))
                            .map(entry => ({
                              lat: entry.location_lat,
                              lng: entry.location_lng,
                              accuracy: entry.location_accuracy,
                              timestamp: entry.entry_time,
                              entryType: entry.entry_type
                            }));
                          
                          rows.push(
                            <tr key={`${employee.id}-${dateKey}`}>
                              <td className="td">
                                <div className="flex items-center gap-3">
                                  {employee.avatar_url ? (
                                    <img 
                                      src={employee.avatar_url} 
                                      alt={employee.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                  )}
                                  <span className="font-medium">{employee.name}</span>
                                </div>
                              </td>
                              <td className="td">{employee.department}</td>
                              <td className="td capitalize">{employee.role}</td>
                              <td className="td">
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {new Date(dateKey).toLocaleDateString('es-ES', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </td>
                              <td className="td">
                                {entrada ? (
                                  <div className="text-sm">
                                    <div className="font-medium text-green-600 dark:text-green-400">
                                      {new Date(entrada.entry_time).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="td">
                                {pausas.length > 0 ? (
                                  <div className="space-y-1">
                                    {pausas.map((pausa, idx) => (
                                      <div key={pausa.id || idx} className="text-sm">
                                        <div className={`font-medium ${
                                          pausa.entry_type === 'break_start' 
                                            ? 'text-yellow-600 dark:text-yellow-400' 
                                            : 'text-blue-600 dark:text-blue-400'
                                        }`}>
                                          {new Date(pausa.entry_time).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                          {pausa.entry_type === 'break_start' ? 'Inicio' : 'Fin'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="td">
                                {salida ? (
                                  <div className="text-sm">
                                    <div className="font-medium text-red-600 dark:text-red-400">
                                      {new Date(salida.entry_time).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="td">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dayStatus)}`}>
                                  {dayStatus}
                                </span>
                              </td>
                              <td className="td">
                                {locationsArray.length > 0 ? (
                                  <button
                                    onClick={() => {
                                      setSelectedLocations(locationsArray);
                                      setSelectedLocation(locationsArray[0]);
                                      setIsLocationModalOpen(true);
                                    }}
                                    className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-700"
                                    title={`Ver ${locationsArray.length} ubicación${locationsArray.length !== 1 ? 'es' : ''}`}
                                  >
                                    <MapPin className="w-4 h-4" />
                                    {locationsArray.length > 1 && (
                                      <span className="ml-1 text-xs">{locationsArray.length}</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Sin ubicación</span>
                                )}
                              </td>
                              <td className="td">
                                <button
                                  onClick={() => {
                                    // Obtener todos los fichajes del empleado en el rango completo
                                    const startDate = new Date(rangeFrom);
                                    startDate.setHours(0, 0, 0, 0);
                                    const endDate = new Date(rangeTo);
                                    endDate.setHours(23, 59, 59, 999);
                                    
                                    const allEmployeeEntries = timeEntries.filter(entry => {
                                      const entryDate = new Date(entry.entry_time);
                                      return entry.user_id === employee.id && 
                                             entryDate >= startDate && 
                                             entryDate <= endDate;
                                    });
                                    
                                    setEmployeeDetailEntries(allEmployeeEntries.sort((a, b) => 
                                      new Date(a.entry_time) - new Date(b.entry_time)
                                    ));
                                    setSelectedEmployeeForDetail(employee);
                                    setShowEmployeeDetailModal(true);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  title="Ver detalle"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      }
                    });
                    
                    return rows;
                  } else {
                    // Modo día único: mostrar una fila por empleado
                    return filteredEmployees.map(employee => {
                  const status = getEmployeeStatus(employee.id);
                      
                      // Obtener fichajes del día
                      const employeeEntries = timeEntries.filter(entry => 
                    entry.user_id === employee.id && 
                    new Date(entry.entry_time).toDateString() === new Date(selectedDate).toDateString()
                  );
                      
                      const sortedEntries = employeeEntries.sort((a, b) => 
                        new Date(a.entry_time) - new Date(b.entry_time)
                      );
                      
                      // Separar fichajes por tipo
                      const entrada = sortedEntries.find(e => e.entry_type === 'clock_in');
                      const salida = sortedEntries.find(e => e.entry_type === 'clock_out');
                      const pausas = sortedEntries.filter(e => 
                        e.entry_type === 'break_start' || e.entry_type === 'break_end'
                      );

                  return (
                    <tr key={employee.id}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {employee.avatar_url ? (
                            <img 
                              src={employee.avatar_url} 
                              alt={employee.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </td>
                      <td className="td">{employee.department}</td>
                      <td className="td capitalize">{employee.role}</td>
                      <td className="td">
                            {entrada ? (
                              <div className="text-sm">
                                <div className="font-medium text-green-600 dark:text-green-400">
                                  {new Date(entrada.entry_time).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                      </td>
                      <td className="td">
                            {pausas.length > 0 ? (
                              <div className="space-y-1">
                                {pausas.map((pausa, idx) => (
                                  <div key={pausa.id || idx} className="text-sm">
                                    <div className={`font-medium ${
                                      pausa.entry_type === 'break_start' 
                                        ? 'text-yellow-600 dark:text-yellow-400' 
                                        : 'text-blue-600 dark:text-blue-400'
                                    }`}>
                                      {new Date(pausa.entry_time).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                                    <div className="text-muted-foreground text-xs">
                                      {pausa.entry_type === 'break_start' ? 'Inicio' : 'Fin'}
                            </div>
                                  </div>
                                ))}
                          </div>
                        ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                          <td className="td">
                            {salida ? (
                              <div className="text-sm">
                                <div className="font-medium text-red-600 dark:text-red-400">
                                  {new Date(salida.entry_time).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="td">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                              {status}
                            </span>
                      </td>
                      <td className="td">
                        {(() => {
                              // Obtener todas las ubicaciones del día
                              const entriesWithLocation = employeeEntries.filter(entry => 
                                entry.location_lat && entry.location_lng
                              );
                              const locationsArray = entriesWithLocation
                                .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time))
                                .map(entry => ({
                                  lat: entry.location_lat,
                                  lng: entry.location_lng,
                                  accuracy: entry.location_accuracy,
                                  timestamp: entry.entry_time,
                                  entryType: entry.entry_type
                                }));
                              
                              if (locationsArray.length === 0) {
                            return (
                              <span className="text-muted-foreground text-sm">
                                Sin ubicación
                              </span>
                            );
                          }
                              
                          return (
                            <button
                                  onClick={() => {
                                    setSelectedLocations(locationsArray);
                                    setSelectedLocation(locationsArray[0]);
                                    setIsLocationModalOpen(true);
                                  }}
                              className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-700"
                                  title={`Ver ${locationsArray.length} ubicación${locationsArray.length !== 1 ? 'es' : ''}`}
                            >
                              <MapPin className="w-4 h-4" />
                                  {locationsArray.length > 1 && (
                                    <span className="ml-1 text-xs">{locationsArray.length}</span>
                                  )}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="td">
                        <button
                          onClick={() => {
                                setEmployeeDetailEntries(sortedEntries);
                                setSelectedEmployeeForDetail(employee);
                                setShowEmployeeDetailModal(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                    });
                  }
                })()
              )}
            </tbody>
          </table>
        </div>
      
      </div>

      {/* Location Modal unificado */}
      <LocationMapModal
        isOpen={isLocationModalOpen && (!!selectedLocation || selectedLocations.length > 0)}
        onClose={() => { 
          setIsLocationModalOpen(false); 
          setSelectedLocation(null);
          setSelectedLocations([]);
        }}
        location={selectedLocation}
        locations={selectedLocations.length > 0 ? selectedLocations : null}
      />

      {/* Modal de Detalle de Fichajes del Empleado */}
      {showEmployeeDetailModal && selectedEmployeeForDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Fichajes de {selectedEmployeeForDetail.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {!isRoundTrip
                    ? new Date(selectedDate).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : `${new Date(rangeFrom).toLocaleDateString('es-ES')} a ${new Date(rangeTo).toLocaleDateString('es-ES')}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {employeeDetailEntries.length} fichaje{employeeDetailEntries.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeDetailModal(false);
                  setSelectedEmployeeForDetail(null);
                  setEmployeeDetailEntries([]);
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {employeeDetailEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay fichajes en este período</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Agrupar fichajes por día y ordenar cronológicamente */}
                  {(() => {
                    const entriesByDay = {};
                    employeeDetailEntries.forEach(entry => {
                      // Usar fecha ISO como clave para ordenar correctamente
                      const entryDate = new Date(entry.entry_time);
                      const dateKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
                      const dateLabel = entryDate.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      
                      if (!entriesByDay[dateKey]) {
                        entriesByDay[dateKey] = {
                          label: dateLabel,
                          entries: []
                        };
                      }
                      entriesByDay[dateKey].entries.push(entry);
                    });

                    // Ordenar los días cronológicamente (de más antiguo a más reciente)
                    const sortedDays = Object.entries(entriesByDay).sort(([dateA], [dateB]) => {
                      return new Date(dateA) - new Date(dateB);
                    });

                    return sortedDays.map(([dateKey, { label, entries }]) => {
                      // Ordenar fichajes del día por hora (de más antiguo a más reciente)
                      const sortedEntries = entries.sort((a, b) => 
                        new Date(a.entry_time) - new Date(b.entry_time)
                      );

                      return (
                        <div key={dateKey} className="border border-border rounded-lg p-4 bg-card">
                          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 pb-2 border-b border-border">
                            <Calendar className="w-4 h-4" />
                            {label}
                            <span className="ml-auto text-sm font-normal text-muted-foreground">
                              {sortedEntries.length} fichaje{sortedEntries.length !== 1 ? 's' : ''}
                            </span>
                          </h4>
                          <div className="space-y-2">
                            {sortedEntries.map((entry, index) => (
                              <div
                                key={entry.id || index}
                                className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                    entry.entry_type === 'clock_in' ? 'bg-green-500' :
                                    entry.entry_type === 'clock_out' ? 'bg-red-500' :
                                    entry.entry_type === 'break_start' ? 'bg-yellow-500' :
                                    'bg-blue-500'
                                  }`} />
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground capitalize">
                                      {entry.entry_type.replace('_', ' ')}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(entry.entry_time).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </div>
                                {entry.location_lat && entry.location_lng && (
                                  <button
                                    onClick={() => showLocationModal({
                                      lat: entry.location_lat,
                                      lng: entry.location_lng,
                                      accuracy: entry.location_accuracy,
                                      timestamp: entry.entry_time
                                    })}
                                    className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-700 flex-shrink-0"
                                    title="Ver ubicación"
                                  >
                                    <MapPin className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 