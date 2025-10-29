import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Clock, Edit, AlertCircle, CheckCircle } from 'lucide-react';

export default function TimeEntryEditRequestModal({ 
  isOpen, 
  onClose, 
  timeEntry, 
  onRequestSubmitted 
}) {
  const [requestType, setRequestType] = useState('edit_time');
  const [proposedEntryType, setProposedEntryType] = useState(timeEntry?.entry_type || '');
  const [proposedEntryTime, setProposedEntryTime] = useState('');
  const [proposedNotes, setProposedNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Función para obtener el display del tipo de entrada
  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return 'Entrada';
      case 'clock_out': return 'Salida';
      case 'break_start': return 'Inicio Pausa';
      case 'break_end': return 'Fin Pausa';
      default: return type;
    }
  }

  // Función para formatear la fecha y hora
  function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Función para obtener la fecha y hora actual en formato local
  function getCurrentDateTimeLocal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Inicializar la fecha y hora propuesta cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && timeEntry) {
      const entryDate = new Date(timeEntry.entry_time);
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const hours = String(entryDate.getHours()).padStart(2, '0');
      const minutes = String(entryDate.getMinutes()).padStart(2, '0');
      setProposedEntryTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      setProposedEntryType(timeEntry.entry_type);
      setProposedNotes(timeEntry.notes || '');
    }
  }, [isOpen, timeEntry]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Debes proporcionar un motivo para la solicitud');
      return;
    }

    if (requestType === 'edit_time' && !proposedEntryTime) {
      setError('Debes especificar la nueva fecha y hora');
      return;
    }

    if (requestType === 'edit_type' && !proposedEntryType) {
      setError('Debes especificar el nuevo tipo de entrada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener el company_id del usuario
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) {
        throw new Error('No se encontró el rol del usuario');
      }

      const requestData = {
        user_id: user.id,
        company_id: userRole.company_id,
        time_entry_id: timeEntry.id,
        request_type: requestType,
        current_entry_type: timeEntry.entry_type,
        current_entry_time: timeEntry.entry_time,
        current_notes: timeEntry.notes || '',
        reason: reason.trim(),
        status: 'pending'
      };

      // Agregar datos propuestos según el tipo de solicitud
      if (requestType === 'edit_time') {
        requestData.proposed_entry_time = new Date(proposedEntryTime).toISOString();
      } else if (requestType === 'edit_type') {
        requestData.proposed_entry_type = proposedEntryType;
      } else if (requestType === 'add_entry') {
        requestData.proposed_entry_type = proposedEntryType;
        requestData.proposed_entry_time = new Date(proposedEntryTime).toISOString();
      }

      if (proposedNotes.trim()) {
        requestData.proposed_notes = proposedNotes.trim();
      }

      const { data: insertedRequest, error } = await supabase
        .from('time_entry_edit_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Enviar notificación a los managers
      await notifyManagers(insertedRequest);

      setSuccess(true);
      setTimeout(() => {
        onRequestSubmitted();
        onClose();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Error submitting edit request:', error);
      setError(error.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  async function notifyManagers(requestData) {
    try {
      // Obtener el rol del usuario que hace la solicitud
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('role')
        .eq('user_id', requestData.user_id)
        .eq('company_id', requestData.company_id)
        .eq('is_active', true)
        .single();

      // Determinar a quién enviar las notificaciones según el rol
      let targetRoles = ['admin', 'owner'];
      
      // Si es un empleado, también notificar a managers
      if (userRole?.role === 'employee') {
        targetRoles.push('manager');
      }
      // Si es un manager, solo notificar a admin y owner
      // Si es admin/owner, no enviar notificaciones (son los que aprueban)

      // Obtener los roles objetivo de la empresa
      const { data: targetUsers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', requestData.company_id)
        .in('role', targetRoles)
        .eq('is_active', true);

      if (!targetUsers || targetUsers.length === 0) return;

      // Obtener información del empleado que solicita
      const { data: employeeProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', requestData.user_id)
        .single();

      const employeeName = employeeProfile?.full_name || 'Empleado';

      // Determinar el tipo de solicitud para el mensaje
      let requestTypeLabel = '';
      switch (requestData.request_type) {
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

      // Crear notificaciones para cada usuario objetivo
      const notifications = targetUsers.map(user => ({
        company_id: requestData.company_id,
        recipient_id: user.user_id,
        sender_id: requestData.user_id,
        type: 'time_edit_request',
        title: `📝 Nueva Solicitud de ${requestTypeLabel}`,
        message: `${employeeName} ha solicitado ${requestTypeLabel}.\n\nMotivo: ${requestData.reason}`,
        data: {
          request_id: requestData.id,
          request_type: requestData.request_type,
          employee_name: employeeName,
          reason: requestData.reason
        }
      }));

      // Insertar todas las notificaciones
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating notifications:', error);
      }
    } catch (error) {
      console.error('Error notifying users:', error);
    }
  }

  function resetForm() {
    setRequestType('edit_time');
    setProposedEntryType('');
    setProposedEntryTime('');
    setProposedNotes('');
    setReason('');
    setError('');
    setSuccess(false);
  }

  function handleClose() {
    if (!loading) {
      resetForm();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Solicitar Edición de Fichaje
              </h2>
              <p className="text-sm text-gray-600">
                Solicita a tu manager que edite este fichaje
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Solicitud Enviada
              </h3>
              <p className="text-gray-600">
                Tu solicitud ha sido enviada a tu manager para su aprobación.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fichaje actual */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Fichaje Actual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 font-medium">
                      {getEntryTypeDisplay(timeEntry?.entry_type)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha y Hora:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(timeEntry?.entry_time)}
                    </span>
                  </div>
                  {timeEntry?.notes && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Notas:</span>
                      <span className="ml-2 font-medium">{timeEntry.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo de solicitud */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Solicitud
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="edit_time">Editar fecha y hora</option>
                  <option value="edit_type">Editar tipo de entrada</option>
                  <option value="delete_entry">Eliminar fichaje</option>
                  <option value="add_entry">Agregar fichaje</option>
                </select>
              </div>

              {/* Campos según el tipo de solicitud */}
              {(requestType === 'edit_time' || requestType === 'add_entry') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Fecha y Hora
                  </label>
                  <input
                    type="datetime-local"
                    value={proposedEntryTime}
                    onChange={(e) => setProposedEntryTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {(requestType === 'edit_type' || requestType === 'add_entry') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Entrada
                  </label>
                  <select
                    value={proposedEntryType}
                    onChange={(e) => setProposedEntryType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="clock_in">Entrada</option>
                    <option value="clock_out">Salida</option>
                    <option value="break_start">Inicio Pausa</option>
                    <option value="break_end">Fin Pausa</option>
                  </select>
                </div>
              )}

              {/* Notas propuestas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={proposedNotes}
                  onChange={(e) => setProposedNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas adicionales sobre la edición..."
                  disabled={loading}
                />
              </div>

              {/* Motivo de la solicitud */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de la Solicitud *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Explica por qué necesitas editar este fichaje..."
                  disabled={loading}
                  required
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 