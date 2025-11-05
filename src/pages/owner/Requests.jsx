import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  Search,
  Eye,
  MoreHorizontal,
  Edit,
  Plus,
  XCircle as XCircleIcon
} from 'lucide-react';

export default function Requests() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [companyId, setCompanyId] = React.useState(null);
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
      setLoading(true);
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
          await loadRequestsData(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRequestsData(companyId) {
    try {
      // Cargar solicitudes normales
      const { data: normalRequests, error } = await supabase
        .from('requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Cargar solicitudes de edición de fichajes
      const { data: timeEditRequests, error: timeEditError } = await supabase
        .from('time_entry_edit_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && !timeEditError) {
        // Combinar y procesar las solicitudes
        const allRequests = [];

        // Agregar solicitudes normales
        if (normalRequests) {
          normalRequests.forEach(request => {
            allRequests.push({
              ...request,
              request_type: 'normal',
              original_request_type: request.request_type
            });
          });
        }

        // Agregar solicitudes de edición de fichajes
        if (timeEditRequests) {
          timeEditRequests.forEach(request => {
            allRequests.push({
              ...request,
              request_type: 'time_edit'
            });
          });
        }

        // Ordenar por fecha de creación
        allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setRequests(allRequests);
        calculateStats(allRequests);
      }
    } catch (error) {
      console.error('Error loading requests data:', error);
    }
  }

  function calculateStats(requestsData) {
    const total = requestsData.length;
    const pending = requestsData.filter(r => r.status === 'pending').length;
    const approved = requestsData.filter(r => r.status === 'approved').length;
    const rejected = requestsData.filter(r => r.status === 'rejected').length;

    setStats({ total, pending, approved, rejected });
  }

  async function updateRequestStatus(requestId, newStatus, comments = '', requestType = 'normal') {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      let requestData = null;
      let employeeUserId = null;
      let companyId = null;

      if (requestType === 'normal') {
        // Buscar la solicitud en la lista ya cargada para obtener el company_id
        const existingRequest = requests.find(r => r.id === requestId && r.request_type === 'normal');
        
        if (!existingRequest) {
          throw new Error('Solicitud no encontrada en la lista');
        }

        requestData = existingRequest;
        employeeUserId = existingRequest.user_id;
        companyId = existingRequest.company_id;

        // Actualizar directamente sin verificar primero (las políticas RLS ya validaron que podemos verla)
        const { error } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (error) {
          console.error('Error actualizando solicitud:', error);
          throw error;
        }
      } else if (requestType === 'time_edit') {
        // Buscar la solicitud en la lista ya cargada para obtener los datos
        const existingRequest = requests.find(r => r.id === requestId && r.request_type === 'time_edit');
        
        if (!existingRequest) {
          throw new Error('Solicitud de edición no encontrada en la lista');
        }

        requestData = existingRequest;
        employeeUserId = existingRequest.user_id;
        companyId = existingRequest.company_id;

        // Obtener el usuario actual para approved_by
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = comments;

        // Actualizar directamente sin verificar primero (las políticas RLS ya validaron que podemos verla)
        const { error } = await supabase
          .from('time_entry_edit_requests')
          .update(updateData)
          .eq('id', requestId);

        if (error) {
          console.error('Error actualizando solicitud de edición:', error);
          throw error;
        }

        // Si se aprueba, aplicar los cambios al fichaje
        if (newStatus === 'approved') {
          await applyTimeEntryChanges(requestId);
        }
      }

      // Enviar notificación al empleado
      if (employeeUserId && companyId) {
        await sendNotificationToEmployee(employeeUserId, companyId, newStatus, requestData, comments, requestType);
      }

      // Solo recargar si tenemos un companyId válido
      if (companyId) {
        await loadRequestsData(companyId);
      } else {
        // Si no tenemos companyId, recargar usando el estado actual
        await loadRequests();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  }

  async function sendNotificationToEmployee(employeeUserId, companyId, status, requestData, comments, requestType) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener información del owner que aprueba/rechaza
      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const ownerName = ownerProfile?.full_name || 'Owner';

      // Determinar el tipo de solicitud para el mensaje
      let requestTypeLabel = '';
      if (requestType === 'time_edit') {
        switch (requestData?.request_type) {
          case 'edit_time':
            requestTypeLabel = 'edición de fecha/hora de fichaje';
            break;
          case 'edit_type':
            requestTypeLabel = 'edición de tipo de fichaje';
            break;
          case 'delete_entry':
            requestTypeLabel = 'eliminación de fichaje';
            break;
          case 'add_entry':
            requestTypeLabel = 'adición de fichaje';
            break;
          default:
            requestTypeLabel = 'edición de fichaje';
        }
      } else {
        switch (requestData?.original_request_type) {
          case 'vacation':
            requestTypeLabel = 'solicitud de vacaciones';
            break;
          case 'permission':
            requestTypeLabel = 'solicitud de permiso';
            break;
          case 'sick_leave':
            requestTypeLabel = 'solicitud de baja médica';
            break;
          case 'other':
            requestTypeLabel = 'solicitud';
            break;
          default:
            requestTypeLabel = 'solicitud';
        }
      }

      // Crear mensaje de notificación
      let title = '';
      let message = '';

      if (status === 'approved') {
        title = `✅ Solicitud Aprobada`;
        message = `Tu ${requestTypeLabel} ha sido aprobada por ${ownerName}.`;
        if (comments) {
          message += `\n\nComentarios: ${comments}`;
        }
      } else if (status === 'rejected') {
        title = `❌ Solicitud Rechazada`;
        message = `Tu ${requestTypeLabel} ha sido rechazada por ${ownerName}.`;
        if (comments) {
          message += `\n\nMotivo: ${comments}`;
        }
      }

      // Insertar notificación en la base de datos
      const { error } = await supabase
        .from('notifications')
        .insert({
          company_id: companyId,
          recipient_id: employeeUserId,
          sender_id: user.id,
          type: status === 'approved' ? 'request_approved' : 'request_rejected',
          title: title,
          message: message,
          data: {
            request_id: requestData?.id,
            request_type: requestType,
            original_request_type: requestData?.request_type || requestData?.original_request_type,
            status: status,
            comments: comments
          }
        });

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async function applyTimeEntryChanges(requestId) {
    try {
      // Obtener la solicitud aprobada
      const { data: request } = await supabase
        .from('time_entry_edit_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) return;

      const updateData = {};

      // Aplicar cambios según el tipo de solicitud
      if (request.request_type === 'edit_time' && request.proposed_entry_time) {
        updateData.entry_time = request.proposed_entry_time;
      }

      if (request.request_type === 'edit_type' && request.proposed_entry_type) {
        updateData.entry_type = request.proposed_entry_type;
      }

      if (request.proposed_notes !== undefined) {
        updateData.notes = request.proposed_notes;
      }

      // Actualizar el fichaje
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('time_entries')
          .update(updateData)
          .eq('id', request.time_entry_id);

        if (error) throw error;
      }

      // Si es eliminar fichaje, eliminarlo
      if (request.request_type === 'delete_entry') {
        const { error } = await supabase
          .from('time_entries')
          .delete()
          .eq('id', request.time_entry_id);

        if (error) throw error;
      }

      // Si es agregar fichaje, crearlo
      if (request.request_type === 'add_entry') {
        const newEntry = {
          user_id: request.user_id,
          company_id: request.company_id,
          entry_type: request.proposed_entry_type,
          entry_time: request.proposed_entry_time,
          notes: request.proposed_notes
        };

        const { error } = await supabase
          .from('time_entries')
          .insert(newEntry);

        if (error) throw error;
      }

    } catch (error) {
      console.error('Error applying changes:', error);
      throw error;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending': return Clock;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      default: return AlertCircle;
    }
  }

  function getRequestTypeDisplay(type) {
    switch (type) {
      case 'vacation': return 'Vacaciones';
      case 'sick_leave': return 'Baja por enfermedad';
      case 'permission': return 'Permiso';
      case 'other': return 'Otro';
      default: return type;
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const filteredRequests = requests.filter(request => {
    if (filter !== 'all' && request.status !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const type = getRequestTypeDisplay(request.request_type).toLowerCase();
      const status = request.status.toLowerCase();
      return type.includes(searchLower) || status.includes(searchLower);
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
          <h1 className="text-3xl font-bold text-foreground">Solicitudes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las solicitudes de tu equipo
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
              <Calendar className="w-6 h-6 text-blue-600" />
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
              <Clock className="w-6 h-6 text-yellow-600" />
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar solicitudes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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

      {/* Requests Table */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Lista de Solicitudes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">Tipo</th>
                <th className="th">Empleado</th>
                <th className="th">Desde</th>
                <th className="th">Hasta</th>
                <th className="th">Duración</th>
                <th className="th">Estado</th>
                <th className="th">Fecha</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="td text-center text-muted-foreground py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No hay solicitudes {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const StatusIcon = getStatusIcon(request.status);
                  
                  return (
                    <tr key={request.id}>
                      <td className="td">
                        <span className="font-medium">
                          {getRequestTypeDisplay(request.request_type)}
                        </span>
                      </td>
                      <td className="td">
                        <span>Empleado</span>
                      </td>
                      <td className="td">
                        {formatDate(request.start_date)}
                      </td>
                      <td className="td">
                        {formatDate(request.end_date)}
                      </td>
                      <td className="td">
                        {request.duration_days} días
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className={`badge ${getStatusColor(request.status)}`}>
                            {request.status === 'pending' ? 'Pendiente' : 
                             request.status === 'approved' ? 'Aprobada' : 
                             request.status === 'rejected' ? 'Rechazada' : request.status}
                          </span>
                        </div>
                      </td>
                      <td className="td">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(request.created_at)}
                        </span>
                      </td>
                      <td className="td">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateRequestStatus(request.id, 'approved', '', request.request_type || 'normal')}
                              className="btn btn-ghost btn-sm text-green-600"
                              title="Aprobar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'rejected', '', request.request_type || 'normal')}
                              className="btn btn-ghost btn-sm text-red-600"
                              title="Rechazar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
