import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Mail, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Building,
  Plus,
  UserCheck,
  UserX,
  Clock3,
  BarChart3
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingInvitations: 0,
    pendingRequests: 0,
    todayTimeEntries: 0,
    thisWeekHours: 0
  });
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
          await Promise.all([
            loadCompanyInfo(userRole.company_id),
            loadStats(userRole.company_id),
            loadRecentActivity(userRole.company_id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyInfo(companyId) {
    try {
      const { data } = await supabase
        .from('companies')
        .select('name, slug')
        .eq('id', companyId)
        .single();

      if (data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  }

  async function loadStats(companyId) {
    try {
      // Total empleados
      const { count: totalEmployees } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Empleados activos
      const { count: activeEmployees } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Invitaciones pendientes
      const { count: pendingInvitations } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending');

      // Solicitudes pendientes
      const { count: pendingRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending');

      // Fichajes de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayTimeEntries } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('entry_time', today.toISOString());

      // Horas de esta semana
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const { data: weekTimeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('entry_time', weekStart.toISOString());

      // Calcular horas totales de la semana
      let thisWeekHours = 0;
      if (weekTimeEntries) {
        thisWeekHours = weekTimeEntries.reduce((total, entry) => {
          if (entry.clock_out && entry.clock_in) {
            const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
            return total + (duration / (1000 * 60 * 60)); // Convertir a horas
          }
          return total;
        }, 0);
      }

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        pendingInvitations: pendingInvitations || 0,
        pendingRequests: pendingRequests || 0,
        todayTimeEntries: todayTimeEntries || 0,
        thisWeekHours: Math.round(thisWeekHours * 10) / 10
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadRecentActivity(companyId) {
    try {
      // Obtener diferentes tipos de actividad reciente
      const activities = [];

      // 1. Invitaciones recientes
      const { data: recentInvitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentInvitations) {
        recentInvitations.forEach(invitation => {
          activities.push({
            id: `invitation-${invitation.id}`,
            type: 'invitation',
            title: `Invitación enviada a ${invitation.email}`,
            description: `Rol: ${invitation.role}`,
            status: invitation.status,
            timestamp: invitation.created_at,
            icon: 'Mail'
          });
        });
      }

      // 2. Solicitudes recientes
      const { data: recentRequests } = await supabase
        .from('requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentRequests) {
        // Obtener información de usuarios para las solicitudes
        const requestWithUserInfo = await Promise.all(
          recentRequests.map(async (request) => {
            let userName = 'Empleado';
            try {
              const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', request.user_id)
                .maybeSingle();
              
              if (userProfile) {
                userName = userProfile.full_name;
              }
            } catch (error) {
              console.error('Error loading user profile for request:', error);
            }

            return {
              ...request,
              userName
            };
          })
        );

        requestWithUserInfo.forEach(request => {
          activities.push({
            id: `request-${request.id}`,
            type: 'request',
            title: `Solicitud de ${request.userName}`,
            description: `${request.type} - ${request.status}`,
            status: request.status,
            timestamp: request.created_at,
            icon: 'Calendar'
          });
        });
      }

      // 3. Fichajes recientes
      const { data: recentTimeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .order('entry_time', { ascending: false })
        .limit(5);

      if (recentTimeEntries) {
        // Obtener información de usuarios para los fichajes
        const timeEntriesWithUserInfo = await Promise.all(
          recentTimeEntries.map(async (entry) => {
            let userName = 'Empleado';
            try {
              const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', entry.user_id)
                .maybeSingle();
              
              if (userProfile) {
                userName = userProfile.full_name;
              }
            } catch (error) {
              console.error('Error loading user profile for time entry:', error);
            }

            return {
              ...entry,
              userName
            };
          })
        );

        timeEntriesWithUserInfo.forEach(entry => {
          activities.push({
            id: `time-${entry.id}`,
            type: 'time_entry',
            title: `${entry.userName} registró entrada`,
            description: `Tipo: ${entry.entry_type}`,
            status: 'completed',
            timestamp: entry.entry_time,
            icon: 'Clock'
          });
        });
      }

      // 4. Empleados recientes
      const { data: recentEmployees } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('company_id', companyId)
        .order('joined_at', { ascending: false })
        .limit(5);

      if (recentEmployees) {
        // Obtener información de usuarios para los empleados
        const employeesWithUserInfo = await Promise.all(
          recentEmployees.map(async (employee) => {
            let userName = 'Nuevo empleado';
            try {
              const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', employee.user_id)
                .maybeSingle();
              
              if (userProfile) {
                userName = userProfile.full_name;
              }
            } catch (error) {
              console.error('Error loading user profile for employee:', error);
            }

            return {
              ...employee,
              userName
            };
          })
        );

        employeesWithUserInfo.forEach(employee => {
          activities.push({
            id: `employee-${employee.id}`,
            type: 'employee',
            title: `${employee.userName} se unió`,
            description: `Rol: ${employee.role}`,
            status: employee.is_active ? 'active' : 'inactive',
            timestamp: employee.joined_at,
            icon: 'UserCheck'
          });
        });
      }

      // Ordenar todas las actividades por timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Tomar las 10 más recientes
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  function getActivityIcon(type) {
    switch (type) {
      case 'invitation':
        return <Mail className="w-4 h-4" />;
      case 'request':
        return <Calendar className="w-4 h-4" />;
      case 'time_entry':
        return <Clock className="w-4 h-4" />;
      case 'employee':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <div className="w-4 h-4 bg-primary rounded-full" />;
    }
  }

  function getActivityColor(type) {
    switch (type) {
      case 'invitation':
        return 'text-blue-600 bg-blue-100';
      case 'request':
        return 'text-purple-600 bg-purple-100';
      case 'time_entry':
        return 'text-green-600 bg-green-100';
      case 'employee':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'accepted':
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  }

  function formatTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return activityTime.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Dashboard de Administrador
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido, {companyInfo?.name}
          </p>
        </div>
        <div className="flex gap-3 pr-16 sm:pr-0">
          <button
            onClick={() => window.location.href = '/admin/employees'}
            className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Invitar Empleado</span>
            <span className="sm:hidden">Invitar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-green-600">
              +{stats.activeEmployees} activos
            </span>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.pendingInvitations}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-yellow-600">
              Requieren atención
            </span>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes Pendientes</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-purple-600">
              Por revisar
            </span>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fichajes de Hoy</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.todayTimeEntries}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock3 className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-green-600">
              Entradas registradas
            </span>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Esta Semana</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{stats.thisWeekHours}h</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-orange-600">
              Total acumulado
            </span>
          </div>
        </div>

        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado de la Empresa</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">Activa</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 lg:mt-4">
            <span className="text-sm text-emerald-600">
              Operativa
            </span>
          </div>
        </div>
      </div>

      {/* Acciones Administrativas */}
      <div className="card p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Acciones Administrativas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/employees'}
            className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Gestionar Empleados</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/invitations'}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-center"
          >
            <Mail className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Invitaciones</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/departments'}
            className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors text-center"
          >
            <Building className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Departamentos</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/admin/reports'}
            className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-center"
          >
            <BarChart3 className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Reportes</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg lg:text-xl font-semibold">Actividad Reciente</h2>
          <button
            onClick={() => window.location.href = '/admin/requests'}
            className="text-sm text-primary hover:underline self-start sm:self-auto"
          >
            Ver todas
          </button>
        </div>
        
        <div className="space-y-3 lg:space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm lg:text-base">{activity.title}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground mt-1">{activity.description}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {activity.status && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)} self-start sm:self-auto`}>
                          {activity.status === 'pending' && 'Pendiente'}
                          {activity.status === 'accepted' && 'Aceptada'}
                          {activity.status === 'approved' && 'Aprobada'}
                          {activity.status === 'rejected' && 'Rechazada'}
                          {activity.status === 'expired' && 'Expirada'}
                          {activity.status === 'active' && 'Activo'}
                          {activity.status === 'inactive' && 'Inactivo'}
                          {activity.status === 'completed' && 'Completado'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground self-start sm:self-auto">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 lg:py-8">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm lg:text-base">No hay actividad reciente</p>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                Las actividades aparecerán aquí cuando haya movimiento en la empresa
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 