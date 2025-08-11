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

export default function EmployeeDashboard() {
  const [userProfile, setUserProfile] = React.useState(null);
  const [stats, setStats] = React.useState({
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    pendingRequests: 0,
    approvedRequests: 0
  });
  const [todayEntries, setTodayEntries] = React.useState([]);
  const [recentRequests, setRecentRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date());

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

    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await Promise.all([
          loadUserProfile(user.id),
          loadUserStats(user.id),
          loadTodayEntries(user.id),
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
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async function loadUserStats(userId) {
    try {
      // Horas de esta semana (simulado)
      const hoursThisWeek = Math.floor(Math.random() * 20) + 30;
      
      // Horas de este mes (simulado)
      const hoursThisMonth = Math.floor(Math.random() * 100) + 120;

      // Solicitudes pendientes
      const { count: pendingRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      // Solicitudes aprobadas
      const { count: approvedRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved');

      setStats({
        hoursThisWeek,
        hoursThisMonth,
        pendingRequests: pendingRequests || 0,
        approvedRequests: approvedRequests || 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async function loadTodayEntries(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_time', today.toISOString())
        .order('entry_time', { ascending: true });

      if (!error && data) {
        setTodayEntries(data);
      }
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  }

  async function loadRecentRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentRequests(data);
      }
    } catch (error) {
      console.error('Error loading recent requests:', error);
    }
  }

  function getEntryTypeIcon(type) {
    switch (type) {
      case 'clock_in': return LogIn;
      case 'clock_out': return LogOut;
      case 'break_start': return Coffee;
      case 'break_end': return Coffee;
      default: return Clock;
    }
  }

  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return 'Entrada';
      case 'clock_out': return 'Salida';
      case 'break_start': return 'Inicio Pausa';
      case 'break_end': return 'Fin Pausa';
      default: return type;
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

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
            Mi Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido, {userProfile?.full_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Hora actual</p>
          <p className="text-2xl font-mono text-foreground">
            {currentTime.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <AlertCircle className="w-6 h-6 text-yellow-600" />
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Confirmadas
            </span>
          </div>
        </div>
      </div>

      {/* Today's Entries and Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Entries */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Fichajes de Hoy</h3>
          </div>
          <div className="p-6">
            {todayEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay fichajes registrados hoy</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayEntries.map((entry) => {
                  const EntryIcon = getEntryTypeIcon(entry.entry_type);
                  
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <EntryIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {getEntryTypeDisplay(entry.entry_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.entry_time)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-sm font-mono text-foreground">
                          {formatTime(entry.entry_time)}
                        </span>
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
                          {getRequestTypeDisplay(request.request_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.start_date} - {request.end_date}
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

      {/* Time Clock */}
      <TimeClock onTimeEntry={handleTimeEntry} />

      {/* Quick Actions */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Acciones Rápidas</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/employee/time-entries'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Mis Fichajes</p>
                <p className="text-sm text-muted-foreground">Ver historial de fichajes</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/employee/requests'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Mis Solicitudes</p>
                <p className="text-sm text-muted-foreground">Gestionar solicitudes</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/employee/documents'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Mis Documentos</p>
                <p className="text-sm text-muted-foreground">Acceder a documentos</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
