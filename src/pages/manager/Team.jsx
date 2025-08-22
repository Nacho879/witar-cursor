import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Search, 
  User, 
  Clock, 
  Calendar,
  TrendingUp,
  Activity,
  Eye,
  Mail,
  Phone,
  X,
  Play,
  Pause,
  Square,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Lock
} from 'lucide-react';

export default function Team() {
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = React.useState({
    totalMembers: 0,
    presentToday: 0,
    averageHours: 0,
    totalHours: 0
  });
  const [showTimeEntriesModal, setShowTimeEntriesModal] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [employeeTimeEntries, setEmployeeTimeEntries] = React.useState([]);
  const [loadingTimeEntries, setLoadingTimeEntries] = React.useState(false);
  const [employeeLocationSettings, setEmployeeLocationSettings] = React.useState({});

  React.useEffect(() => {
    loadTeamData();
  }, [selectedDate]);

  async function loadTeamData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el ID del manager actual
      const { data: managerRole } = await supabase
        .from('user_company_roles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .eq('role', 'manager')
        .eq('is_active', true)
        .single();

      if (managerRole) {
        // Cargar configuración de ubicación de los empleados
        await loadEmployeeLocationSettings(managerRole.company_id);
        
        // Primero, obtener el departamento del manager
        const { data: managerDepartment } = await supabase
          .from('user_company_roles')
          .select('department_id')
          .eq('id', managerRole.id)
          .single();

        if (managerDepartment?.department_id) {
          // Cargar TODOS los empleados del departamento del manager
          const { data: members, error } = await supabase
            .from('user_company_roles')
            .select(`
              id,
              user_id,
              role,
              is_active,
              joined_at,
              supervisor_id,
              departments (
                name
              )
            `)
            .eq('company_id', managerRole.company_id)
            .eq('department_id', managerDepartment.department_id)
            .eq('is_active', true)
            .neq('role', 'manager') // Excluir otros managers
            .order('joined_at', { ascending: true });

          if (!error && members) {
            // Obtener los perfiles de usuario por separado
            const userIds = members.map(member => member.user_id);
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, avatar_url, phone, position')
              .in('user_id', userIds);

            if (!profilesError && profiles) {
              // Obtener los emails usando la Edge Function
              const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds }
              });
              
              // Combinar los datos
              const membersWithProfiles = members.map(member => {
                const profile = profiles.find(p => p.user_id === member.user_id);
                const emailData = emailsData?.emails?.find(e => e.user_id === member.user_id);
                
                return {
                  ...member,
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  }
                };
              });
              
              setTeamMembers(membersWithProfiles);
              await loadTeamStats(membersWithProfiles, managerRole.company_id);
            }
          }
        } else {
          // Si el manager no tiene departamento asignado, mostrar empleados con supervisor_id
          const { data: members, error } = await supabase
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
            .eq('company_id', managerRole.company_id)
            .eq('supervisor_id', managerRole.id)
            .eq('is_active', true)
            .order('joined_at', { ascending: true });

          if (!error && members) {
            // Obtener los perfiles de usuario por separado
            const userIds = members.map(member => member.user_id);
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, avatar_url, phone, position')
              .in('user_id', userIds);

            if (!profilesError && profiles) {
              // Obtener los emails usando la Edge Function
              const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds }
              });
              
              // Combinar los datos
              const membersWithProfiles = members.map(member => {
                const profile = profiles.find(p => p.user_id === member.user_id);
                const emailData = emailsData?.emails?.find(e => e.user_id === member.user_id);
                
                return {
                  ...member,
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  }
                };
              });
              
              setTeamMembers(membersWithProfiles);
              await loadTeamStats(membersWithProfiles, managerRole.company_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
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

  // Los managers no pueden modificar la configuración de GPS
  // Esta funcionalidad está restringida a owners y admins

  async function loadTeamStats(members, companyId) {
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      // Obtener fichajes del equipo para la fecha seleccionada
      const memberIds = members.map(m => m.user_id);
      
      if (memberIds.length === 0) {
        setStats({
          totalMembers: members.length,
          presentToday: 0,
          averageHours: 0,
          totalHours: 0
        });
        return;
      }

      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select('*')
        .in('user_id', memberIds)
        .gte('entry_time', startDate.toISOString())
        .lte('entry_time', endDate.toISOString())
        .order('entry_time', { ascending: true });

      if (!error && timeEntries) {
        calculateTeamStats(members, timeEntries);
      }
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  }

  function calculateTeamStats(members, timeEntries) {
    // Calcular quién está presente hoy (tiene al menos un fichaje)
    const presentToday = new Set(timeEntries.map(entry => entry.user_id)).size;
    
    // Calcular horas trabajadas por cada miembro
    let totalHours = 0;
    const memberHours = {};

    members.forEach(member => {
      const memberEntries = timeEntries.filter(entry => entry.user_id === member.user_id);
      let memberTotalMinutes = 0;
      let clockInTime = null;

      for (let i = 0; i < memberEntries.length; i++) {
        const entry = memberEntries[i];
        
        if (entry.entry_type === 'clock_in') {
          clockInTime = new Date(entry.entry_time);
        } else if (entry.entry_type === 'clock_out' && clockInTime) {
          const clockOutTime = new Date(entry.entry_time);
          const diffMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          memberTotalMinutes += diffMinutes;
          clockInTime = null;
        }
      }

      const memberHoursWorked = Math.round((memberTotalMinutes / 60) * 100) / 100;
      memberHours[member.user_id] = memberHoursWorked;
      totalHours += memberHoursWorked;
    });

    const averageHours = members.length > 0 ? Math.round((totalHours / members.length) * 100) / 100 : 0;

    setStats({
      totalMembers: members.length,
      presentToday,
      averageHours,
      totalHours: Math.round(totalHours * 100) / 100
    });
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const filteredMembers = teamMembers.filter(member => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const name = member.user_profiles?.full_name?.toLowerCase() || '';
      const position = member.user_profiles?.position?.toLowerCase() || '';
      const department = member.departments?.name?.toLowerCase() || '';
      
      return name.includes(searchLower) || 
             position.includes(searchLower) || 
             department.includes(searchLower);
    }
    return true;
  });

  // Función para obtener el icono del tipo de entrada
  function getEntryTypeIcon(entryType) {
    switch (entryType) {
      case 'clock_in':
        return Play;
      case 'clock_out':
        return Square;
      case 'break_start':
        return Pause;
      case 'break_end':
        return Play;
      default:
        return Clock;
    }
  }

  // Función para obtener el color del tipo de entrada
  function getEntryTypeColor(entryType) {
    switch (entryType) {
      case 'clock_in':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'clock_out':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'break_start':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'break_end':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  }

  // Función para obtener el texto del tipo de entrada
  function getEntryTypeText(entryType) {
    switch (entryType) {
      case 'clock_in':
        return 'Entrada';
      case 'clock_out':
        return 'Salida';
      case 'break_start':
        return 'Inicio Pausa';
      case 'break_end':
        return 'Fin Pausa';
      default:
        return 'Entrada';
    }
  }

  // Función para cargar los fichajes de un empleado
  async function loadEmployeeTimeEntries(employeeUserId, companyId) {
    try {
      setLoadingTimeEntries(true);
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', employeeUserId)
        .eq('company_id', companyId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading time entries:', error);
        setEmployeeTimeEntries([]);
      } else {
        setEmployeeTimeEntries(timeEntries || []);
      }
    } catch (error) {
      console.error('Error loading employee time entries:', error);
      setEmployeeTimeEntries([]);
    } finally {
      setLoadingTimeEntries(false);
    }
  }

  // Función para abrir el modal de fichajes
  async function openTimeEntriesModal(employee) {
    setSelectedEmployee(employee);
    setShowTimeEntriesModal(true);
    
    // Obtener el company_id del manager
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        await loadEmployeeTimeEntries(employee.user_id, userRole.company_id);
      }
    }
  }

  // Función para cerrar el modal
  function closeTimeEntriesModal() {
    setShowTimeEntriesModal(false);
    setSelectedEmployee(null);
    setEmployeeTimeEntries([]);
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
          <h1 className="text-3xl font-bold text-foreground">Mi Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y supervisa a los miembros de tu equipo
          </p>
        </div>
      </div>

      {/* Info Note */}
      <div className="card p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> La configuración de GPS solo puede ser modificada por administradores y propietarios de la empresa.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total del Equipo</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalMembers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Presentes Hoy</p>
              <p className="text-3xl font-bold text-foreground">{stats.presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
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
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Promedio</p>
              <p className="text-3xl font-bold text-foreground">{stats.averageHours}h</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar miembros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSearchTerm('')}
              className="btn btn-ghost"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Miembros del Equipo - {formatDate(selectedDate)}
          </h3>
        </div>
        <div className="p-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No hay miembros que coincidan con la búsqueda' : 'No tienes miembros en tu equipo'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <div key={member.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {member.user_profiles?.avatar_url ? (
                        <img 
                          src={member.user_profiles.avatar_url} 
                          alt={member.user_profiles.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium text-primary">
                          {member.user_profiles?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {member.user_profiles?.full_name}
                      </h4>
                      {member.user_profiles?.position && (
                        <p className="text-sm text-muted-foreground">
                          {member.user_profiles.position}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {member.departments?.name || 'Sin departamento'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">
                        Email no disponible
                      </span>
                    </div>
                    
                    {member.user_profiles?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {member.user_profiles.phone}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Ingreso: {formatDate(member.joined_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Estado: {member.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ubicación:</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        employeeLocationSettings[member.user_id]
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {employeeLocationSettings[member.user_id] ? (
                          <>
                            <ToggleRight className="w-3 h-3" />
                            Activada
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3 h-3" />
                            Desactivada
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => openTimeEntriesModal(member)}
                      className="btn btn-ghost btn-sm w-full flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Fichajes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Fichajes del Empleado */}
      {showTimeEntriesModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Fichajes de {selectedEmployee.user_profiles?.full_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={closeTimeEntriesModal}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingTimeEntries ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Cargando fichajes...</p>
                </div>
              ) : employeeTimeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay fichajes registrados hoy</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEmployee.user_profiles?.full_name} aún no ha fichado hoy
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employeeTimeEntries.map((entry, index) => {
                    const EntryTypeIcon = getEntryTypeIcon(entry.entry_type);
                    const entryColor = getEntryTypeColor(entry.entry_type);
                    const entryText = getEntryTypeText(entry.entry_type);
                    const entryTime = new Date(entry.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={entry.id} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
                        <div className={`p-2 rounded-lg ${entryColor}`}>
                          <EntryTypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{entryText}</p>
                          <p className="text-sm text-muted-foreground">
                            Registrado a las {entryTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">
                            {entryTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total de fichajes: {employeeTimeEntries.length}
                </div>
                <button
                  onClick={closeTimeEntriesModal}
                  className="btn btn-primary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
