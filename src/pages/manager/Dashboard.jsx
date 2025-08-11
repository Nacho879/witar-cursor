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
  UserX
} from 'lucide-react';

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

  React.useEffect(() => {
    loadDashboardData();
  }, []);

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
      // Miembros del equipo
      const { count: teamMembers } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('supervisor_id', managerId)
        .eq('is_active', true);

      // Presentes hoy (simulado)
      const presentToday = Math.floor(Math.random() * (teamMembers || 0)) + 1;

      // Solicitudes pendientes del equipo
      const { count: pendingRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('user_id', 
          await getTeamUserIds(companyId, managerId)
        )
        .eq('status', 'pending');

      // Horas del equipo (simulado)
      const teamHours = Math.floor(Math.random() * 100) + 50;

      setStats({
        teamMembers: teamMembers || 0,
        presentToday,
        pendingRequests: pendingRequests || 0,
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
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          id,
          role,
          joined_at,
          user_profiles (
            full_name,
            avatar_url
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('supervisor_id', managerId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (!error && data) {
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadRecentRequests(companyId, managerId) {
    try {
      const teamUserIds = await getTeamUserIds(companyId, managerId);
      
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          user_profiles (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .in('user_id', teamUserIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentRequests(data);
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
                {teamMembers.map((member) => (
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
                    </div>
                    <div className="flex-shrink-0">
                      <span className="badge">
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
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
