import React from 'react';
import { X, Calendar, Clock, User, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const RequestDetailsModal = ({ isOpen, onClose, request, getRequestTypeInfo, formatDate, getDurationDisplay }) => {
  if (!isOpen || !request) return null;

  const typeInfo = getRequestTypeInfo(request.request_type);
  
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalles de la Solicitud
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {request.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Empleado</h3>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {request.user_company_roles?.user_profiles?.full_name || 'Sin nombre'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {request.user_company_roles?.user_profiles?.email || 'Sin email'}
            </p>
          </div>

          {/* Request Status */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Estado</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                <statusInfo.icon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Detalles de la Solicitud</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de solicitud:</span>
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(request.created_at)}</span>
              </div>

              {request.request_type === 'time_edit' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de solicitud:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  
                  {request.time_entries && (
                    <div className="bg-white dark:bg-gray-600 rounded p-3 border border-gray-200 dark:border-gray-500">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Fichaje actual:</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tipo:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRequestTypeInfo(request.time_entries.entry_type).color}`}>
                            {getRequestTypeInfo(request.time_entries.entry_type).label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fecha/Hora:</span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {new Date(request.time_entries.entry_time).toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.request_type !== 'delete_entry' && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 border border-green-200 dark:border-green-700">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Cambios propuestos:</h4>
                      <div className="space-y-1">
                        {request.proposed_entry_type && (
                          <div className="flex justify-between">
                            <span className="text-sm text-green-700 dark:text-green-300">Nuevo tipo:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRequestTypeInfo(request.proposed_entry_type).color}`}>
                              {getRequestTypeInfo(request.proposed_entry_type).label}
                            </span>
                          </div>
                        )}
                        {request.proposed_entry_time && (
                          <div className="flex justify-between">
                            <span className="text-sm text-green-700 dark:text-green-300">Nueva fecha/hora:</span>
                            <span className="text-sm text-green-900 dark:text-green-100">
                              {new Date(request.proposed_entry_time).toLocaleString('es-ES')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Duración:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{getDurationDisplay(request)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Desde:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatDate(request.start_date)}</span>
                  </div>
                  
                  {request.request_type !== 'permission' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Hasta:</span>
                      <span className="text-sm text-gray-900 dark:text-white">{formatDate(request.end_date)}</span>
                    </div>
                  )}
                </>
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
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {request.reason || 'Sin comentarios'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal; 