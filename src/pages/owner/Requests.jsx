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

  function getRequestTypeInfo(type) {
    switch (type) {
      // Solicitudes normales
      case 'vacation':
        return { label: 'Vacaciones', icon: Calendar, color: 'bg-blue-100 text-blue-800' };
      case 'permission':
        return { label: 'Permiso', icon: Clock, color: 'bg-green-100 text-green-800' };
      case 'sick_leave':
        return { label: 'Baja Médica', icon: AlertCircle, color: 'bg-red-100 text-red-800' };
      case 'other':
        return { label: 'Otro', icon: FileText, color: 'bg-purple-100 text-purple-800' };
      
      // Solicitudes de edición de fichajes
      case 'edit_time':
        return { label: 'Editar Fecha/Hora', icon: Clock, color: 'bg-orange-100 text-orange-800' };
      case 'edit_type':
        return { label: 'Editar Tipo', icon: Edit, color: 'bg-purple-100 text-purple-800' };
      case 'delete_entry':
        return { label: 'Eliminar Fichaje', icon: XCircle, color: 'bg-red-100 text-red-800' };
      case 'add_entry':
        return { label: 'Agregar Fichaje', icon: Plus, color: 'bg-green-100 text-green-800' };
      
      // Tipos de fichajes
      case 'clock_in':
        return { label: 'Entrada', icon: LogIn, color: 'bg-green-100 text-green-800' };
      case 'clock_out':
        return { label: 'Salida', icon: LogOut, color: 'bg-red-100 text-red-800' };
      case 'break_start':
        return { label: 'Inicio Pausa', icon: Coffee, color: 'bg-yellow-100 text-yellow-800' };
      case 'break_end':
        return { label: 'Fin Pausa', icon: Coffee, color: 'bg-yellow-100 text-yellow-800' };
      
      default:
        return { label: type, icon: FileText, color: 'bg-gray-100 text-gray-800' };
    }
  }

  function getStatusInfo(status) {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'approved':
        return { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText };
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
      return `${request.duration_hours || 0}h`;
    } else {
      return `${request.duration_days || 0} día${(request.duration_days || 0) > 1 ? 's' : ''}`;
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
      {/* Header mejorado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Solicitudes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona y revisa las solicitudes de tu empresa
          </p>
        </div>
      </div>

      {/* Stats Cards mejorados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aprobadas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rechazadas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros mejorados */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar solicitudes
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por empleado, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
          
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="vacation">Vacaciones</option>
              <option value="permission">Permisos</option>
              <option value="sick_leave">Baja Médica</option>
              <option value="other">Otros</option>
              <option value="time_edit">Edición Fichajes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes mejorada */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Cargando solicitudes...</span>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay solicitudes</h3>
            <p className="text-gray-600 dark:text-gray-400">No se encontraron solicitudes para tu empresa.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRequests.map((request) => {
              const typeInfo = getRequestTypeInfo(request.original_request_type || request.request_type);
              const statusInfo = getStatusInfo(request.status);

              return (
                <div key={request.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header de la solicitud */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {request.user_company_roles?.user_profiles?.full_name || 'Sin nombre'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.user_company_roles?.user_profiles?.email || 'Sin email'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.request_type !== 'time_edit' && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              <typeInfo.icon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <statusInfo.icon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Contenido de la solicitud */}
                      <div className="ml-12">
                        {request.request_type !== 'time_edit' && (
                          <p className="text-gray-700 dark:text-gray-300 mb-3">
                            {request.reason}
                          </p>
                        )}
                        
                        {request.request_type === 'time_edit' && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-3">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Detalles del Fichaje</h4>
                            {request.time_entry_id && request.time_entries ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Actual:</span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRequestTypeInfo(request.time_entries.entry_type).color}`}>
                                    {React.createElement(getRequestTypeInfo(request.time_entries.entry_type).icon, { className: "w-3 h-3 mr-1" })}
                                    {getRequestTypeInfo(request.time_entries.entry_type).label}
                                  </span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {new Date(request.time_entries.entry_time).toLocaleString('es-ES')}
                                  </span>
                                </div>
                                {request.time_entries.notes && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Notas: {request.time_entries.notes}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Fichaje original no disponible
                              </p>
                            )}

                            {request.original_request_type !== 'delete_entry' && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Cambios propuestos</h5>
                                <div className="space-y-2">
                                  {request.proposed_entry_type && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo:</span>
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRequestTypeInfo(request.proposed_entry_type).color}`}>
                                        {React.createElement(getRequestTypeInfo(request.proposed_entry_type).icon, { className: "w-3 h-3 mr-1" })}
                                        {getRequestTypeInfo(request.proposed_entry_type).label}
                                      </span>
                                    </div>
                                  )}
                                  {request.proposed_entry_time && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha/Hora:</span>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {new Date(request.proposed_entry_time).toLocaleString('es-ES')}
                                      </span>
                                    </div>
                                  )}
                                  {request.proposed_notes && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Notas:</span>
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{request.proposed_notes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Información adicional */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Solicitada: {formatDate(request.created_at)}</span>
                          {request.updated_at !== request.created_at && (
                            <span>Actualizada: {formatDate(request.updated_at)}</span>
                          )}
                          {request.request_type !== 'time_edit' && (
                            <>
                              <span>Duración: {getDurationDisplay(request)}</span>
                              <span>Desde: {formatDate(request.start_date)}</span>
                              {request.original_request_type !== 'permission' && (
                                <span>Hasta: {formatDate(request.end_date)}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 ml-4">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setActionRequest(request);
                              setActionType('approve');
                              setActionModalOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => {
                              setActionRequest(request);
                              setActionType('reject');
                              setActionModalOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rechazar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
