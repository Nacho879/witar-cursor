import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'unknown', 'granted', 'denied', 'prompt'

  // Verificar estado de permisos
  const checkPermissionStatus = useCallback(async () => {
    if (!navigator.permissions) {
      setPermissionStatus('unknown');
      return 'unknown';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(result.state);
      return result.state;
    } catch (error) {
      console.log('No se puede verificar permisos:', error);
      setPermissionStatus('unknown');
      return 'unknown';
    }
  }, []);

  // Solicitar ubicación con manejo de permisos
  const requestLocation = useCallback(async (options = {}) => {
    // Verificar contexto seguro (HTTPS requerido en producción)
    const isSecureContext = window.isSecureContext || 
      window.location.protocol === 'https:' || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';
    
    if (!isSecureContext) {
      const error = new Error('La geolocalización requiere HTTPS. Por favor, accede al sitio usando https://witar.es');
      setError(error);
      setIsLoading(false);
      return { location: null, error };
    }

    if (!navigator.geolocation) {
      const error = new Error('Geolocalización no soportada por este navegador');
      setError(error);
      return { location: null, error };
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('✅ [useGeolocation] Contexto seguro verificado:', {
        isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });

      // Verificar permisos primero
      const permission = await checkPermissionStatus();
      
      if (permission === 'denied') {
        const error = new Error('Permisos de geolocalización denegados. Debes habilitar la ubicación para poder fichar.');
        setError(error);
        setIsLoading(false);
        return { location: null, error };
      }

      console.log('🌍 Solicitando ubicación GPS...');
      console.log('📍 Estado de permisos:', permission);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000, // 15 segundos
          enableHighAccuracy: true,
          maximumAge: 0, // No usar cache
          ...options
        });
      });

      const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp)
      };

      console.log('✅ Ubicación obtenida:', locationData);
      setLocation(locationData);
      setError(null);
      setIsLoading(false);

      return { location: locationData, error: null };

    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : undefined;
      const errorName = error && typeof error === 'object' ? error.name : undefined;
      
      console.error('❌ Error obteniendo ubicación:', {
        code,
        name: errorName,
        message: error.message,
        error,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        isSecureContext: window.isSecureContext
      });
      
      let errorMessage = 'Error desconocido obteniendo ubicación';
      
      // Verificar contexto seguro primero
      const isSecureContext = window.isSecureContext || 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        errorMessage = 'La geolocalización requiere HTTPS. Por favor, accede usando https://witar.es';
      } else if (code === error.PERMISSION_DENIED || code === 1 || errorName === 'NotAllowedError') {
        errorMessage = 'Permisos de geolocalización denegados. Debes habilitar la ubicación para poder fichar.';
        setPermissionStatus('denied');
      } else if (code === error.POSITION_UNAVAILABLE || code === 2 || errorName === 'PositionUnavailableError') {
        errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado.';
      } else if (code === error.TIMEOUT || code === 3 || errorName === 'TimeoutError') {
        errorMessage = 'Tiempo de espera agotado. Intenta de nuevo.';
      } else {
        errorMessage = error.message || 'Error obteniendo ubicación. Verifica que estés usando HTTPS.';
      }

      const finalError = new Error(errorMessage);
      setError(finalError);
      setIsLoading(false);

      return { location: null, error: finalError };
    }
  }, [checkPermissionStatus]);

  // Forzar solicitud de permisos
  const requestPermission = useCallback(async () => {
    console.log('🔐 Solicitando permisos de geolocalización...');
    
    try {
      const result = await requestLocation();
      return result;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return { location: null, error };
    }
  }, [requestLocation]);

  // Verificar si se puede fichar (tiene permisos)
  const canClockIn = useCallback(async () => {
    const permission = await checkPermissionStatus();
    return permission !== 'denied';
  }, [checkPermissionStatus]);

  // Obtener mensaje de estado
  const getStatusMessage = useCallback(() => {
    switch (permissionStatus) {
      case 'granted':
        return { type: 'success', message: '✅ Permisos de ubicación concedidos' };
      case 'denied':
        return { type: 'error', message: '❌ Permisos de ubicación denegados. Debes habilitar la ubicación para fichar.' };
      case 'prompt':
        return { type: 'warning', message: '⚠️ Se solicitarán permisos de ubicación al fichar' };
      default:
        return { type: 'info', message: 'ℹ️ Estado de permisos desconocido' };
    }
  }, [permissionStatus]);

  // Verificar permisos al montar el componente
  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  return {
    location,
    error,
    isLoading,
    permissionStatus,
    requestLocation,
    requestPermission,
    canClockIn,
    getStatusMessage,
    checkPermissionStatus
  };
};
