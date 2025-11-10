import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  User,
  Eye
} from 'lucide-react';
import CreateRequestModal from '@/components/CreateRequestModal';

export default function MyRequests() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
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

      // Cargar solicitudes normales del usuario
      const { data: normalRequests, error: normalError } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Cargar solicitudes de edición de fichajes del usuario
      let timeEditRequests = null;
      const { data, error: timeEditError } = await supabase
        .from('time_entry_edit_requests')
        .select(`
          *,
          time_entries (
            id,
            entry_type,
            entry_time,
            notes
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (timeEditError) {
        // Si el error es porque la tabla no existe, simplemente ignorarlo
        // y continuar sin cargar solicitudes de edición de fichajes
        if (timeEditError.code === 'PGRST205' || timeEditError.message?.includes('Could not find the table')) {
          console.warn('La tabla time_entry_edit_requests no existe. Ejecuta el script SQL create_time_entry_edit_requests_table.sql para crearla.');
        } else {
          console.error('Error loading time edit requests:', timeEditError);
        }
      } else {
        timeEditRequests = data;
      }

      if (normalError) {
        console.error('Error loading normal requests:', normalError);
      }

      // Obtener el perfil del usuario por separado
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      let allRequests = [];

      // Procesar solicitudes normales
      if (normalRequests) {
        const normalRequestsWithProfile = normalRequests.map(request => ({
          ...request,
          request_type: 'normal', // Marcar como solicitud normal
          user_company_roles: {
            user_profiles: profile || { full_name: 'Usuario' }
          }
        }));
        allRequests.push(...normalRequestsWithProfile);
      }

      // Procesar solicitudes de edición de fichajes
      if (timeEditRequests) {
        const timeEditRequestsWithProfile = timeEditRequests.map(request => ({
          ...request,
          request_type: 'time_edit', // Marcar como solicitud de edición de fichaje
          user_company_roles: {
            user_profiles: profile || { full_name: 'Usuario' }
          }
        }));
        allRequests.push(...timeEditRequestsWithProfile);
      }

      // Ordenar todas las solicitudes por fecha de creación (más recientes primero)
      allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setRequests(allRequests);
      calculateStats(allRequests);
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

  function getRequestTypeInfo(type, requestType = 'normal') {
    if (requestType === 'time_edit') {
      // Solicitudes de edición de fichajes
      switch (type) {
        case 'edit_time':
          return { label: 'Editar Fecha/Hora', icon: Clock, color: 'text-orange-600 bg-orange-100' };
        case 'edit_type':
          return { label: 'Editar Tipo', icon: Clock, color: 'text-purple-600 bg-purple-100' };
        case 'delete_entry':
          return { label: 'Eliminar Fichaje', icon: XCircle, color: 'text-red-600 bg-red-100' };
        case 'add_entry':
          return { label: 'Agregar Fichaje', icon: Plus, color: 'text-green-600 bg-green-100' };
        default:
          return { label: 'Edición de Fichaje', icon: Clock, color: 'text-gray-600 bg-gray-100' };
      }
    } else {
      // Solicitudes normales
      switch (type) {
        case 'vacation':
          return { label: 'Vacaciones', icon: Calendar, color: 'text-blue-600 bg-blue-100' };
        case 'permission':
          return { label: 'Permiso', icon: Clock, color: 'text-green-600 bg-green-100' };
        case 'personal_leave':
          return { label: 'Permiso Personal', icon: Clock, color: 'text-green-600 bg-green-100' };
        case 'sick_leave':
          return { label: 'Baja Médica', icon: AlertCircle, color: 'text-red-600 bg-red-100' };
        case 'other':
          return { label: 'Otro', icon: FileText, color: 'text-purple-600 bg-purple-100' };
        default:
          return { label: type, icon: FileText, color: 'text-gray-600 bg-gray-100' };
      }
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
      // Para permisos, calcular duración basada en fechas
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} día${days > 1 ? 's' : ''}`;
    } else {
      // Para otros tipos, calcular días
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} día${days > 1 ? 's' : ''}`;
    }
  }

  const filteredRequests = requests.filter(request => {
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const reason = request.reason?.toLowerCase() || '';
      const notes = request.notes?.toLowerCase() || '';
      const typeInfo = getRequestTypeInfo(request.request_type, request.request_type === 'time_edit' ? 'time_edit' : 'normal');
      const typeLabel = typeInfo.label.toLowerCase();
      
      return reason.includes(searchLower) || 
             notes.includes(searchLower) || 
             typeLabel.includes(searchLower);
    }

    // Filtro por estado
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }

    return true;
  });

  function handleRequestCreated(newRequest) {
    setRequests(prev => [newRequest, ...prev]);
    calculateStats([newRequest, ...requests]);
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
          <h1 className="text-3xl font-bold text-foreground">Mis Solicitudes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus solicitudes de vacaciones, permisos y bajas
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar solicitudes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Historial de Solicitudes
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </button>
          </div>
        </div>
        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No hay solicitudes que coincidan con los filtros' 
                  : 'No tienes solicitudes creadas'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary mt-4"
                >
                  Crear Primera Solicitud
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const typeInfo = getRequestTypeInfo(request.request_type, request.request_type === 'time_edit' ? 'time_edit' : 'normal');
                const statusInfo = getStatusInfo(request.status);
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={request.id} className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-sm sm:text-base">{typeInfo.label}</h4>
                            <span className={`badge ${statusInfo.color} self-start`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                            {request.reason}
                          </p>
                          {request.notes && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                              {request.notes}
                            </p>
                          )}
                          
                          {/* Información específica según el tipo de solicitud */}
                          {request.request_type === 'time_edit' ? (
                            // Información para solicitudes de edición de fichajes
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                              {request.time_entries && (
                                <span className="break-words">Fichaje: {new Date(request.time_entries.entry_time).toLocaleString('es-ES')}</span>
                              )}
                              {request.proposed_entry_time && (
                                <span className="break-words">Nueva fecha: {new Date(request.proposed_entry_time).toLocaleString('es-ES')}</span>
                              )}
                              {request.proposed_entry_type && (
                                <span>Nuevo tipo: {request.proposed_entry_type}</span>
                              )}
                            </div>
                          ) : (
                            // Información para solicitudes normales
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                              <span>Duración: {getDurationDisplay(request)}</span>
                              <span>Desde: {formatDate(request.start_date)}</span>
                              {request.request_type !== 'permission' && (
                                <span>Hasta: {formatDate(request.end_date)}</span>
                              )}
                              {request.request_type === 'permission' && (
                                <span>Horario: {formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col sm:items-end">
                        <button
                          onClick={() => {
                            // Implementar vista detallada
                            alert('Vista detallada próximamente');
                          }}
                          className="btn btn-ghost btn-sm p-2 sm:p-1.5"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
                        <span>Creada: {formatDate(request.created_at)}</span>
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

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRequestCreated={handleRequestCreated}
      />
    </div>
  );
}
