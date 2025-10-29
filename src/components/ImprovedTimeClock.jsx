import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Play, Pause, Square, MapPin } from 'lucide-react';
import Button from './Button';
import Card from './Card';

export default function ImprovedTimeClock({ companyId, onTimeEntry }) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    loadCurrentStatus();
    getCurrentLocation();
    
    // Actualizar tiempo cada segundo si está activo
    const interval = setInterval(() => {
      if (isActive && startTime) {
        setElapsedTime(Date.now() - startTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

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
        setStartTime(new Date(activeEntry.clock_in_time).getTime());
        setElapsedTime(Date.now() - new Date(activeEntry.clock_in_time).getTime());
      } else {
        setCurrentStatus('clocked_out');
        setIsActive(false);
        setStartTime(null);
        setElapsedTime(0);
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
        
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
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

      const timeEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: new Date().toISOString(),
        clock_in_time: new Date().toISOString(),
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

      setCurrentStatus('clocked_in');
      setIsActive(true);
      setStartTime(Date.now());
      setElapsedTime(0);
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

      setCurrentStatus('clocked_out');
      setIsActive(false);
      setStartTime(null);
      setElapsedTime(0);
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

  function getStatusDisplay(status) {
    switch (status) {
      case 'clocked_in':
        return {
          text: 'Trabajando',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          icon: <Play className="w-4 h-4" />
        };
      case 'clocked_out':
        return {
          text: 'Fuera de servicio',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          icon: <Square className="w-4 h-4" />
        };
      default:
        return {
          text: 'Cargando...',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          icon: <Clock className="w-4 h-4" />
        };
    }
  }

  function getActionButton() {
    const statusInfo = getStatusDisplay(currentStatus);
    
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
      </div>
    </Card>
  );
}
