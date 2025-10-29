import React, { useState } from 'react';
import { useTimeClock } from '@/contexts/TimeClockContext';
import { Clock, Play, Pause, Square, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

export default function GlobalTimeClock({ onTimeEntry }) {
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

  const [message, setMessage] = useState('');

  async function handleClockIn() {
    try {
      setMessage('');
      
      // Obtener ubicación si está disponible
      const locationData = await getCurrentLocation();
      
      const data = await startSession(locationData);
      
      setMessage('✅ Fichaje iniciado correctamente');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage('❌ Error al iniciar fichaje: ' + error.message);
    }
  }

  async function handleClockOut() {
    try {
      setMessage('');
      
      const data = await endSession();
      
      setMessage('✅ Fichaje completado correctamente');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage('❌ Error al finalizar fichaje: ' + error.message);
    }
  }

  async function handlePause() {
    try {
      setMessage('');
      
      const data = await pauseSession();
      
      setMessage('⏸️ Fichaje pausado');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error pausing:', error);
      setMessage('❌ Error al pausar fichaje: ' + error.message);
    }
  }

  async function handleResume() {
    try {
      setMessage('');
      
      const data = await resumeSession();
      
      setMessage('▶️ Fichaje reanudado');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
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
          <Button
            onClick={handleResume}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? 'Reanudando...' : 'Reanudar'}
          </Button>
        );
      } else {
        return (
          <div className="space-y-2">
            <Button
              onClick={handleClockOut}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              {loading ? 'Finalizando...' : 'Finalizar Jornada'}
            </Button>
            <Button
              onClick={handlePause}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Pause className="w-4 h-4 mr-2" />
              {loading ? 'Pausando...' : 'Pausar'}
            </Button>
          </div>
        );
      }
    } else {
      return (
        <Button
          onClick={handleClockIn}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          {loading ? 'Iniciando...' : 'Iniciar Jornada'}
        </Button>
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        {/* Estado de conexión */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
          {lastSyncTime && (
            <span className="text-gray-500 text-xs">
              Sincronizado: {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Estado actual */}
        <div className="flex items-center justify-center gap-2">
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
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isPaused ? 'Tiempo pausado' : 'Tiempo trabajado hoy'}
            </p>
          </div>
        )}

        {/* Ubicación */}
        {location && (
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>Ubicación registrada</span>
          </div>
        )}

        {/* Botón de acción */}
        <div className="pt-4">
          {getActionButton()}
        </div>

        {/* Botón de sincronización manual */}
        {isActive && (
          <Button
            onClick={syncWithDatabase}
            variant="outline"
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Sincronizar
          </Button>
        )}

        {/* Mensaje de estado */}
        {message && (
          <div className={`text-sm p-3 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : message.includes('❌')
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {message}
          </div>
        )}

        {/* Advertencia si está offline */}
        {!isOnline && isActive && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
            <AlertTriangle className="w-4 h-4" />
            <span>Sin conexión - El fichaje se guardará cuando se restaure la conexión</span>
          </div>
        )}
      </div>
    </Card>
  );
}
