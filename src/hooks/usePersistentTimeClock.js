import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STORAGE_KEYS = {
  ACTIVE_SESSION: 'witar_active_session',
  START_TIME: 'witar_start_time',
  ELAPSED_TIME: 'witar_elapsed_time',
  LAST_SYNC: 'witar_last_sync',
  LOCATION: 'witar_location',
  COMPANY_ID: 'witar_company_id'
};

export function usePersistentTimeClock(companyId) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [location, setLocation] = useState(null);

  // Cargar estado persistente al inicializar
  useEffect(() => {
    loadPersistentState();
    setupOnlineStatusListener();
    setupVisibilityListener();
  }, []);

  // Sincronizar con la base de datos cuando cambie companyId
  useEffect(() => {
    if (companyId) {
      syncWithDatabase();
    }
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
    if (isActive && companyId) {
      const syncInterval = setInterval(() => {
        syncWithDatabase();
      }, 30000); // 30 segundos

      return () => clearInterval(syncInterval);
    }
  }, [isActive, companyId]);

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
      const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      if (activeSession === 'true' && startTimeStr) {
        const savedStartTime = parseInt(startTimeStr);
        const savedElapsedTime = parseInt(elapsedTimeStr) || 0;
        
        setIsActive(true);
        setStartTime(savedStartTime);
        setElapsedTime(savedElapsedTime);
        
        console.log('📱 Estado persistente cargado:', {
          isActive: true,
          startTime: new Date(savedStartTime),
          elapsedTime: savedElapsedTime
        });
      }

      if (locationStr) {
        setLocation(JSON.parse(locationStr));
      }

      if (lastSyncStr) {
        setLastSyncTime(parseInt(lastSyncStr));
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
      
      if (companyId) {
        localStorage.setItem(STORAGE_KEYS.COMPANY_ID, companyId);
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

  const syncWithDatabase = useCallback(async () => {
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
  }, [companyId, isActive, startTime, location]);

  const restoreActiveSession = useCallback(async () => {
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
  }, [companyId, isActive, startTime, location]);

  const startSession = useCallback(async (locationData = null) => {
    if (!companyId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const now = new Date();
      const timeEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: now.toISOString(),
        clock_in_time: now.toISOString(),
        status: 'active',
        ...(locationData && {
          location_lat: locationData.lat,
          location_lng: locationData.lng
        })
      };

      console.log('💾 [usePersistentTimeClock] Datos a insertar en time_entries:', timeEntry);
      console.log('📍 [usePersistentTimeClock] Ubicación incluida:', locationData ? 'Sí' : 'No');

      const { data, error } = await supabase
        .from('time_entries')
        .insert(timeEntry)
        .select()
        .single();

      if (error) {
        console.error('❌ [usePersistentTimeClock] Error insertando en base de datos:', error);
        throw error;
      }

      console.log('✅ [usePersistentTimeClock] Fichaje insertado exitosamente:', data);
      console.log('📍 [usePersistentTimeClock] Ubicación guardada:', {
        lat: data.location_lat,
        lng: data.location_lng
      });

      // Actualizar estado local
      setIsActive(true);
      const startTimeMs = now.getTime();
      setStartTime(startTimeMs);
      setElapsedTime(0);
      
      if (locationData) {
        setLocation(locationData);
      }
      
      // Guardar en localStorage
      saveToLocalStorage();
      
      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }, [companyId]);

  const endSession = useCallback(async () => {
    if (!companyId || !isActive) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

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
      setIsActive(false);
      setStartTime(null);
      setElapsedTime(0);
      
      // Limpiar localStorage
      clearPersistentState();
      
      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }, [companyId, isActive]);

  const getCurrentLocation = useCallback(async () => {
    console.log('🌍 [usePersistentTimeClock] Intentando obtener ubicación GPS...');
    
    if (navigator.geolocation) {
      try {
        console.log('📍 [usePersistentTimeClock] Geolocalización disponible, solicitando posición...');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, // Aumentar timeout a 10 segundos
            enableHighAccuracy: true, // Habilitar alta precisión
            maximumAge: 300000 // Cache de 5 minutos
          });
        });
        
        console.log('✅ [usePersistentTimeClock] Ubicación obtenida:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);
        localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(newLocation));
        console.log('💾 [usePersistentTimeClock] Ubicación guardada en localStorage');
        return newLocation;
      } catch (error) {
        console.error('❌ [usePersistentTimeClock] Error obteniendo ubicación GPS:', error);
        return null;
      }
    } else {
      console.log('❌ [usePersistentTimeClock] Geolocalización no disponible en este navegador');
    }
    return null;
  }, []);

  return {
    isActive,
    startTime,
    elapsedTime,
    isOnline,
    lastSyncTime,
    location,
    startSession,
    endSession,
    syncWithDatabase,
    getCurrentLocation,
    saveToLocalStorage,
    clearPersistentState
  };
}
