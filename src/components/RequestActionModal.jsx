import React, { useState } from 'react';
import { X, Check, AlertTriangle, User, FileText, Calendar } from 'lucide-react';

const RequestActionModal = ({ 
  isOpen, 
  onClose, 
  request, 
  action, 
  onConfirm, 
  getRequestTypeInfo, 
  formatDate, 
  getDurationDisplay 
}) => {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !request) return null;

  const typeInfo = getRequestTypeInfo(request.request_type);
  const isApproval = action === 'approve';
  const isRejection = action === 'reject';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onConfirm(comments);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComments('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 ${
          isApproval ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isApproval 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'bg-red-100 dark:bg-red-900'
            }`}>
              {isApproval ? (
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isApproval ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isApproval ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Resumen de la Solicitud</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Empleado:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {request.user_company_roles?.user_profiles?.full_name || 'Sin nombre'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tipo:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fecha:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(request.created_at)}
                </span>
              </div>

              {request.request_type === 'time_edit' ? (
                <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detalles del fichaje:</h4>
                  {request.time_entries && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>Actual: {getRequestTypeInfo(request.time_entries.entry_type).label} - {new Date(request.time_entries.entry_time).toLocaleString('es-ES')}</div>
                      {request.proposed_entry_time && (
                        <div>Propuesto: {new Date(request.proposed_entry_time).toLocaleString('es-ES')}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Detalles:</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Duración: {getDurationDisplay(request)}</div>
                    <div>Desde: {formatDate(request.start_date)}</div>
                    {request.request_type !== 'permission' && (
                      <div>Hasta: {formatDate(request.end_date)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employee Comment */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Comentario del empleado</h3>
            </div>
            <div className="bg-white dark:bg-gray-600 rounded p-3 border border-gray-200 dark:border-gray-500">
              <p className="text-gray-900 dark:text-white text-sm">
                {request.reason || 'Sin comentarios'}
              </p>
            </div>
          </div>

          {/* Comments Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isApproval ? 'Comentarios de aprobación (opcional)' : 'Motivo del rechazo *'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                required={isRejection}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                placeholder={isApproval 
                  ? "Comentarios adicionales sobre la aprobación..." 
                  : "Explica el motivo del rechazo..."
                }
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || (isRejection && !comments.trim())}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  isApproval 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    {isApproval ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {isApproval ? 'Aprobar' : 'Rechazar'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestActionModal; 