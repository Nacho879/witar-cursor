import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Calendar, 
  FileText, 
  User,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  LogIn,
  LogOut,
  Coffee,
  AlertCircle
} from 'lucide-react';
import TimeClock from '@/components/TimeClock';

// Funciones de utilidad fuera del componente
function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100';
    case 'approved': return 'text-green-600 bg-green-100';
    case 'rejected': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending': return Activity;
    case 'approved': return CheckCircle;
    case 'rejected': return XCircle;
    default: return Activity;
  }
}

function getRequestTypeDisplay(type, requestType = 'normal') {
  if (requestType === 'time_edit') {
    switch (type) {
      case 'edit_time': return 'Editar Fecha/Hora';
      case 'edit_type': return 'Editar Tipo';
      case 'delete_entry': return 'Eliminar Fichaje';
      case 'add_entry': return 'Agregar Fichaje';
      default: return 'Edición de Fichaje';
    }
  } else {
    switch (type) {
      case 'vacation': return 'Vacaciones';
      case 'sick_leave': return 'Baja por enfermedad';
      case 'permission': return 'Permiso';
      case 'other': return 'Otro';
      default: return type;
    }
  }
}

export default function EmployeeDashboard() {
  const [userProfile, setUserProfile] = React.useState(null);
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [managerInfo, setManagerInfo] = React.useState(null);
  const [stats, setStats] = React.useState({
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    approvedNormalRequests: 0,
    approvedTimeEditRequests: 0
  });
  const [recentRequests, setRecentRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [subscription, setSubscription] = React.useState(null);

  function handleTimeEntry(newEntry) {
    // Recargar los datos del dashboard cuando se crea un nuevo fichaje
    loadDashboardData();
  }

  React.useEffect(() => {
    loadDashboardData();
    // Actualizar la hora cada minuto
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Configurar suscripciones en tiempo real
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Suscripción para time_entries
      const timeEntriesSubscription = supabase
        .channel('time_entries_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'time_entries',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
    
            loadDashboardData();
          }
        )
        .subscribe();

      // Suscripción para requests
      const requestsSubscription = supabase
        .channel('requests_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'requests',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      // Suscripción para time_entry_edit_requests
      const timeEditRequestsSubscription = supabase
        .channel('time_edit_requests_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'time_entry_edit_requests',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      setSubscription({
        timeEntries: timeEntriesSubscription,
        requests: requestsSubscription,
        timeEditRequests: timeEditRequestsSubscription
      });
    };

    setupRealtimeSubscriptions();

    return () => {
      clearInterval(interval);
      // Limpiar suscripciones si existen
      if (subscription) {
        if (subscription.timeEntries) {
          supabase.removeChannel(subscription.timeEntries);
        }
        if (subscription.requests) {
          supabase.removeChannel(subscription.requests);
        }
        if (subscription.timeEditRequests) {
          supabase.removeChannel(subscription.timeEditRequests);
        }
      }
    };
  }, []); // Removido subscription de las dependencias

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Limpiar suscripción anterior si existe
        if (subscription) {
          supabase.removeChannel(subscription);
        }

        // Configurar suscripción en tiempo real para actualizar cuando cambien las solicitudes
        const requestsSubscription = supabase
          .channel('requests-changes')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'requests',
              filter: `user_id=eq.${user.id}`
            }, 
            () => {
              // Solo recargar estadísticas, no todo el dashboard
              loadUserStats(user.id);
              loadRecentRequests(user.id);
            }
          )
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'time_entry_edit_requests',
              filter: `user_id=eq.${user.id}`
            }, 
            () => {
              // Solo recargar estadísticas, no todo el dashboard
              loadUserStats(user.id);
              loadRecentRequests(user.id);
            }
          )
          .subscribe();

        // Guardar referencia de la suscripción
        setSubscription(requestsSubscription);

        // Cargar perfil del usuario
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }

        // Cargar información del rol del usuario en la empresa
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select(`
            *,
            companies (
              id,
              name,
              description,
              address,
              phone,
              email,
              website,
              logo_url
            ),
            departments (
              id,
              name,
              description
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyInfo(userRole.companies);

          // Cargar información del manager solo si no se ha cargado antes
          if (!managerInfo) {
            await loadManagerInfo(userRole);
          }
        }

        // Cargar estadísticas y otros datos...
        await Promise.all([
          loadUserStats(user.id),
          loadRecentRequests(user.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async function loadUserStats(userId) {
    try {
      // Obtener todos los fichajes del usuario
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('entry_time, entry_type')
        .eq('user_id', userId)
        .order('entry_time', { ascending: true });

      if (timeEntriesError) {
        console.error('Error loading time entries:', timeEntriesError);
        return;
      }

      // Calcular horas de esta semana
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
      endOfWeek.setHours(23, 59, 59, 999);

      // Calcular horas de este mes
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      let hoursThisWeek = 0;
      let hoursThisMonth = 0;

      if (timeEntries && timeEntries.length > 0) {
        // Agrupar fichajes por día
        const entriesByDay = {};
        timeEntries.forEach(entry => {
          const entryDate = new Date(entry.entry_time);
          const dayKey = entryDate.toDateString();
          
          if (!entriesByDay[dayKey]) {
            entriesByDay[dayKey] = [];
          }
          entriesByDay[dayKey].push(entry);
        });

        // Calcular horas para cada día
        Object.keys(entriesByDay).forEach(dayKey => {
          const dayEntries = entriesByDay[dayKey];
          const dayDate = new Date(dayKey);
          
          // Ordenar fichajes del día por hora
          dayEntries.sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
          
          let dayHours = 0;
          let clockInTime = null;
          let breakStartTime = null;
          let breakEndTime = null;

          dayEntries.forEach(entry => {
            const entryTime = new Date(entry.entry_time);
            
            switch (entry.entry_type) {
              case 'clock_in':
                clockInTime = entryTime;
                break;
              case 'clock_out':
                if (clockInTime) {
                  let workTime = (entryTime - clockInTime) / (1000 * 60 * 60); // horas
                  
                  // Restar tiempo de descanso si existe
                  if (breakStartTime && breakEndTime) {
                    const breakTime = (breakEndTime - breakStartTime) / (1000 * 60 * 60);
                    workTime -= breakTime;
                  }
                  
                  dayHours += workTime;
                  clockInTime = null;
                  breakStartTime = null;
                  breakEndTime = null;
                }
                break;
              case 'break_start':
                breakStartTime = entryTime;
                break;
              case 'break_end':
                breakEndTime = entryTime;
                break;
            }
          });

          // Verificar si es de esta semana
          if (dayDate >= startOfWeek && dayDate <= endOfWeek) {
            hoursThisWeek += dayHours;
          }

          // Verificar si es de este mes
          if (dayDate >= startOfMonth && dayDate <= endOfMonth) {
            hoursThisMonth += dayHours;
          }
        });
      }

      // Solicitudes normales pendientes
      const { count: pendingNormalRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      // Solicitudes normales aprobadas
      const { count: approvedNormalRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved');

      // Solicitudes de edición de fichajes pendientes
      const { count: pendingTimeEditRequests } = await supabase
        .from('time_entry_edit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      // Solicitudes de edición de fichajes aprobadas
      const { count: approvedTimeEditRequests } = await supabase
        .from('time_entry_edit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved');

      setStats({
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10, // Redondear a 1 decimal
        hoursThisMonth: Math.round(hoursThisMonth * 10) / 10, // Redondear a 1 decimal
        pendingRequests: (pendingNormalRequests || 0) + (pendingTimeEditRequests || 0),
        approvedRequests: (approvedNormalRequests || 0) + (approvedTimeEditRequests || 0),
        approvedNormalRequests: approvedNormalRequests || 0,
        approvedTimeEditRequests: approvedTimeEditRequests || 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async function loadRecentRequests(userId) {
    try {
      // Cargar solicitudes normales
      const { data: normalRequests, error: normalError } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Cargar solicitudes de edición de fichajes
      const { data: timeEditRequests, error: timeEditError } = await supabase
        .from('time_entry_edit_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!normalError && !timeEditError) {
        // Combinar ambas listas y agregar tipo de solicitud
        const combinedRequests = [
          ...(normalRequests || []).map(req => ({ ...req, request_type: 'normal' })),
          ...(timeEditRequests || []).map(req => ({ ...req, request_type: 'time_edit' }))
        ];

        // Ordenar por fecha de creación (más recientes primero)
        combinedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Tomar solo los 5 más recientes
        setRecentRequests(combinedRequests.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading recent requests:', error);
    }
  }

  async function loadManagerInfo(userRole) {
    try {
      let managerId = null;
      
      // Primero intentar obtener el manager del departamento
      if (userRole.department_id) {
        const { data: department, error: deptError } = await supabase
          .from('departments')
          .select('manager_id')
          .eq('id', userRole.department_id)
          .maybeSingle();
        
        if (!deptError && department && department.manager_id) {
          managerId = department.manager_id;
        }
      }
      
      // Si no hay manager de departamento, usar supervisor directo
      if (!managerId && userRole.supervisor_id) {
        const { data: managerRole, error: mgrError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('id', userRole.supervisor_id)
          .eq('is_active', true)
          .maybeSingle();

        if (!mgrError && managerRole) {
          managerId = managerRole.user_id;
        }
      }

      // Cargar perfil del manager si se encontró
      if (managerId) {
        // Primero obtener el user_id del manager desde user_company_roles
        const { data: managerUserRole, error: roleError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('id', managerId)
          .eq('is_active', true)
          .maybeSingle();

        if (!roleError && managerUserRole && managerUserRole.user_id) {
          // Ahora obtener el perfil del manager usando el user_id
          const { data: managerProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', managerUserRole.user_id)
            .maybeSingle();

          if (!profileError && managerProfile) {
            // Obtener el email del manager usando la Edge Function
            try {
              const { data: emails, error: emailError } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds: [managerUserRole.user_id] }
              });

              const managerEmail = emails?.emails && emails.emails.length > 0 ? emails.emails[0].email : null;

              setManagerInfo({
                ...managerProfile,
                role_id: managerUserRole.user_id,
                email: managerEmail
              });
            } catch (emailError) {
              console.error('Error getting manager email:', emailError);
              setManagerInfo({
                ...managerProfile,
                role_id: managerUserRole.user_id
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading manager info:', error);
    }
  }

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
    <div className="space-y-8">
      {/* Header - Solo título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mi Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido, {userProfile?.full_name || 'Usuario'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          
        </div>
      </div>

      {/* Stats Cards - Debajo del título */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Esta Semana</p>
              <p className="text-3xl font-bold text-foreground">{stats.hoursThisWeek}h</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              Trabajadas
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Este Mes</p>
              <p className="text-3xl font-bold text-foreground">{stats.hoursThisMonth}h</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Acumuladas
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-yellow-600">
              En revisión
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes Aprobadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.approvedRequests}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Normales:</span>
              <span className="font-medium text-green-600">{stats.approvedNormalRequests || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Edición fichajes:</span>
              <span className="font-medium text-green-600">{stats.approvedTimeEditRequests || 0}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <span className="text-sm text-green-600 font-medium">
                Total aprobadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Información de empresa y manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        {companyInfo && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {companyInfo.logo_url ? (
                  <img 
                    src={companyInfo.logo_url} 
                    alt={companyInfo.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-bold text-lg">
                    {companyInfo.name?.charAt(0) || 'E'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{companyInfo.name}</h3>
                <p className="text-sm text-muted-foreground">Empresa</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {companyInfo.description && (
                <p className="text-sm text-muted-foreground">
                  {companyInfo.description}
                </p>
              )}
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                {companyInfo.address && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📍</span>
                    <span>{companyInfo.address}</span>
                  </div>
                )}
                
                {companyInfo.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📞</span>
                    <span>{companyInfo.phone}</span>
                  </div>
                )}
                
                {companyInfo.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📧</span>
                    <span>{companyInfo.email}</span>
                  </div>
                )}
                
                {companyInfo.website && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">🌐</span>
                    <a 
                      href={companyInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {companyInfo.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manager Info */}
        {managerInfo && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                {managerInfo.avatar_url ? (
                  <img 
                    src={managerInfo.avatar_url} 
                    alt={managerInfo.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-green-600 font-bold text-lg">
                    {managerInfo.full_name?.charAt(0) || 'M'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{managerInfo.full_name}</h3>
                <p className="text-sm text-muted-foreground">Tu Manager</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tu manager directo. Puedes contactarlo para cualquier consulta sobre tu trabajo, solicitudes o fichajes.
              </p>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📧</span>
                  <span>{managerInfo.email || 'Email no disponible'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📋</span>
                  <span>Gestiona solicitudes y fichajes</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📞</span>
                  <span>Contacto directo disponible</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">✅</span>
                  <span>Aprobación de solicitudes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Requests - Full Width */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Mis Solicitudes Recientes</h3>
        </div>
        <div className="p-6">
          {recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay solicitudes recientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                
                return (
                  <div key={request.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {getRequestTypeDisplay(request.request_type, request.request_type === 'time_edit' ? 'time_edit' : 'normal')}
                      </p>
                      {request.request_type === 'time_edit' ? (
                        <p className="text-xs text-muted-foreground">
                          {request.reason || 'Sin comentarios'}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {request.start_date && request.end_date ? `${request.start_date} - ${request.end_date}` : 'Sin fechas especificadas'}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        {request.status === 'pending' ? 'Pendiente' : 
                         request.status === 'approved' ? 'Aprobada' : 
                         request.status === 'rejected' ? 'Rechazada' : request.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
