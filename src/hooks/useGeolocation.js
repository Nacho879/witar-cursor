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
    if (!navigator.geolocation) {
      const error = new Error('Geolocalización no soportada por este navegador');
      setError(error);
      return { location: null, error };
    }

    setIsLoading(true);
    setError(null);

    try {
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
      console.error('❌ Error obteniendo ubicación:', error);
      
      let errorMessage = 'Error desconocido obteniendo ubicación';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permisos de geolocalización denegados. Debes habilitar la ubicación para poder fichar.';
          setPermissionStatus('denied');
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Ubicación no disponible. Verifica que el GPS esté activado.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tiempo de espera agotado. Intenta de nuevo.';
          break;
        default:
          errorMessage = error.message || 'Error obteniendo ubicación';
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
