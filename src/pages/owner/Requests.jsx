import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Check, X, Eye, Calendar, Clock, AlertCircle, FileText, LogIn, LogOut, Coffee, Edit, Plus, XCircle, CheckCircle, Search, User } from 'lucide-react';
import RequestDetailsModal from '@/components/RequestDetailsModal';
import RequestActionModal from '@/components/RequestActionModal';

export default function Requests() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [companyId, setCompanyId] = React.useState(null);
  const [stats, setStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionRequest, setActionRequest] = useState(null);

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
        .select(`
          *,
          time_entries (
            id,
            entry_type,
            entry_time,
            notes
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && !timeEditError) {
        // Obtener todos los user_ids únicos
        const allUserIds = new Set();
        if (normalRequests) {
          normalRequests.forEach(r => allUserIds.add(r.user_id));
        }
        if (timeEditRequests) {
          timeEditRequests.forEach(r => allUserIds.add(r.user_id));
        }
        const userIds = Array.from(allUserIds);

        if (userIds.length > 0) {
          // Obtener los perfiles de usuario
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds);

          // Obtener los emails usando la Edge Function
          const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds }
          });

          // Obtener información de departamentos
          const { data: roles, error: rolesError } = await supabase
            .from('user_company_roles')
            .select(`
              user_id,
              departments (
                name
              )
            `)
            .in('user_id', userIds)
            .eq('company_id', companyId)
            .eq('is_active', true);

          if (!profilesError && !rolesError && profiles && roles) {
            // Combinar los datos de solicitudes normales
            const requestsWithProfiles = (normalRequests || []).map(request => {
              const profile = profiles.find(p => p.user_id === request.user_id);
              const role = roles.find(r => r.user_id === request.user_id);
              const emailData = emailsData?.emails?.find(e => e.user_id === request.user_id);
              
              return {
                ...request,
                request_type: 'normal',
                original_request_type: request.request_type,
                user_company_roles: {
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  } || { full_name: 'Usuario sin perfil', email: 'No disponible', avatar_url: null },
                  departments: role?.departments || { name: 'Sin departamento' }
                }
              };
            });

            // Combinar los datos de solicitudes de edición de fichajes
            const timeEditRequestsWithProfiles = (timeEditRequests || []).map(request => {
              const profile = profiles.find(p => p.user_id === request.user_id);
              const role = roles.find(r => r.user_id === request.user_id);
              const emailData = emailsData?.emails?.find(e => e.user_id === request.user_id);
              
              return {
                ...request,
                request_type: 'time_edit', // Para identificar que es una solicitud de edición
                original_request_type: request.request_type, // Preservar el tipo específico (delete_entry, edit_time, etc.)
                user_company_roles: {
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  } || { full_name: 'Usuario sin perfil', email: 'No disponible', avatar_url: null },
                  departments: role?.departments || { name: 'Sin departamento' }
                }
              };
            });

            // Combinar ambas listas
            const allRequests = [...requestsWithProfiles, ...timeEditRequestsWithProfiles];
            
            // Ordenar por fecha de creación (más recientes primero)
            allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setRequests(allRequests);
            calculateStats(allRequests);
          } else {
            // Fallback sin perfiles
            const allRequests = [];
            if (normalRequests) {
              normalRequests.forEach(request => {
                allRequests.push({
                  ...request,
                  request_type: 'normal',
                  original_request_type: request.request_type
                });
              });
            }
            if (timeEditRequests) {
              timeEditRequests.forEach(request => {
                allRequests.push({
                  ...request,
                  request_type: 'time_edit'
                });
              });
            }
            allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRequests(allRequests);
            calculateStats(allRequests);
          }
        } else {
          setRequests([]);
          calculateStats([]);
        }
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
        // Obtener datos de la solicitud antes de actualizar
        const { data: request } = await supabase
          .from('requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (request) {
          requestData = request;
          employeeUserId = request.user_id;
          companyId = request.company_id;
        }

        const { error } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (error) throw error;
      } else if (requestType === 'time_edit') {
        // Obtener datos de la solicitud antes de actualizar
        const { data: request } = await supabase
          .from('time_entry_edit_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (request) {
          requestData = request;
          employeeUserId = request.user_id;
          companyId = request.company_id;
        }

        updateData.approved_by = (await supabase.auth.getUser()).data.user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = comments;

        const { error } = await supabase
          .from('time_entry_edit_requests')
          .update(updateData)
          .eq('id', requestId);

        if (error) throw error;

        // Si se aprueba, aplicar los cambios al fichaje
        if (newStatus === 'approved') {
          await applyTimeEntryChanges(requestId);
        }
      }

      // Enviar notificación al empleado
      if (employeeUserId && companyId) {
        await sendNotificationToEmployee(employeeUserId, companyId, newStatus, requestData, comments, requestType);
      }

      await loadRequests();
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

      if (!request) {
        console.error('❌ No se encontró la solicitud:', requestId);
        return;
      }

      // request.request_type aquí contiene el tipo específico de la BD (delete_entry, edit_time, etc.)
      console.log('🔧 Aplicando cambios para solicitud:', request.request_type, requestId);

      // Si es eliminar fichaje, eliminarlo PRIMERO
      if (request.request_type === 'delete_entry') {
        console.log('🗑️ Eliminando fichaje:', request.time_entry_id);
        
        const { error } = await supabase
          .from('time_entries')
          .delete()
          .eq('id', request.time_entry_id);

        if (error) {
          console.error('❌ Error eliminando fichaje:', error);
          throw error;
        }
        
        console.log('✅ Fichaje eliminado correctamente');
        return; // Salir después de eliminar
      }

      // Para otros tipos de solicitudes, actualizar el fichaje
      const updateData = {};

      // Aplicar cambios según el tipo de solicitud
      if (request.request_type === 'edit_time' && request.proposed_entry_time) {
        updateData.entry_time = request.proposed_entry_time;
        console.log('⏰ Actualizando hora:', request.proposed_entry_time);
      }

      if (request.request_type === 'edit_type' && request.proposed_entry_type) {
        updateData.entry_type = request.proposed_entry_type;
        console.log('📝 Actualizando tipo:', request.proposed_entry_type);
      }

      if (request.proposed_notes !== undefined) {
        updateData.notes = request.proposed_notes;
        console.log('📋 Actualizando notas:', request.proposed_notes);
      }

      // Actualizar el fichaje
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('time_entries')
          .update(updateData)
          .eq('id', request.time_entry_id);

        if (error) {
          console.error('❌ Error actualizando fichaje:', error);
          throw error;
        }
        
        console.log('✅ Fichaje actualizado correctamente');
      }

      // Si es agregar fichaje, crearlo
      if (request.request_type === 'add_entry') {
        console.log('➕ Agregando nuevo fichaje');
        
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

        if (error) {
          console.error('❌ Error agregando fichaje:', error);
          throw error;
        }
        
        console.log('✅ Nuevo fichaje agregado correctamente');
      }

    } catch (error) {
      console.error('❌ Error applying changes:', error);
      throw error;
    }
  }

  function getRequestTypeInfo(type, requestType = 'normal') {
    if (requestType === 'time_edit') {
      // Solicitudes de edición de fichajes
      switch (type) {
        case 'edit_time':
          return { label: 'Editar Fecha/Hora', icon: Clock, color: 'text-orange-600 bg-orange-100' };
        case 'edit_type':
          return { label: 'Editar Tipo', icon: Edit, color: 'text-purple-600 bg-purple-100' };
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
        return { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-100', icon: Clock };
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
    if (request.request_type === 'permission' || request.original_request_type === 'permission') {
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

  // Función de filtrado corregida
  const filteredRequests = requests.filter(request => {
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const employeeName = request.user_company_roles?.user_profiles?.full_name?.toLowerCase() || '';
      const reason = request.reason?.toLowerCase() || '';
      const description = request.description?.toLowerCase() || '';
      
      const matchesSearch = employeeName.includes(searchLower) || 
                           reason.includes(searchLower) || 
                           description.includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filtro por estado
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }

    // Filtro por tipo de solicitud
    if (typeFilter !== 'all') {
      if (typeFilter === 'time_edit') {
        if (request.request_type !== 'time_edit') {
          return false;
        }
      } else {
        // Para solicitudes normales, verificar el tipo específico
        const originalType = request.original_request_type || request.request_type;
        if (request.request_type !== 'normal' || originalType !== typeFilter) {
          return false;
        }
      }
    }

    return true;
  });

  const handleActionConfirm = async (comments) => {
    const status = actionType === 'approve' ? 'approved' : 'rejected';
    await updateRequestStatus(actionRequest.id, status, comments, actionRequest.request_type);
    setActionModalOpen(false);
    setActionRequest(null);
    setActionType(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Solicitudes</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona y revisa las solicitudes de tu empresa
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
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
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">Todos los tipos</option>
              <option value="vacation">Vacaciones</option>
              <option value="permission">Permisos</option>
              <option value="sick_leave">Baja Médica</option>
              <option value="other">Otros</option>
              <option value="time_edit">Edición Fichajes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes - Estilo del empleado */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Historial de Solicitudes
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando solicitudes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No hay solicitudes que coincidan con los filtros' 
                  : 'No hay solicitudes'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const typeInfo = getRequestTypeInfo(request.original_request_type || request.request_type, request.request_type === 'time_edit' ? 'time_edit' : 'normal');
                const statusInfo = getStatusInfo(request.status);
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={request.id} className="card p-4 sm:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                          {request.user_company_roles?.user_profiles?.avatar_url ? (
                            <img 
                              src={request.user_company_roles.user_profiles.avatar_url} 
                              alt={request.user_company_roles.user_profiles.full_name || 'Usuario'}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base sm:text-lg font-medium text-primary">
                              {request.user_company_roles?.user_profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-sm sm:text-base">{typeInfo.label}</h4>
                            <span className={`badge ${statusInfo.color} self-start`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                            <span className="font-medium">{request.user_company_roles?.user_profiles?.full_name || 'Sin nombre'}</span>
                            {request.user_company_roles?.departments?.name && (
                              <span className="ml-2 hidden sm:inline">• {request.user_company_roles.departments.name}</span>
                            )}
                          </p>
                          {request.user_company_roles?.departments?.name && (
                            <p className="text-xs text-muted-foreground mb-1 sm:hidden">
                              {request.user_company_roles.departments.name}
                            </p>
                          )}
                          {request.request_type !== 'time_edit' && request.reason && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                              {request.reason}
                            </p>
                          )}
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
                                <span>Nuevo tipo: {getRequestTypeInfo(request.proposed_entry_type).label}</span>
                              )}
                            </div>
                          ) : (
                            // Información para solicitudes normales
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                              <span>Duración: {getDurationDisplay(request)}</span>
                              <span>Desde: {formatDate(request.start_date)}</span>
                              {request.request_type !== 'permission' && request.original_request_type !== 'permission' && (
                                <span>Hasta: {formatDate(request.end_date)}</span>
                              )}
                              {(request.request_type === 'permission' || request.original_request_type === 'permission') && (
                                <span>Horario: {formatTime(request.start_time)} - {formatTime(request.end_time)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col sm:items-end">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setActionRequest(request);
                                setActionType('approve');
                                setActionModalOpen(true);
                              }}
                              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5"
                              title="Aprobar"
                            >
                              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Aprobar</span>
                            </button>
                            <button
                              onClick={() => {
                                setActionRequest(request);
                                setActionType('reject');
                                setActionModalOpen(true);
                              }}
                              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5"
                              title="Rechazar"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Rechazar</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsModalOpen(true);
                          }}
                          className="btn btn-ghost btn-sm p-2 sm:p-1.5"
                          title="Ver detalles"
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
      
      {/* Modales */}
      <RequestDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        getRequestTypeInfo={getRequestTypeInfo}
        formatDate={formatDate}
        getDurationDisplay={getDurationDisplay}
      />

      <RequestActionModal
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setActionRequest(null);
          setActionType(null);
        }}
        request={actionRequest}
        action={actionType}
        onConfirm={handleActionConfirm}
        getRequestTypeInfo={getRequestTypeInfo}
        formatDate={formatDate}
        getDurationDisplay={getDurationDisplay}
      />
    </div>
  );
}
