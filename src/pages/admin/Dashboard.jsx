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
  Activity,
  UserCheck,
  UserX
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingInvitations: 0,
    pendingRequests: 0,
    todayTimeEntries: 0,
    thisWeekHours: 0,
    managers: 0,
    employees: 0
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

      // Managers
      const { count: managers } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'manager')
        .eq('is_active', true);

      // Empleados regulares
      const { count: employees } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'employee')
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
      const today = new Date().toISOString().split('T')[0];
      const { count: todayTimeEntries } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('date', today)
        .lte('date', today);

      // Horas de esta semana
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const { data: weekEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('company_id', companyId)
        .gte('date', startOfWeek.toISOString().split('T')[0]);

      const thisWeekHours = weekEntries?.reduce((total, entry) => total + (entry.duration_minutes || 0), 0) / 60 || 0;

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        pendingInvitations: pendingInvitations || 0,
        pendingRequests: pendingRequests || 0,
        todayTimeEntries: todayTimeEntries || 0,
        thisWeekHours: Math.round(thisWeekHours * 100) / 100,
        managers: managers || 0,
        employees: employees || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadRecentActivity(companyId) {
    try {
      // Obtener fichajes recientes
      const { data: recentTimeEntries } = await supabase
        .from('time_entries')
        .select(`
          id,
          type,
          created_at,
          user_company_roles!inner (
            user_profiles!inner (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Obtener solicitudes recientes
      const { data: recentRequests } = await supabase
        .from('requests')
        .select(`
          id,
          type,
          status,
          created_at,
          user_company_roles!inner (
            user_profiles!inner (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Combinar y ordenar actividades
      const activities = [
        ...(recentTimeEntries || []).map(entry => ({
          ...entry,
          activityType: 'time_entry',
          user: entry.user_company_roles.user_profiles
        })),
        ...(recentRequests || []).map(request => ({
          ...request,
          activityType: 'request',
          user: request.user_company_roles.user_profiles
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
       .slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, Administrador
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Empresa</p>
          <p className="font-semibold text-foreground">
            {companyInfo?.name || 'Cargando...'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empleados Activos</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold text-foreground">{stats.managers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empleados</p>
              <p className="text-2xl font-bold text-foreground">{stats.employees}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingInvitations}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fichajes Hoy</p>
              <p className="text-2xl font-bold text-foreground">{stats.todayTimeEntries}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Esta Semana</p>
              <p className="text-2xl font-bold text-foreground">{stats.thisWeekHours}h</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Actividad Reciente</h2>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={`${activity.activityType}-${activity.id}`} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  {activity.activityType === 'time_entry' ? (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.user?.first_name} {activity.user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.activityType === 'time_entry' 
                      ? `Fichaje ${activity.type === 'in' ? 'entrada' : 'salida'}`
                      : `Solicitud ${activity.type} - ${activity.status}`
                    }
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No hay actividad reciente
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 