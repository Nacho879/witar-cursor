import React from 'react';
import { useTimeClock } from '@/contexts/TimeClockContext';

export default function TimeClockDebug() {
  const {
    isActive,
    startTime,
    elapsedTime,
    isPaused,
    pauseStartTime,
    totalPausedTime,
    location,
    companyId,
    isOnline,
    lastSyncTime,
    loading,
    forceSync,
    manualSync,
    syncWithDatabase
  } = useTimeClock();

  const [showDebug, setShowDebug] = React.useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-gray-800 text-white px-2 py-1 text-xs rounded"
      >
        🐛 Debug
      </button>
      
      {showDebug && (
        <div className="absolute top-8 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-xs max-w-sm">
          <h3 className="font-bold mb-2">Estado del Fichaje</h3>
          
          <div className="space-y-1">
            <div><strong>Activo:</strong> {isActive ? '✅' : '❌'}</div>
            <div><strong>Pausado:</strong> {isPaused ? '✅' : '❌'}</div>
            <div><strong>Cargando:</strong> {loading ? '✅' : '❌'}</div>
            <div><strong>En línea:</strong> {isOnline ? '✅' : '❌'}</div>
          </div>
          
          <div className="mt-2 space-y-1">
            <div><strong>Tiempo inicio:</strong> {startTime ? new Date(startTime).toLocaleTimeString() : 'N/A'}</div>
            <div><strong>Tiempo transcurrido:</strong> {Math.floor(elapsedTime / 1000)}s</div>
            <div><strong>Tiempo pausado:</strong> {Math.floor(totalPausedTime / 1000)}s</div>
          </div>
          
          <div className="mt-2 space-y-1">
            <div><strong>Company ID:</strong> {companyId ? companyId.slice(0, 8) + '...' : 'N/A'}</div>
            <div><strong>Última sync:</strong> {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'N/A'}</div>
            <div><strong>Ubicación:</strong> {location ? '✅' : '❌'}</div>
          </div>
          
          <div className="mt-2">
            <strong>localStorage:</strong>
            <div className="ml-2 text-xs">
              <div>Activo: {localStorage.getItem('witar_active_session') || 'N/A'}</div>
              <div>Inicio: {localStorage.getItem('witar_start_time') ? new Date(parseInt(localStorage.getItem('witar_start_time'))).toLocaleTimeString() : 'N/A'}</div>
            </div>
          </div>
          
          <div className="mt-2 flex gap-1">
            <button
              onClick={manualSync}
              className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
            >
              🔄 Manual
            </button>
            <button
              onClick={forceSync}
              className="bg-green-500 text-white px-2 py-1 text-xs rounded"
            >
              🔄 Force
            </button>
            <button
              onClick={() => syncWithDatabase()}
              className="bg-orange-500 text-white px-2 py-1 text-xs rounded"
            >
              🔄 DB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

