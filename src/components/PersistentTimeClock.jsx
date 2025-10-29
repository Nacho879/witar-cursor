import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Play, Pause, Square, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

export default function PersistentTimeClock({ companyId, onTimeEntry }) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Claves para localStorage
  const STORAGE_KEYS = {
    ACTIVE_SESSION: 'witar_active_session',
    START_TIME: 'witar_start_time',
    ELAPSED_TIME: 'witar_elapsed_time',
    LAST_SYNC: 'witar_last_sync',
    LOCATION: 'witar_location'
  };

  // Cargar estado persistente al montar el componente
  useEffect(() => {
    loadPersistentState();
    getCurrentLocation();
    setupOnlineStatusListener();
    setupVisibilityListener();
    
    // Sincronizar con la base de datos al cargar
    syncWithDatabase();
  }, [companyId]);

  // Actualizar tiempo cada segundo si está activo
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive && startTime) {
        const now = Date.now();
        const newElapsedTime = now - startTime;
        setElapsedTime(newElapsedTime);
        
        // Guardar en localStorage cada 10 segundos
        if (Math.floor(newElapsedTime / 1000) % 10 === 0) {
          saveToLocalStorage();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Sincronizar con la base de datos cada 30 segundos
  useEffect(() => {
    if (isActive) {
      const syncInterval = setInterval(() => {
        syncWithDatabase();
      }, 30000); // 30 segundos

      return () => clearInterval(syncInterval);
    }
  }, [isActive]);

  function setupOnlineStatusListener() {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Conexión restaurada - sincronizando...');
      syncWithDatabase();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Sin conexión - guardando offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  function setupVisibilityListener() {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        console.log('🔄 Pestaña activa - sincronizando estado...');
        syncWithDatabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  function loadPersistentState() {
    try {
      const activeSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      const startTimeStr = localStorage.getItem(STORAGE_KEYS.START_TIME);
      const elapsedTimeStr = localStorage.getItem(STORAGE_KEYS.ELAPSED_TIME);
      const locationStr = localStorage.getItem(STORAGE_KEYS.LOCATION);

      if (activeSession === 'true' && startTimeStr) {
        const savedStartTime = parseInt(startTimeStr);
        const savedElapsedTime = parseInt(elapsedTimeStr) || 0;
        
        setIsActive(true);
        setStartTime(savedStartTime);
        setElapsedTime(savedElapsedTime);
        setCurrentStatus('clocked_in');
        
        console.log('📱 Estado persistente cargado:', {
          isActive: true,
          startTime: new Date(savedStartTime),
          elapsedTime: savedElapsedTime
        });
      } else {
        setCurrentStatus('clocked_out');
        setIsActive(false);
      }

      if (locationStr) {
        setLocation(JSON.parse(locationStr));
      }
    } catch (error) {
      console.error('Error loading persistent state:', error);
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, isActive.toString());
      if (startTime) {
        localStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      }
      localStorage.setItem(STORAGE_KEYS.ELAPSED_TIME, elapsedTime.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      
      if (location) {
        localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(location));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  function clearPersistentState() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing persistent state:', error);
    }
  }

  async function syncWithDatabase() {
    if (!companyId || !isActive) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar fichaje activo en la base de datos
      const { data: activeEntry, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error syncing with database:', error);
        return;
      }

      if (activeEntry) {
        // Verificar si el tiempo local coincide con el de la base de datos
        const dbStartTime = new Date(activeEntry.clock_in_time).getTime();
        const timeDiff = Math.abs(startTime - dbStartTime);
        
        // Si hay diferencia significativa (> 5 minutos), usar el tiempo de la base de datos
        if (timeDiff > 5 * 60 * 1000) {
          console.log('🔄 Corrigiendo tiempo desde base de datos');
          setStartTime(dbStartTime);
          setElapsedTime(Date.now() - dbStartTime);
          saveToLocalStorage();
        }
        
        setLastSyncTime(Date.now());
        console.log('✅ Estado sincronizado con base de datos');
      } else {
        // No hay fichaje activo en la base de datos, pero sí en localStorage
        console.log('⚠️ Fichaje activo en localStorage pero no en base de datos');
        // Intentar restaurar el fichaje
        await restoreActiveSession();
      }
    } catch (error) {
      console.error('Error syncing with database:', error);
    }
  }

  async function restoreActiveSession() {
    if (!companyId || !isActive) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timeEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: new Date(startTime).toISOString(),
        clock_in_time: new Date(startTime).toISOString(),
        status: 'active',
        ...(location && {
          location_lat: location.lat,
          location_lng: location.lng
        })
      };

      const { error } = await supabase
        .from('time_entries')
        .insert(timeEntry);

      if (error) {
        console.error('Error restoring session:', error);
      } else {
        console.log('✅ Sesión restaurada en base de datos');
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  }

  async function loadCurrentStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar fichaje activo del usuario
      const { data: activeEntry, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading status:', error);
        return;
      }

      if (activeEntry) {
        setCurrentStatus('clocked_in');
        setIsActive(true);
        const dbStartTime = new Date(activeEntry.clock_in_time).getTime();
        setStartTime(dbStartTime);
        setElapsedTime(Date.now() - dbStartTime);
        
        // Actualizar localStorage con datos de la base de datos
        saveToLocalStorage();
      } else {
        setCurrentStatus('clocked_out');
        setIsActive(false);
        setStartTime(null);
        setElapsedTime(0);
        clearPersistentState();
      }
    } catch (error) {
      console.error('Error loading current status:', error);
    }
  }

  async function getCurrentLocation() {
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          });
        });
        
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);
        localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
      } catch (error) {
        console.log('Location not available:', error);
      }
    }
  }

  async function handleClockIn() {
    if (!companyId) {
      setMessage('Error: No se pudo identificar la empresa');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      const now = new Date();
      const timeEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: now.toISOString(),
        clock_in_time: now.toISOString(),
        status: 'active',
        ...(location && {
          location_lat: location.lat,
          location_lng: location.lng
        })
      };

      const { data, error } = await supabase
        .from('time_entries')
        .insert(timeEntry)
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      setCurrentStatus('clocked_in');
      setIsActive(true);
      const startTimeMs = now.getTime();
      setStartTime(startTimeMs);
      setElapsedTime(0);
      
      // Guardar en localStorage
      saveToLocalStorage();
      
      setMessage('✅ Fichaje iniciado correctamente');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage('❌ Error al iniciar fichaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    if (!companyId) {
      setMessage('Error: No se pudo identificar la empresa');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      // Buscar el fichaje activo
      const { data: activeEntry, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw new Error('No se encontró fichaje activo');
      }

      const clockOutTime = new Date().toISOString();
      const duration = new Date(clockOutTime) - new Date(activeEntry.clock_in_time);

      // Actualizar el fichaje existente
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          entry_type: 'clock_out',
          entry_time: clockOutTime,
          clock_out_time: clockOutTime,
          status: 'completed',
          duration: duration
        })
        .eq('id', activeEntry.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      setCurrentStatus('clocked_out');
      setIsActive(false);
      setStartTime(null);
      setElapsedTime(0);
      
      // Limpiar localStorage
      clearPersistentState();
      
      setMessage('✅ Fichaje completado correctamente');
      
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage('❌ Error al finalizar fichaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function getActionButton() {
    if (currentStatus === 'clocked_in') {
      return (
        <Button
          onClick={handleClockOut}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Square className="w-4 h-4 mr-2" />
          {loading ? 'Finalizando...' : 'Finalizar Jornada'}
        </Button>
      );
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
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
            {isActive ? 'Trabajando' : 'Fuera de servicio'}
          </span>
        </div>

        {/* Tiempo transcurrido */}
        {isActive && (
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tiempo trabajado hoy
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
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
