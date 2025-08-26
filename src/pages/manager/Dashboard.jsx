import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  UserCheck,
  UserX,
  Play,
  Pause,
  Square,
  Bell
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import ThemeToggle from '@/components/common/ThemeToggle';

export default function ManagerDashboard() {
  const [stats, setStats] = React.useState({
    teamMembers: 0,
    presentToday: 0,
    pendingRequests: 0,
    teamHours: 0
  });
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [recentRequests, setRecentRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [managerId, setManagerId] = React.useState(null);
  const [sendingNotifications, setSendingNotifications] = React.useState({});

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  // Función para enviar notificación de recordatorio de fichaje
  async function sendClockInReminder(employeeUserId, employeeName) {
    try {
      setSendingNotifications(prev => ({ ...prev, [employeeUserId]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el company_id del manager
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Crear la notificación
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: employeeUserId,
          sender_id: user.id,
          type: 'clock_in_reminder',
          title: '⏰ Recordatorio de Fichaje',
          message: `Hola ${employeeName}, recuerda fichar tu entrada cuando llegues al trabajo.`,
          data: {
            reminder_type: 'clock_in',
            employee_name: employeeName
          }
        });

      if (error) {
        console.error('Error sending notification:', error);
        alert('Error al enviar la notificación');
      } else {
        alert(`Notificación enviada a ${employeeName}`);
      }
    } catch (error) {
      console.error('Error sending clock-in reminder:', error);
      alert('Error al enviar la notificación');
    } finally {
      setSendingNotifications(prev => ({ ...prev, [employeeUserId]: false }));
    }
  }

  // Función para obtener el estado actual de un empleado
  async function getEmployeeCurrentStatus(userId, companyId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Obtener fichajes de hoy
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .gte('entry_time', startOfDay.toISOString())
        .lte('entry_time', endOfDay.toISOString())
        .order('entry_time', { ascending: true });

      if (!timeEntries || timeEntries.length === 0) {
        return {
          status: 'offline',
          lastActivity: null,
          currentSession: null,
          totalWorkTime: 0,
          totalBreakTime: 0
        };
      }

      // Analizar el estado actual
      let status = 'offline';
      let currentSession = null;
      let totalWorkTime = 0;
      let totalBreakTime = 0;

      // Buscar la última actividad
      const lastEntry = timeEntries[timeEntries.length - 1];
      const now = new Date();
      const lastActivityTime = new Date(lastEntry.entry_time);

      // Determinar estado basado en la última entrada
      if (lastEntry.entry_type === 'clock_in' || lastEntry.entry_type === 'resume') {
        status = 'working';
        currentSession = {
          start: lastActivityTime,
          type: 'work'
        };
      } else if (lastEntry.entry_type === 'break_start') {
        status = 'break';
        currentSession = {
          start: lastActivityTime,
          type: 'break'
        };
      } else if (lastEntry.entry_type === 'clock_out') {
        status = 'offline';
      }

      // Calcular tiempos totales
      let workStart = null;
      let breakStart = null;

      for (const entry of timeEntries) {
        const entryTime = new Date(entry.entry_time);

        if (entry.entry_type === 'clock_in' || entry.entry_type === 'resume') {
          workStart = entryTime;
        } else if (entry.entry_type === 'clock_out' && workStart) {
          totalWorkTime += (entryTime - workStart) / (1000 * 60 * 60); // Convertir a horas
          workStart = null;
        } else if (entry.entry_type === 'break_start') {
          breakStart = entryTime;
        } else if (entry.entry_type === 'break_end' && breakStart) {
          totalBreakTime += (entryTime - breakStart) / (1000 * 60 * 60); // Convertir a horas
          breakStart = null;
        }
      }

      // Si hay una sesión activa, calcular el tiempo hasta ahora
      if (currentSession) {
        const sessionDuration = (now - currentSession.start) / (1000 * 60 * 60);
        if (currentSession.type === 'work') {
          totalWorkTime += sessionDuration;
        } else if (currentSession.type === 'break') {
          totalBreakTime += sessionDuration;
        }
      }

      return {
        status,
        lastActivity: lastActivityTime,
        currentSession,
        totalWorkTime: Math.round(totalWorkTime * 100) / 100,
        totalBreakTime: Math.round(totalBreakTime * 100) / 100
      };
    } catch (error) {
      console.error('Error getting employee status:', error);
      return {
        status: 'offline',
        lastActivity: null,
        currentSession: null,
        totalWorkTime: 0,
        totalBreakTime: 0
      };
    }
  }

  // Función para obtener el icono del estado
  function getStatusIcon(status) {
    switch (status) {
      case 'working':
        return Play;
      case 'break':
        return Pause;
      case 'offline':
        return Square;
      default:
        return Square;
    }
  }

  // Función para obtener el color del estado
  function getStatusColor(status) {
    switch (status) {
      case 'working':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'break':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'offline':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  }

  // Función para obtener el texto del estado
  function getStatusText(status) {
    switch (status) {
      case 'working':
        return 'Trabajando';
      case 'break':
        return 'En pausa';
      case 'offline':
        return 'Desconectado';
      default:
        return 'Desconectado';
    }
  }

  // Función para calcular el progreso de la jornada (asumiendo 8 horas)
  function calculateWorkProgress(totalWorkTime) {
    const workdayHours = 8;
    const progress = Math.min((totalWorkTime / workdayHours) * 100, 100);
    return Math.round(progress);
  }

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('id, company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setManagerId(userRole.id);
          await Promise.all([
            loadTeamStats(userRole.company_id, userRole.id),
            loadTeamMembers(userRole.company_id, userRole.id),
            loadRecentRequests(userRole.company_id, userRole.id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamStats(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('department_id', managerDepartment.department_id)
          .eq('is_active', true)
          .neq('role', 'manager');

        if (!deptError && departmentMembers) {
          teamUserIds = departmentMembers.map(member => member.user_id);
        }
      } else {
        // Si no tiene departamento, obtener empleados con supervisor_id
        const { data: supervisedMembers, error: supError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      // Miembros del equipo
      const teamMembers = teamUserIds.length;

      // Presentes hoy (simulado)
      const presentToday = Math.floor(Math.random() * teamMembers) + 1;

      // Solicitudes pendientes del equipo
      let pendingRequests = 0;
      if (teamUserIds.length > 0) {
        // Contar solicitudes normales pendientes
        const { count: normalRequests } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .eq('status', 'pending');
        
        // Contar solicitudes de edición de fichajes pendientes
        const { count: timeEditRequests } = await supabase
          .from('time_entry_edit_requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .eq('status', 'pending');
        
        pendingRequests = (normalRequests || 0) + (timeEditRequests || 0);
      }

      // Horas del equipo (simulado)
      const teamHours = Math.floor(Math.random() * 100) + 50;

      setStats({
        teamMembers,
        presentToday,
        pendingRequests,
        teamHours
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  }

  async function getTeamUserIds(companyId, managerId) {
    try {
      const { data } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('supervisor_id', managerId)
        .eq('is_active', true);

      return data?.map(item => item.user_id) || [];
    } catch (error) {
      console.error('Error getting team user IDs:', error);
      return [];
    }
  }

  async function loadTeamMembers(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('department_id', managerDepartment.department_id)
          .eq('is_active', true)
          .neq('role', 'manager');

        if (!deptError && departmentMembers) {
          teamUserIds = departmentMembers.map(member => member.user_id);
        }
      } else {
        // Si no tiene departamento, obtener empleados con supervisor_id
        const { data: supervisedMembers, error: supError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      if (teamUserIds.length > 0) {
        // Obtener los roles de usuario
        const { data: roles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            departments (
              name
            )
          `)
          .in('user_id', teamUserIds)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('joined_at', { ascending: false });

        if (!rolesError && roles) {
          // Obtener los perfiles de usuario por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', teamUserIds);

          if (!profilesError && profiles) {
            // Combinar los datos y obtener el estado actual de cada empleado
            const membersWithProfilesAndStatus = await Promise.all(
              roles.map(async (role) => {
                const profile = profiles.find(p => p.user_id === role.user_id);
                const status = await getEmployeeCurrentStatus(role.user_id, companyId);
                
                return {
                  ...role,
                  user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null },
                  status: status.status,
                  total_work_time: status.totalWorkTime,
                  total_break_time: status.totalBreakTime,
                  last_activity: status.lastActivity,
                  current_session: status.currentSession
                };
              })
            );

            setTeamMembers(membersWithProfilesAndStatus);
          } else {
            // Si no hay perfiles, solo obtener el estado
            const membersWithStatus = await Promise.all(
              roles.map(async (role) => {
                const status = await getEmployeeCurrentStatus(role.user_id, companyId);
                
                return {
                  ...role,
                  user_profiles: { full_name: 'Usuario sin perfil', avatar_url: null },
                  status: status.status,
                  total_work_time: status.totalWorkTime,
                  total_break_time: status.totalBreakTime,
                  last_activity: status.lastActivity,
                  current_session: status.currentSession
                };
              })
            );

            setTeamMembers(membersWithStatus);
          }
        }
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadRecentRequests(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('department_id', managerDepartment.department_id)
          .eq('is_active', true)
          .neq('role', 'manager');

        if (!deptError && departmentMembers) {
          teamUserIds = departmentMembers.map(member => member.user_id);
        }
      } else {
        // Si no tiene departamento, obtener empleados con supervisor_id
        const { data: supervisedMembers, error: supError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      if (teamUserIds.length > 0) {
        // Cargar solicitudes normales del equipo
        const { data: normalRequests, error } = await supabase
          .from('requests')
          .select('*')
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .order('created_at', { ascending: false })
          .limit(5);

        // Cargar solicitudes de edición de fichajes del equipo
        const { data: timeEditRequests, error: timeEditError } = await supabase
          .from('time_entry_edit_requests')
          .select('*')
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && !timeEditError) {
          // Obtener los perfiles de usuario por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', teamUserIds);

          if (!profilesError && profiles) {
            // Combinar y procesar las solicitudes
            const allRequests = [];

            // Agregar solicitudes normales
            if (normalRequests) {
              normalRequests.forEach(request => {
                const profile = profiles.find(p => p.user_id === request.user_id);
                allRequests.push({
                  ...request,
                  request_type: 'normal',
                  original_request_type: request.request_type,
                  user_profiles: profile || { full_name: 'Usuario sin perfil' }
                });
              });
            }

            // Agregar solicitudes de edición de fichajes
            if (timeEditRequests) {
              timeEditRequests.forEach(request => {
                const profile = profiles.find(p => p.user_id === request.user_id);
                allRequests.push({
                  ...request,
                  request_type: 'time_edit',
                  user_profiles: profile || { full_name: 'Usuario sin perfil' }
                });
              });
            }

            // Ordenar por fecha de creación y limitar a 5
            allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentRequests(allRequests.slice(0, 5));
          } else {
            setRecentRequests([]);
          }
        }
      } else {
        setRecentRequests([]);
      }
    } catch (error) {
      console.error('Error loading recent requests:', error);
    }
  }

  function getRequestTypeDisplay(type) {
    switch (type) {
      case 'vacation': return 'Vacaciones';
      case 'sick_leave': return 'Licencia Médica';
      case 'personal_leave': return 'Día Personal';
      default: return type;
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard del Equipo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión y supervisión de tu equipo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <ThemeToggle/>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Miembros del Equipo</p>
              <p className="text-3xl font-bold text-foreground">{stats.teamMembers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              Bajo tu supervisión
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Presentes Hoy</p>
              <p className="text-3xl font-bold text-foreground">{stats.presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              {stats.teamMembers > 0 ? Math.round((stats.presentToday / stats.teamMembers) * 100) : 0}% del equipo
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
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-yellow-600">
              Requieren revisión
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas del Equipo</p>
              <p className="text-3xl font-bold text-foreground">{stats.teamHours}h</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">
              Esta semana
            </span>
          </div>
        </div>
      </div>

      {/* Team Overview and Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Miembros del Equipo</h3>
          </div>
          <div className="p-6">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tienes miembros en tu equipo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => {
                  const StatusIcon = getStatusIcon(member.status);
                  const color = getStatusColor(member.status);
                  const progress = calculateWorkProgress(member.total_work_time);

                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {member.user_profiles?.avatar_url ? (
                          <img 
                            src={member.user_profiles.avatar_url} 
                            alt={member.user_profiles.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {member.user_profiles?.full_name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{member.user_profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.departments?.name || 'Sin departamento'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {getStatusText(member.status)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({member.total_work_time}h)
                          </span>
                        </div>
                        {/* Barra de progreso de la jornada */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              member.status === 'working' ? 'bg-green-500' : 
                              member.status === 'break' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress}% de la jornada completada
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => sendClockInReminder(member.user_id, member.user_profiles?.full_name)}
                          disabled={sendingNotifications[member.user_id]}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                            sendingNotifications[member.user_id]
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 cursor-pointer'
                          }`}
                          title="Enviar recordatorio de fichaje"
                        >
                          {sendingNotifications[member.user_id] ? (
                            <>
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3" />
                              Recordar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Solicitudes Recientes</h3>
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
                          {request.user_profiles?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getRequestTypeDisplay(request.request_type)} • {request.start_date} - {request.end_date}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {request.status}
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

      {/* Quick Actions */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Acciones Rápidas</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/manager/team'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Ver Mi Equipo</p>
                <p className="text-sm text-muted-foreground">Gestionar miembros del equipo</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/manager/requests'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Revisar Solicitudes</p>
                <p className="text-sm text-muted-foreground">Aprobar o rechazar solicitudes</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/manager/time-entries'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Ver Fichajes</p>
                <p className="text-sm text-muted-foreground">Revisar registros del equipo</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
