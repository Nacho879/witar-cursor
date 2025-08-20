import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  LogIn, 
  LogOut, 
  Coffee, 
  Play, 
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Función de utilidad fuera del componente
function getStatusDisplay(currentStatus) {
  switch (currentStatus) {
    case 'out':
      return {
        text: 'Fuera de servicio',
        color: 'text-red-600 bg-red-100',
        icon: LogOut
      };
    case 'in':
      return {
        text: 'En servicio',
        color: 'text-green-600 bg-green-100',
        icon: LogIn
      };
    case 'break':
      return {
        text: 'En pausa',
        color: 'text-yellow-600 bg-yellow-100',
        icon: Coffee
      };
    default:
      return {
        text: 'Desconocido',
        color: 'text-gray-600 bg-gray-100',
        icon: Clock
      };
  }
}

export default function TimeClock({ onTimeEntry }) {
  const [loading, setLoading] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState('out'); // out, in, break
  const [lastEntry, setLastEntry] = React.useState(null);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [companyId, setCompanyId] = React.useState(null);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    loadCurrentStatus();
    loadCompanyId();
    
    // Actualizar la hora cada segundo
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadCompanyId() {
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
      console.error('Error loading company ID:', error);
    }
  }

  async function loadCurrentStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Obtener el último fichaje del día
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', today.toISOString())
        .order('entry_time', { ascending: false })
        .limit(1);

      if (!error && entries && entries.length > 0) {
        const lastEntry = entries[0];
        setLastEntry(lastEntry);

        // Determinar el estado actual basado en el último fichaje
        switch (lastEntry.entry_type) {
          case 'clock_in':
            setCurrentStatus('in');
            break;
          case 'break_start':
            setCurrentStatus('break');
            break;
          case 'break_end':
            setCurrentStatus('in');
            break;
          case 'clock_out':
            setCurrentStatus('out');
            break;
          default:
            setCurrentStatus('out');
        }
      }
    } catch (error) {
      console.error('Error loading current status:', error);
    }
  }

  async function createTimeEntry(entryType) {
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

      // Obtener ubicación si está disponible
      let locationData = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          
          locationData = {
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude
          };
        } catch (error) {
        }
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: companyId,
          entry_type: entryType,
          entry_time: new Date().toISOString(),
          ...locationData
        })
        .select()
        .single();

      if (error) throw error;

      setMessage('✅ Fichaje registrado exitosamente');
      
      // Actualizar el estado
      await loadCurrentStatus();
      
      // Notificar al componente padre
      if (onTimeEntry) {
        onTimeEntry(data);
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error creating time entry:', error);
      setMessage('Error al registrar el fichaje');
    } finally {
      setLoading(false);
    }
  }

  function getActionButton() {
    const statusInfo = getStatusDisplay(currentStatus);

    switch (currentStatus) {
      case 'out':
        return (
          <button
            onClick={() => createTimeEntry('clock_in')}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            Registrar Entrada
          </button>
        );

      case 'in':
        return (
          <div className="space-y-3">
            <button
              onClick={() => createTimeEntry('break_start')}
              disabled={loading}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Coffee className="w-5 h-5" />
              )}
              Iniciar Pausa
            </button>
            <button
              onClick={() => createTimeEntry('clock_out')}
              disabled={loading}
              className="btn btn-destructive w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              Registrar Salida
            </button>
          </div>
        );

      case 'break':
        return (
          <button
            onClick={() => createTimeEntry('break_end')}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Play className="w-5 h-5" />
            )}
            Finalizar Pausa
          </button>
        );

      default:
        return null;
    }
  }

  const statusInfo = getStatusDisplay(currentStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Control de Asistencia</h2>
        <div className="text-4xl font-mono text-foreground">
          {currentTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {currentTime.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusInfo.text}
        </div>
      </div>

      {/* Last Entry Info */}
      {lastEntry && (
        <div className="bg-secondary p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Último fichaje:</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {lastEntry.entry_type === 'clock_in' && 'Entrada'}
                {lastEntry.entry_type === 'clock_out' && 'Salida'}
                {lastEntry.entry_type === 'break_start' && 'Inicio de pausa'}
                {lastEntry.entry_type === 'break_end' && 'Fin de pausa'}
              </p>
              <p className="text-sm font-medium text-foreground">
                {new Date(lastEntry.entry_time).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {lastEntry.location_lat && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                Ubicación
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mb-4">
        {getActionButton()}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.includes('Error')
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : 'bg-success/10 text-success border border-success/20'
        }`}>
          {message.includes('Error') ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {message}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center">
        <p>Tu fichaje se registra automáticamente con la hora actual</p>
        {navigator.geolocation && (
          <p className="mt-1">Se incluye tu ubicación si está disponible</p>
        )}
      </div>
    </div>
  );
} 