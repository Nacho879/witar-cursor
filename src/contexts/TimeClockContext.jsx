import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const TimeClockContext = createContext();

// Claves para localStorage
const STORAGE_KEYS = {
  ACTIVE_SESSION: 'witar_active_session',
  START_TIME: 'witar_start_time',
  ELAPSED_TIME: 'witar_elapsed_time',
  IS_PAUSED: 'witar_is_paused',
  PAUSE_START_TIME: 'witar_pause_start_time',
  TOTAL_PAUSED_TIME: 'witar_total_paused_time',
  LAST_SYNC: 'witar_last_sync',
  LOCATION: 'witar_location',
  COMPANY_ID: 'witar_company_id'
};

export function TimeClockProvider({ children }) {
  // Estados del fichaje
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [location, setLocation] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(false);

  // Actualizar tiempo cada segundo si está activo
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive && !isPaused && startTime) {
        const now = Date.now();
        const pausedTime = totalPausedTime + (pauseStartTime ? now - pauseStartTime : 0);
        setElapsedTime(now - startTime - pausedTime);
        
        // Guardar en localStorage cada 10 segundos
        if (Math.floor((now - startTime) / 1000) % 10 === 0) {
          saveToLocalStorage();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime, totalPausedTime, pauseStartTime]);

  function setupEventListeners() {
    // Listener para cambios de visibilidad de pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        console.log('🔄 Pestaña activa - verificando estado...');
        // La sincronización se manejará en un useEffect separado después de que syncWithDatabase esté definido
      }
    };

    // Listener para cambios de conexión
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Conexión restaurada');
      // La sincronización se manejará en un useEffect separado después de que syncWithDatabase esté definido
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Sin conexión - guardando offline');
    };

    // Listener para antes de cerrar la página
    const handleBeforeUnload = () => {
      if (isActive) {
        saveToLocalStorage();
        console.log('💾 Guardando estado antes de cerrar');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  async function checkUserCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyId(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error checking user company:', error);
    }
  }

  function loadPersistentState() {
    try {
      const activeSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      const startTimeStr = localStorage.getItem(STORAGE_KEYS.START_TIME);
      const elapsedTimeStr = localStorage.getItem(STORAGE_KEYS.ELAPSED_TIME);
      const isPausedStr = localStorage.getItem(STORAGE_KEYS.IS_PAUSED);
      const pauseStartTimeStr = localStorage.getItem(STORAGE_KEYS.PAUSE_START_TIME);
      const totalPausedTimeStr = localStorage.getItem(STORAGE_KEYS.TOTAL_PAUSED_TIME);
      const locationStr = localStorage.getItem(STORAGE_KEYS.LOCATION);
      const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      if (activeSession === 'true' && startTimeStr) {
        const savedStartTime = parseInt(startTimeStr);
        const savedElapsedTime = parseInt(elapsedTimeStr) || 0;
        const savedIsPaused = isPausedStr === 'true';
        const savedPauseStartTime = pauseStartTimeStr ? parseInt(pauseStartTimeStr) : null;
        const savedTotalPausedTime = parseInt(totalPausedTimeStr) || 0;
        
        // Verificar que el tiempo guardado no sea muy antiguo (más de 24 horas)
        const now = Date.now();
        const timeDiff = now - savedStartTime;
        const maxSessionTime = 24 * 60 * 60 * 1000; // 24 horas
        
        if (timeDiff > maxSessionTime) {
          console.log('⚠️ Sesión muy antigua, limpiando estado');
          clearLocalStorage();
          return;
        }
        
        setIsActive(true);
        setStartTime(savedStartTime);
        setElapsedTime(savedElapsedTime);
        setIsPaused(savedIsPaused);
        setPauseStartTime(savedPauseStartTime);
        setTotalPausedTime(savedTotalPausedTime);
        
        if (locationStr) {
          setLocation(JSON.parse(locationStr));
        }

        if (lastSyncStr) {
          setLastSyncTime(parseInt(lastSyncStr));
        }
        
        console.log('📱 Estado persistente cargado desde localStorage');
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
      localStorage.setItem(STORAGE_KEYS.IS_PAUSED, isPaused.toString());
      if (pauseStartTime) {
        localStorage.setItem(STORAGE_KEYS.PAUSE_START_TIME, pauseStartTime.toString());
      }
      localStorage.setItem(STORAGE_KEYS.TOTAL_PAUSED_TIME, totalPausedTime.toString());
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

  function clearLocalStorage() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Función centralizada para actualizar el estado del fichaje
  const updateTimeClockState = useCallback((newState) => {
    if (newState.isActive !== undefined) setIsActive(newState.isActive);
    if (newState.startTime !== undefined) setStartTime(newState.startTime);
    if (newState.elapsedTime !== undefined) setElapsedTime(newState.elapsedTime);
    if (newState.isPaused !== undefined) setIsPaused(newState.isPaused);
    if (newState.pauseStartTime !== undefined) setPauseStartTime(newState.pauseStartTime);
    if (newState.totalPausedTime !== undefined) setTotalPausedTime(newState.totalPausedTime);
    if (newState.location !== undefined) setLocation(newState.location);
    
    // Guardar en localStorage después de actualizar el estado
    setTimeout(() => {
      saveToLocalStorage();
    }, 100);
  }, []);

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

  const syncWithDatabase = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Solo sincronizar si hay un fichaje activo localmente
      const currentIsActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) === 'true';
      if (!currentIsActive) {
        console.log('🔍 No hay fichaje activo localmente, saltando sincronización');
        return;
      }

      // Buscar fichaje activo en la base de datos
      const { data: activeEntry, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('entry_type', 'clock_in')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error syncing with database:', error);
        return;
      }

      if (activeEntry) {
        // Verificar si hay un clock_out correspondiente
        const { data: clockOutEntry } = await supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('entry_type', 'clock_out')
          .gte('entry_time', activeEntry.entry_time)
          .order('entry_time', { ascending: false })
          .limit(1)
          .single();

        // Si hay clock_out, el fichaje está completado
        if (clockOutEntry) {
          console.log('📋 Fichaje completado en base de datos, actualizando estado local');
          updateTimeClockState({
            isActive: false,
            startTime: null,
            elapsedTime: 0,
            isPaused: false,
            totalPausedTime: 0,
            pauseStartTime: null
          });
          clearLocalStorage();
          return;
        }

        // Verificar si el tiempo local coincide con el de la base de datos
        const currentStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
        if (currentStartTime) {
          const dbStartTime = new Date(activeEntry.entry_time).getTime();
          const localStartTime = parseInt(currentStartTime);
          const timeDiff = Math.abs(localStartTime - dbStartTime);
          
          // Solo corregir si hay diferencia significativa (> 10 minutos)
          if (timeDiff > 10 * 60 * 1000) {
            console.log('🔄 Corrigiendo tiempo desde base de datos (diferencia > 10 min)');
            setStartTime(dbStartTime);
            setElapsedTime(Date.now() - dbStartTime);
            saveToLocalStorage();
          } else {
            console.log('✅ Tiempo sincronizado correctamente');
          }
        }
        
        setLastSyncTime(Date.now());
        console.log('✅ Estado sincronizado con base de datos');
      } else {
        // No hay fichaje activo en la base de datos, pero sí localmente
        console.log('⚠️ Fichaje activo en localStorage pero no en base de datos');
        // Intentar restaurar el fichaje
        await restoreActiveSession();
      }
    } catch (error) {
      console.error('Error syncing with database:', error);
    }
  }, [companyId]);

  // Cargar estado persistente al inicializar (después de definir syncWithDatabase)
  useEffect(() => {
    loadPersistentState();
    setupEventListeners();
    checkUserCompany();
    
    // Sincronizar con la base de datos solo si hay un fichaje activo
    const syncTimer = setTimeout(() => {
      const hasActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) === 'true';
      if (hasActiveSession) {
        console.log('🔄 Fichaje activo detectado, sincronizando...');
        syncWithDatabase();
      } else {
        console.log('🔍 No hay fichaje activo, saltando sincronización inicial');
      }
    }, 3000);
    
    return () => clearTimeout(syncTimer);
  }, []);

  // Sincronizar cuando la pestaña vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive && syncWithDatabase) {
        console.log('🔄 Pestaña activa - verificando estado...');
        const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        const now = Date.now();
        if (!lastSync || (now - parseInt(lastSync)) > 60000) {
          syncWithDatabase();
        } else {
          console.log('⏭️ Sincronización reciente, saltando...');
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Conexión restaurada - sincronizando...');
      const hasActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) === 'true';
      if (hasActiveSession && syncWithDatabase) {
        syncWithDatabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [isActive, syncWithDatabase]);

  // Sincronizar con la base de datos cada 2 minutos (solo si está activo)
  useEffect(() => {
    if (isActive && companyId && syncWithDatabase) {
      const syncInterval = setInterval(() => {
        syncWithDatabase();
      }, 120000); // 2 minutos

      return () => clearInterval(syncInterval);
    }
  }, [isActive, companyId, syncWithDatabase]);

  const startSession = useCallback(async (locationData = null) => {
    if (!companyId) return false;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const now = new Date();
      const timeEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: now.toISOString(),
        ...(locationData && {
          location_lat: locationData.lat,
          location_lng: locationData.lng
        })
      };

      console.log('💾 [TimeClockContext] Datos a insertar en time_entries:', timeEntry);
      console.log('📍 [TimeClockContext] Ubicación incluida:', locationData ? 'Sí' : 'No');

      const { data, error } = await supabase
        .from('time_entries')
        .insert(timeEntry)
        .select()
        .single();

      if (error) {
        console.error('❌ [TimeClockContext] Error insertando en base de datos:', error);
        throw error;
      }

      console.log('✅ [TimeClockContext] Fichaje insertado exitosamente:', data);
      console.log('📍 [TimeClockContext] Ubicación guardada:', {
        lat: data.location_lat,
        lng: data.location_lng
      });

      // Actualizar estado local
      const startTimeMs = now.getTime();
      updateTimeClockState({
        isActive: true,
        startTime: startTimeMs,
        elapsedTime: 0,
        isPaused: false,
        totalPausedTime: 0,
        pauseStartTime: null,
        location: locationData || location
      });
      
      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const endSession = useCallback(async () => {
    if (!companyId || !isActive) return false;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Buscar el fichaje activo
      const { data: activeEntry, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('entry_type', 'clock_in')
        .order('entry_time', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw new Error('No se encontró fichaje activo');
      }

      const clockOutTime = new Date().toISOString();

      // Crear entrada de salida
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: companyId,
          entry_type: 'clock_out',
          entry_time: clockOutTime
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      updateTimeClockState({
        isActive: false,
        startTime: null,
        elapsedTime: 0,
        isPaused: false,
        totalPausedTime: 0,
        pauseStartTime: null
      });
      
      // Limpiar localStorage
      clearLocalStorage();
      
      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId, isActive]);

  const pauseSession = useCallback(async () => {
    if (!companyId || !isActive || isPaused) return false;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const now = new Date();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: companyId,
          entry_type: 'break_start',
          entry_time: now.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      updateTimeClockState({
        isPaused: true,
        pauseStartTime: now.getTime()
      });
      
      return data;
    } catch (error) {
      console.error('Error pausing session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId, isActive, isPaused]);

  const resumeSession = useCallback(async () => {
    if (!companyId || !isActive || !isPaused) return false;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const now = new Date();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: companyId,
          entry_type: 'break_end',
          entry_time: now.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      const currentPauseDuration = pauseStartTime ? now.getTime() - pauseStartTime : 0;
      updateTimeClockState({
        isPaused: false,
        totalPausedTime: totalPausedTime + currentPauseDuration,
        pauseStartTime: null
      });
      
      return data;
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId, isActive, isPaused, pauseStartTime]);

  const getCurrentLocation = useCallback(async () => {
    console.log('🌍 [TimeClockContext] Intentando obtener ubicación GPS...');
    
    if (navigator.geolocation) {
      try {
        console.log('📍 [TimeClockContext] Geolocalización disponible, solicitando posición...');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, // Aumentar timeout a 10 segundos
            enableHighAccuracy: true, // Habilitar alta precisión
            maximumAge: 300000 // Cache de 5 minutos
          });
        });
        
        console.log('✅ [TimeClockContext] Ubicación obtenida:', {
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
        console.log('💾 [TimeClockContext] Ubicación guardada en localStorage');
        return newLocation;
      } catch (error) {
        console.error('❌ [TimeClockContext] Error obteniendo ubicación GPS:', error);
        return null;
      }
    } else {
      console.log('❌ [TimeClockContext] Geolocalización no disponible en este navegador');
    }
    return null;
  }, []);

  const formatTime = useCallback((milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const forceSync = useCallback(async () => {
    console.log('🔄 Forzando sincronización...');
    await syncWithDatabase();
  }, [syncWithDatabase]);

  // Función para sincronización manual (solo cuando el usuario lo solicite)
  const manualSync = useCallback(async () => {
    console.log('🔄 Sincronización manual iniciada...');
    const hasActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) === 'true';
    if (hasActiveSession) {
      await syncWithDatabase();
    } else {
      console.log('🔍 No hay fichaje activo para sincronizar');
    }
  }, [syncWithDatabase]);

  const value = {
    // Estados
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
    
    // Funciones
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    getCurrentLocation,
    syncWithDatabase,
    forceSync,
    manualSync,
    formatTime,
    saveToLocalStorage,
    clearLocalStorage,
    updateTimeClockState
  };

  return (
    <TimeClockContext.Provider value={value}>
      {children}
    </TimeClockContext.Provider>
  );
}

export function useTimeClock() {
  const context = useContext(TimeClockContext);
  if (!context) {
    throw new Error('useTimeClock must be used within a TimeClockProvider');
  }
  return context;
}
