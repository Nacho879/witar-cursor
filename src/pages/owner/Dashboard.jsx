import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Mail,
  Building2,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

export default function OwnerDashboard() {
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingInvitations: 0,
    pendingRequests: 0,
    todayTimeEntries: 0,
    thisWeekHours: 0
  });
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState(null);
  const [companyInfo, setCompanyInfo] = React.useState(null);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
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
          await Promise.all([
            loadCompanyInfo(userRole.company_id),
            loadStats(userRole.company_id),
            loadRecentActivity(userRole.company_id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyInfo(companyId) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (!error && data) {
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

      // Horas de esta semana (simulado)
      const thisWeekHours = Math.floor(Math.random() * 200) + 150; // Simulado por ahora

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        pendingInvitations: pendingInvitations || 0,
        pendingRequests: pendingRequests || 0,
        todayTimeEntries: todayTimeEntries || 0,
        thisWeekHours
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadRecentActivity(companyId) {
    try {
      // Combinar actividades recientes de diferentes tablas
      const activities = [];

      // Invitaciones recientes
      const { data: recentInvitations } = await supabase
        .from('invitations')
        .select(`
          *,
          user_profiles!invitations_invited_by_fkey (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentInvitations) {
        recentInvitations.forEach(inv => {
          activities.push({
            id: inv.id,
            type: 'invitation',
            title: `Invitación enviada a ${inv.email}`,
            description: `Rol: ${inv.role}`,
            status: inv.status,
            timestamp: inv.created_at,
            icon: Mail
          });
        });
      }

      // Solicitudes recientes
      const { data: recentRequests } = await supabase
        .from('requests')
        .select(`
          *,
          user_profiles (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentRequests) {
        recentRequests.forEach(req => {
          activities.push({
            id: req.id,
            type: 'request',
            title: `Solicitud de ${req.user_profiles?.full_name || 'Empleado'}`,
            description: `${req.request_type} - ${req.status}`,
            status: req.status,
            timestamp: req.created_at,
            icon: Calendar
          });
        });
      }

      // Ordenar por timestamp y tomar los 5 más recientes
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending': return Clock;
      case 'accepted': return CheckCircle;
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
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
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido de vuelta, {companyInfo?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/owner/employees'}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Invitar Empleado
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              +{stats.activeEmployees} activos
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pendingInvitations}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-yellow-600">
              Requieren atención
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Por revisar
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fichajes Hoy</p>
              <p className="text-3xl font-bold text-foreground">{stats.todayTimeEntries}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Entradas/salidas
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Esta Semana</p>
              <p className="text-3xl font-bold text-foreground">{stats.thisWeekHours}h</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">
              Total registrado
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departamentos</p>
              <p className="text-3xl font-bold text-foreground">3</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-indigo-600">
              Organizados
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const ActivityIcon = activity.icon;
                  const StatusIcon = getStatusIcon(activity.status);
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <ActivityIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Acciones Rápidas</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.location.href = '/owner/employees'}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Gestionar Empleados</p>
                  <p className="text-sm text-muted-foreground">Ver y editar información del equipo</p>
                </div>
              </button>

              <button
                onClick={() => window.location.href = '/owner/invitations'}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Gestionar Invitaciones</p>
                  <p className="text-sm text-muted-foreground">Ver estado de invitaciones pendientes</p>
                </div>
              </button>

              <button
                onClick={() => window.location.href = '/owner/requests'}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
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
                onClick={() => window.location.href = '/owner/time-entries'}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Ver Fichajes</p>
                  <p className="text-sm text-muted-foreground">Revisar registros de tiempo</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
