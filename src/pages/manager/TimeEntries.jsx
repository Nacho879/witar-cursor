import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Search, 
  Calendar,
  User,
  Eye,
  TrendingUp,
  Activity,
  MapPin,
  X
} from 'lucide-react';

export default function ManagerTimeEntries() {
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = React.useState('all');
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [selectedLocation, setSelectedLocation] = React.useState(null);

  React.useEffect(() => {
    loadTimeEntriesData();
  }, [selectedDate, selectedEmployee]);

  async function loadTimeEntriesData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el ID del manager actual
      const { data: managerRole } = await supabase
        .from('user_company_roles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .eq('role', 'manager')
        .eq('is_active', true)
        .single();

      if (managerRole) {
        // Primero, obtener el departamento del manager
        const { data: managerDepartment } = await supabase
          .from('user_company_roles')
          .select('department_id')
          .eq('id', managerRole.id)
          .single();

        let teamUserIds = [];

        if (managerDepartment?.department_id) {
          // Obtener IDs de todos los empleados del departamento
          const { data: departmentMembers, error: deptError } = await supabase
            .from('user_company_roles')
            .select('user_id')
            .eq('company_id', managerRole.company_id)
            .eq('department_id', managerDepartment.department_id)
            .eq('is_active', true)
            .neq('role', 'manager');

          if (!deptError && departmentMembers) {
            teamUserIds = departmentMembers.map(member => member.user_id);
          }
        } else {
          // Si no tiene departamento, obtener empleados con supervisor_id
          const { data: supervisedMembers, error: supError } = await supabase
            .from('user_company_roles')
            .select('user_id')
            .eq('company_id', managerRole.company_id)
            .eq('supervisor_id', managerRole.id)
            .eq('is_active', true);

          if (!supError && supervisedMembers) {
            teamUserIds = supervisedMembers.map(member => member.user_id);
          }
        }

        if (teamUserIds.length > 0) {
          // Cargar fichajes del equipo
          const startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);

          let query = supabase
            .from('time_entries')
            .select('*')
            .in('user_id', teamUserIds)
            .gte('entry_time', startDate.toISOString())
            .lte('entry_time', endDate.toISOString())
            .order('entry_time', { ascending: true });

          if (selectedEmployee !== 'all') {
            query = query.eq('user_id', selectedEmployee);
          }

          const { data: entries, error } = await query;

          if (!error && entries) {
            // Obtener perfiles de usuario para mostrar nombres
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name')
              .in('user_id', teamUserIds);

            if (!profilesError && profiles) {
              const entriesWithProfiles = entries.map(entry => {
                const profile = profiles.find(p => p.user_id === entry.user_id);
                return {
                  ...entry,
                  employee_name: profile?.full_name || 'Usuario sin nombre'
                };
              });

              setTimeEntries(entriesWithProfiles);
            } else {
              setTimeEntries(entries);
            }
          }

          // Cargar lista de miembros del equipo para el filtro
          const { data: teamProfiles, error: teamError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', teamUserIds);

          if (!teamError && teamProfiles) {
            setTeamMembers(teamProfiles);
          }
        } else {
          setTimeEntries([]);
          setTeamMembers([]);
        }
      }
    } catch (error) {
      console.error('Error loading time entries data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return 'Entrada';
      case 'clock_out': return 'Salida';
      case 'break_start': return 'Inicio Pausa';
      case 'break_end': return 'Fin Pausa';
      default: return type;
    }
  }

  function getEntryTypeColor(type) {
    switch (type) {
      case 'clock_in': return 'text-green-600 bg-green-100';
      case 'clock_out': return 'text-red-600 bg-red-100';
      case 'break_start': return 'text-blue-600 bg-blue-100';
      case 'break_end': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function showLocation(entry) {
    if (entry.location_lat && entry.location_lng) {
      setSelectedLocation({
        lat: entry.location_lat,
        lng: entry.location_lng,
        employee: entry.employee_name,
        time: formatTime(entry.entry_time),
        date: new Date(entry.entry_time).toLocaleDateString('es-ES'),
        type: getEntryTypeDisplay(entry.entry_type)
      });
      setIsLocationModalOpen(true);
    } else {
      alert('No hay datos de ubicación disponibles para este fichaje');
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const employeeName = entry.employee_name?.toLowerCase() || '';
      return employeeName.includes(searchLower);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Fichajes de mi Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Supervisa los fichajes de los miembros de tu equipo
          </p>
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
            <label className="block text-sm font-medium mb-2">Empleado</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input"
            >
              <option value="all">Todos los empleados</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar empleados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Fichajes - {new Date(selectedDate).toLocaleDateString('es-ES')}
          </h3>
        </div>
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No hay fichajes que coincidan con la búsqueda' : 'No hay fichajes para esta fecha'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="th">Empleado</th>
                    <th className="th">Tipo</th>
                    <th className="th">Hora</th>
                    <th className="th">Fecha</th>
                    <th className="th">Notas</th>
                    <th className="th">Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-secondary/50">
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{entry.employee_name}</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(entry.entry_type)}`}>
                          {getEntryTypeDisplay(entry.entry_type)}
                        </span>
                      </td>
                      <td className="td font-mono">
                        {formatTime(entry.entry_time)}
                      </td>
                      <td className="td">
                        {new Date(entry.entry_time).toLocaleDateString('es-ES')}
                      </td>
                      <td className="td">
                        <span className="text-muted-foreground">
                          {entry.notes || '-'}
                        </span>
                      </td>
                      <td className="td">
                        <button
                          onClick={() => showLocation(entry)}
                          className={`btn btn-sm ${entry.location_lat && entry.location_lng ? 'btn-primary' : 'btn-ghost'}`}
                          disabled={!entry.location_lat || !entry.location_lng}
                        >
                          <MapPin className="w-4 h-4" />
                          {entry.location_lat && entry.location_lng ? 'Ver Ubicación' : 'Sin ubicación'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      {isLocationModalOpen && selectedLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Ubicación del Fichaje</h3>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{selectedLocation.employee}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{selectedLocation.time} - {selectedLocation.date}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span>{selectedLocation.type}</span>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Coordenadas:</span>
                </div>
                <div className="bg-secondary p-3 rounded-lg">
                  <p className="text-sm font-mono">
                    Latitud: {selectedLocation.lat}
                  </p>
                  <p className="text-sm font-mono">
                    Longitud: {selectedLocation.lng}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <a
                  href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Ver en Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
