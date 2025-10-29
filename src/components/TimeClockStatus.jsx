import React from 'react';
import { useTimeClock } from '@/contexts/TimeClockContext';
import { Clock, Play, Pause, Square, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';

export default function TimeClockStatus({ className = "" }) {
  const {
    isActive,
    elapsedTime,
    isPaused,
    location,
    isOnline,
    lastSyncTime,
    loading,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    getCurrentLocation,
    syncWithDatabase,
    formatTime
  } = useTimeClock();

  const [message, setMessage] = React.useState('');

  async function handleClockIn() {
    try {
      setMessage('');
      
      const locationData = await getCurrentLocation();
      await startSession(locationData);
      
      setMessage('✅ Fichaje iniciado correctamente');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage('❌ Error al iniciar fichaje: ' + error.message);
    }
  }

  async function handleClockOut() {
    try {
      setMessage('');
      
      await endSession();
      
      setMessage('✅ Fichaje completado correctamente');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage('❌ Error al finalizar fichaje: ' + error.message);
    }
  }

  async function handlePause() {
    try {
      setMessage('');
      
      await pauseSession();
      
      setMessage('⏸️ Fichaje pausado');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error pausing:', error);
      setMessage('❌ Error al pausar fichaje: ' + error.message);
    }
  }

  async function handleResume() {
    try {
      setMessage('');
      
      await resumeSession();
      
      setMessage('▶️ Fichaje reanudado');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error resuming:', error);
      setMessage('❌ Error al reanudar fichaje: ' + error.message);
    }
  }

  function getActionButton() {
    if (isActive) {
      if (isPaused) {
        return (
          <button
            onClick={handleResume}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-1 inline" />
            {loading ? 'Reanudando...' : 'Reanudar'}
          </button>
        );
      } else {
        return (
          <div className="flex gap-2">
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Square className="w-4 h-4 mr-1 inline" />
              {loading ? 'Finalizando...' : 'Finalizar'}
            </button>
            <button
              onClick={handlePause}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Pause className="w-4 h-4 mr-1 inline" />
              {loading ? 'Pausando...' : 'Pausar'}
            </button>
          </div>
        );
      }
    } else {
      return (
        <button
          onClick={handleClockIn}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-1 inline" />
          {loading ? 'Iniciando...' : 'Iniciar'}
        </button>
      );
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-3 p-2 rounded text-sm ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : message.includes('❌')
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">Estado del Fichaje</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Estado de conexión */}
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>

      {/* Estado actual */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${
          isActive 
            ? (isPaused ? 'bg-yellow-500' : 'bg-green-500') 
            : 'bg-gray-400'
        }`} />
        <span className={`text-sm font-medium ${
          isActive 
            ? (isPaused ? 'text-yellow-600' : 'text-green-600') 
            : 'text-gray-600'
        }`}>
          {isActive 
            ? (isPaused ? 'En pausa' : 'Trabajando') 
            : 'Fuera de servicio'
          }
        </span>
      </div>

      {/* Tiempo transcurrido */}
      {isActive && (
        <div className="text-center mb-3">
          <div className="text-xl font-mono font-bold text-gray-900 dark:text-white">
            {formatTime(elapsedTime)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isPaused ? 'Tiempo pausado' : 'Tiempo trabajado hoy'}
          </p>
        </div>
      )}

      {/* Ubicación */}
      {location && (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <MapPin className="w-3 h-3" />
          <span>Ubicación registrada</span>
        </div>
      )}

      {/* Botón de acción */}
      <div className="mb-3">
        {getActionButton()}
      </div>

      {/* Botón de sincronización manual */}
      {isActive && (
        <button
          onClick={syncWithDatabase}
          className="w-full flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
        >
          <RefreshCw className="w-3 h-3" />
          Sincronizar
        </button>
      )}

      {/* Advertencia si está offline */}
      {!isOnline && isActive && (
        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded mt-2">
          <AlertTriangle className="w-3 h-3" />
          <span>Sin conexión - El fichaje se guardará cuando se restaure la conexión</span>
        </div>
      )}

      {/* Información de sincronización */}
      {lastSyncTime && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Última sincronización: {new Date(lastSyncTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
