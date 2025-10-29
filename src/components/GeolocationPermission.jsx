import React from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

const GeolocationPermission = ({ onPermissionGranted, onPermissionDenied, showDetails = false }) => {
  const {
    location,
    error,
    isLoading,
    permissionStatus,
    requestPermission,
    canClockIn,
    getStatusMessage
  } = useGeolocation();

  const handleRequestPermission = async () => {
    console.log('🔐 Usuario solicitando permisos de geolocalización...');
    const result = await requestPermission();
    
    if (result.location) {
      console.log('✅ Permisos concedidos, ubicación obtenida');
      onPermissionGranted?.(result.location);
    } else {
      console.log('❌ Permisos denegados o error:', result.error);
      onPermissionDenied?.(result.error);
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">📍 Permisos de Ubicación</h3>
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          statusInfo.type === 'success' ? 'bg-green-100 text-green-800' :
          statusInfo.type === 'error' ? 'bg-red-100 text-red-800' :
          statusInfo.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {permissionStatus === 'granted' ? 'Concedido' :
           permissionStatus === 'denied' ? 'Denegado' :
           permissionStatus === 'prompt' ? 'Pendiente' : 'Desconocido'}
        </span>
      </div>

      <div className="mb-4">
        <p className={`text-sm ${
          statusInfo.type === 'error' ? 'text-red-600' :
          statusInfo.type === 'warning' ? 'text-yellow-600' :
          statusInfo.type === 'success' ? 'text-green-600' :
          'text-gray-600'
        }`}>
          {statusInfo.message}
        </p>
      </div>

      {showDetails && location && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">📍 Ubicación Actual:</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Latitud:</strong> {location.lat.toFixed(6)}</p>
            <p><strong>Longitud:</strong> {location.lng.toFixed(6)}</p>
            <p><strong>Precisión:</strong> {Math.round(location.accuracy)}m</p>
            <p><strong>Obtenida:</strong> {location.timestamp.toLocaleString()}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-1">❌ Error:</h4>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleRequestPermission}
          disabled={isLoading || permissionStatus === 'granted'}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            permissionStatus === 'granted' 
              ? 'bg-green-100 text-green-700 cursor-not-allowed' 
              : isLoading
              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isLoading ? '⏳ Solicitando...' : 
           permissionStatus === 'granted' ? '✅ Concedido' :
           '🔐 Solicitar Permisos'}
        </button>

        {permissionStatus === 'denied' && (
          <button
            onClick={() => window.open('https://support.google.com/chrome/answer/142065', '_blank')}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600"
          >
            📖 Cómo Habilitar
          </button>
        )}
      </div>

      {permissionStatus === 'denied' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-1">⚠️ Instrucciones:</h4>
          <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Haz clic en el icono de ubicación en la barra de direcciones</li>
            <li>Selecciona "Permitir" para este sitio</li>
            <li>Recarga la página</li>
            <li>O ve a Configuración → Privacidad → Ubicación</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default GeolocationPermission;
