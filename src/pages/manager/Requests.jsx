import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  User,
  Eye,
  Check,
  X,
  MessageSquare
} from 'lucide-react';

export default function Requests() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('pending');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [stats, setStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  React.useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
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
        // Cargar solicitudes de los miembros del equipo
        const { data, error } = await supabase
          .from('requests')
          .select(`
            *,
            user_company_roles!requests_user_id_fkey (
              user_profiles (
                full_name,
                email,
                avatar_url
              ),
              departments (
                name
              )
            )
          `)
          .eq('company_id', managerRole.company_id)
          .eq('supervisor_id', managerRole.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRequests(data);
          calculateStats(data);
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(requestsData) {
    const total = requestsData.length;
    const pending = requestsData.filter(r => r.status === 'pending').length;
    const approved = requestsData.filter(r => r.status === 'approved').length;
    const rejected = requestsData.filter(r => r.status === 'rejected').length;

    setStats({ total, pending, approved, rejected });
  }

  async function updateRequestStatus(requestId, newStatus, comments = '') {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: newStatus,
          supervisor_comments: comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (!error) {
        await loadRequests();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  }

  function getRequestTypeInfo(type) {
    switch (type) {
      case 'vacation':
        return { label: 'Vacaciones', icon: Calendar, color: 'text-blue-600 bg-blue-100' };
      case 'permission':
        return { label: 'Permiso', icon: Clock, color: 'text-green-600 bg-green-100' };
      case 'sick_leave':
        return { label: 'Baja Médica', icon: AlertCircle, color: 'text-red-600 bg-red-100' };
      case 'other':
        return { label: 'Otro', icon: FileText, color: 'text-purple-600 bg-purple-100' };
      default:
        return { label: type, icon: FileText, color: 'text-gray-600 bg-gray-100' };
    }
  }

  function getStatusInfo(status) {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-100', icon: ClockIcon };
      case 'approved':
        return { label: 'Aprobada', color: 'text-green-600 bg-green-100', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rechazada', color: 'text-red-600 bg-red-100', icon: XCircle };
      default:
        return { label: status, color: 'text-gray-600 bg-gray-100', icon: FileText };
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(timeString) {
    return timeString ? timeString.substring(0, 5) : '';
  }

  function getDurationDisplay(request) {
    if (request.request_type === 'permission') {
      return `${request.duration_hours}h`;
    } else {
      return `${request.duration_days} día${request.duration_days > 1 ? 's' : ''}`;
    }
  }

  const filteredRequests = requests.filter(request => {
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const employeeName = request.user_company_roles?.user_profiles?.full_name?.toLowerCase() || '';
      const reason = request.reason?.toLowerCase() || '';
      const description = request.description?.toLowerCase() || '';
      
      return employeeName.includes(searchLower) || 
             reason.includes(searchLower) || 
             description.includes(searchLower);
    }

    // Filtro por estado
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }

    // Filtro por tipo
    if (typeFilter !== 'all' && request.request_type !== typeFilter) {
      return false;
    }

    return true;
  });

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
          <h1 className="text-3xl font-bold text-foreground">Solicitudes del Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las solicitudes de los miembros de tu equipo
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aprobadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rechazadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">Todos los tipos</option>
              <option value="vacation">Vacaciones</option>
              <option value="permission">Permisos</option>
              <option value="sick_leave">Bajas médicas</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="btn btn-ghost w-full"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Solicitudes del Equipo
          </h3>
        </div>
        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No hay solicitudes que coincidan con los filtros' 
                  : 'No hay solicitudes pendientes de revisión'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const typeInfo = getRequestTypeInfo(request.request_type);
                const statusInfo = getStatusInfo(request.status);
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={request.id} className="card p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {request.user_company_roles?.user_profiles?.avatar_url ? (
                            <img 
                              src={request.user_company_roles.user_profiles.avatar_url} 
                              alt={request.user_company_roles.user_profiles.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-primary">
                              {request.user_company_roles?.user_profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">
                              {request.user_company_roles?.user_profiles?.full_name}
                            </h4>
                            <span className={`badge ${typeInfo.color}`}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </span>
                            <span className={`badge ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {request.reason}
                          </p>
                          {request.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {request.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Duración: {getDurationDisplay(request)}</span>
                            <span>Desde: {formatDate(request.start_date)}</span>
                            {request.request_type !== 'permission' && (
                              <span>Hasta: {formatDate(request.end_date)}</span>
                            )}
                            {request.request_type === 'permission' && (
                              <span>Horario: {formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
                            )}
                            <span>Departamento: {request.user_company_roles?.departments?.name || 'Sin departamento'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'approved')}
                              className="btn btn-success btn-sm flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Aprobar
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'rejected')}
                              className="btn btn-destructive btn-sm flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Rechazar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            // Implementar vista detallada
                            alert('Vista detallada próximamente');
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Solicitada: {formatDate(request.created_at)}</span>
                        {request.updated_at !== request.created_at && (
                          <span>Actualizada: {formatDate(request.updated_at)}</span>
                        )}
                      </div>
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
