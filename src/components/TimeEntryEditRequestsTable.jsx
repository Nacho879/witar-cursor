import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  MapPin
} from 'lucide-react';

export default function TimeEntryEditRequestsTable({ userRole }) {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

  useEffect(() => {
    loadRequests();
  }, [userRole, filter]);

  async function loadRequests() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('time_entry_edit_requests')
        .select(`
          *,
          time_entries (
            id,
            entry_type,
            entry_time,
            notes,
            location_lat,
            location_lng
          )
        `)
        .eq('company_id', userRole.company_id);

      // Filtrar por estado
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      // Ordenar por fecha de creación (más recientes primero)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading requests:', error);
        return;
      }

      // Obtener emails de los usuarios
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map(r => r.user_id),
          ...data.filter(r => r.approved_by).map(r => r.approved_by)
        ])];

        const { data: emailsData } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds }
        });

        // Combinar datos
        const requestsWithEmails = data.map(request => {
          const userEmail = emailsData?.emails?.find(e => e.user_id === request.user_id)?.email;
          const approverEmail = request.approved_by ? 
            emailsData?.emails?.find(e => e.user_id === request.approved_by)?.email : null;

          return {
            ...request,
            user_email: userEmail,
            approver_email: approverEmail
          };
        });

        setRequests(requestsWithEmails);
      } else {
        setRequests([]);
      }

    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(requestId, status, notes = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData = {
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: notes
      };

      const { error } = await supabase
        .from('time_entry_edit_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      // Si se aprueba, aplicar los cambios al fichaje
      if (status === 'approved') {
        await applyTimeEntryChanges(requestId);
      }

      // Recargar las solicitudes
      loadRequests();

    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error al procesar la solicitud');
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

        if (error) {
          throw error;
        }
      }

      // Si es eliminar fichaje, eliminarlo
      if (request.request_type === 'delete_entry') {
        const { error } = await supabase
          .from('time_entries')
          .delete()
          .eq('id', request.time_entry_id);

        if (error) {
          throw error;
        }
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

        if (error) {
          throw error;
        }
      }

    } catch (error) {
      console.error('Error applying changes:', error);
      throw error;
    }
  }

  function getRequestTypeDisplay(type) {
    switch (type) {
      case 'edit_time': return 'Editar fecha/hora';
      case 'edit_type': return 'Editar tipo';
      case 'delete_entry': return 'Eliminar fichaje';
      case 'add_entry': return 'Agregar fichaje';
      default: return type;
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

  function getStatusDisplay(status) {
    switch (status) {
      case 'pending': return { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
      case 'approved': return { text: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejected': return { text: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle };
      default: return { text: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Solicitudes de Edición de Fichajes
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold">{requests.length}</span>
            </span>
            <span className="text-yellow-600">
              Pendientes: <span className="font-semibold">{requests.filter(r => r.status === 'pending').length}</span>
            </span>
            <span className="text-green-600">
              Aprobadas: <span className="font-semibold">{requests.filter(r => r.status === 'approved').length}</span>
            </span>
            <span className="text-red-600">
              Rechazadas: <span className="font-semibold">{requests.filter(r => r.status === 'rejected').length}</span>
            </span>
          </div>
        </div>

        {/* Filters mejorados */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Todas ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Pendientes ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Aprobadas ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'rejected' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Rechazadas ({requests.filter(r => r.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Requests List mejorada */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay solicitudes de edición de fichajes
            </p>
          </div>
        ) : (
          requests.map((request) => {
            const statusInfo = getStatusDisplay(request.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                {/* Header con información principal */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      request.request_type === 'delete_entry' ? 'bg-red-100 dark:bg-red-900/20' :
                      request.request_type === 'add_entry' ? 'bg-green-100 dark:bg-green-900/20' :
                      'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      {request.request_type === 'delete_entry' ? (
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      ) : request.request_type === 'add_entry' ? (
                        <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {request.user_profiles?.full_name || 'Usuario'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.user_email || 'Email no disponible'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Solicitado el {formatDateTime(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusInfo.text}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {request.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Tipo de solicitud destacado */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de solicitud:</span>
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${
                      request.request_type === 'delete_entry' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                      request.request_type === 'add_entry' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {getRequestTypeDisplay(request.request_type)}
                    </span>
                  </div>
                </div>

                {/* Detalles del fichaje */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Fichaje Actual */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Fichaje Actual
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getEntryTypeDisplay(request.current_entry_type)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDateTime(request.current_entry_time)}
                        </span>
                      </div>
                      {request.current_notes && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Notas:</span>
                          <span className="font-medium text-gray-900 dark:text-white max-w-xs truncate">
                            {request.current_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cambios Solicitados */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Cambios Solicitados
                    </h4>
                    <div className="space-y-2 text-sm">
                      {request.request_type === 'delete_entry' ? (
                        <div className="text-red-600 dark:text-red-400 font-medium">
                          🗑️ Eliminar este fichaje completamente
                        </div>
                      ) : (
                        <>
                          {request.proposed_entry_type && (
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Nuevo tipo:</span>
                              <span className="font-medium text-blue-900 dark:text-blue-100">
                                {getEntryTypeDisplay(request.proposed_entry_type)}
                              </span>
                            </div>
                          )}
                          {request.proposed_entry_time && (
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Nueva fecha:</span>
                              <span className="font-medium text-blue-900 dark:text-blue-100">
                                {formatDateTime(request.proposed_entry_time)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {request.proposed_notes && (
                        <div className="flex justify-between">
                          <span className="text-blue-600 dark:text-blue-400">Nuevas notas:</span>
                          <span className="font-medium text-blue-900 dark:text-blue-100 max-w-xs truncate">
                            {request.proposed_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Motivo de la Solicitud</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {request.reason}
                  </p>
                </div>

                {/* Approval Info */}
                {request.approved_by && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Aprobado por:</span>
                      <span className="font-medium">{request.approver_email || 'Email no disponible'}</span>
                      <span className="text-gray-600">el {formatDate(request.approved_at)}</span>
                    </div>
                    {request.approval_notes && (
                      <p className="text-sm text-gray-700 mt-1">
                        Notas: {request.approval_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const notes = prompt('Notas de aprobación (opcional):');
                        handleApproval(request.id, 'approved', notes);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Motivo del rechazo:');
                        if (notes) {
                          handleApproval(request.id, 'rejected', notes);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200">
                  <span>Solicitado el {formatDateTime(request.created_at)}</span>
                  <span>ID: {request.id.slice(0, 8)}...</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 