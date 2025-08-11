import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Calendar, 
  Filter,
  Download,
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  Search
} from 'lucide-react';

export default function MyTimeEntries() {
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stats, setStats] = React.useState({
    totalHours: 0,
    totalDays: 0,
    averageHours: 0
  });

  React.useEffect(() => {
    loadTimeEntries();
  }, [selectedDate]);

  async function loadTimeEntries() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', startDate.toISOString())
        .lte('entry_time', endDate.toISOString())
        .order('entry_time', { ascending: true });

      if (!error && data) {
        setTimeEntries(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(entries) {
    if (entries.length === 0) {
      setStats({ totalHours: 0, totalDays: 0, averageHours: 0 });
      return;
    }

    // Calcular horas trabajadas
    let totalMinutes = 0;
    let clockInTime = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (entry.entry_type === 'clock_in') {
        clockInTime = new Date(entry.entry_time);
      } else if (entry.entry_type === 'clock_out' && clockInTime) {
        const clockOutTime = new Date(entry.entry_time);
        const diffMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        totalMinutes += diffMinutes;
        clockInTime = null;
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const totalDays = new Set(entries.map(e => e.entry_time.split('T')[0])).size;
    const averageHours = totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0;

    setStats({ totalHours, totalDays, averageHours });
  }

  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return { text: 'Entrada', icon: LogIn, color: 'text-green-600 bg-green-100' };
      case 'clock_out': return { text: 'Salida', icon: LogOut, color: 'text-red-600 bg-red-100' };
      case 'break_start': return { text: 'Inicio Pausa', icon: Coffee, color: 'text-yellow-600 bg-yellow-100' };
      case 'break_end': return { text: 'Fin Pausa', icon: Coffee, color: 'text-blue-600 bg-blue-100' };
      default: return { text: type, icon: Clock, color: 'text-gray-600 bg-gray-100' };
    }
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const filteredEntries = timeEntries.filter(entry => {
    if (searchTerm) {
      const entryType = getEntryTypeDisplay(entry.entry_type).text.toLowerCase();
      return entryType.includes(searchTerm.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Fichajes</h1>
          <p className="text-muted-foreground mt-1">
            Historial de entradas, salidas y pausas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Trabajadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              Hoy
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Promedio Diario</p>
              <p className="text-3xl font-bold text-foreground">{stats.averageHours}h</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Últimos {stats.totalDays} días
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fichajes Hoy</p>
              <p className="text-3xl font-bold text-foreground">{timeEntries.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Registros
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadTimeEntries}
              className="btn btn-primary"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Time Entries List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Fichajes del {formatDate(selectedDate)}
            </h3>
            <button
              onClick={() => {
                // Función para exportar (implementar después)
                alert('Función de exportación próximamente');
              }}
              className="btn btn-ghost btn-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay fichajes registrados para esta fecha
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const entryInfo = getEntryTypeDisplay(entry.entry_type);
                const EntryIcon = entryInfo.icon;
                
                return (
                  <div key={entry.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <EntryIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{entryInfo.text}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(entry.entry_time)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${entryInfo.color}`}>
                            {entryInfo.text}
                          </span>
                          {entry.location_lat && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              Ubicación
                            </div>
                          )}
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
