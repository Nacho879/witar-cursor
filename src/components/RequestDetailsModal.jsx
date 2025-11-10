import React from 'react';
import { X, Calendar, Clock, User, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const RequestDetailsModal = ({ isOpen, onClose, request, getRequestTypeInfo, formatDate, getDurationDisplay }) => {
  if (!isOpen || !request) return null;

  const typeInfo = getRequestTypeInfo(request.original_request_type || request.request_type, request.request_type === 'time_edit' ? 'time_edit' : 'normal');
  
  const getStatusInfo = (status) => {
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
  };

  const statusInfo = getStatusInfo(request.status);

  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalles de la Solicitud
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Request Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resumen de la Solicitud</h3>
            </div>
            
            <div className="space-y-1.5">
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
                <span className="text-sm text-gray-600 dark:text-gray-400">Estado:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fecha:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(request.created_at)}
                </span>
              </div>

              {request.request_type === 'time_edit' ? (
                <div className="mt-2 p-2 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                  <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-1.5">Detalles del fichaje:</h4>
                  {request.time_entries && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>Actual: {getRequestTypeInfo(request.time_entries.entry_type).label} - {new Date(request.time_entries.entry_time).toLocaleString('es-ES')}</div>
                      {request.proposed_entry_time && (
                        <div>Propuesto: {new Date(request.proposed_entry_time).toLocaleString('es-ES')}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 p-2 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                  <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-1.5">Detalles:</h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    <div>Duración: {getDurationDisplay(request)}</div>
                    <div>Desde: {formatDate(request.start_date)}</div>
                    {request.request_type !== 'permission' && request.original_request_type !== 'permission' && (
                      <div>Hasta: {formatDate(request.end_date)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employee Comment */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Comentario del empleado</h3>
            </div>
            <div className="bg-white dark:bg-gray-600 rounded p-2 border border-gray-200 dark:border-gray-500">
              <p className="text-gray-900 dark:text-white text-xs">
                {request.reason || 'Sin comentarios'}
              </p>
            </div>
          </div>

          {/* Footer Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal; 