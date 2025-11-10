import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sailboat, ChevronLeft, ChevronRight } from 'lucide-react';

function VacationsCalendar({ companyId, teamUserIds }) {
  // Normalizar selectedDate a medianoche para evitar re-renders innecesarios
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [currentWeek, setCurrentWeek] = React.useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para que la semana empiece en lunes
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [requests, setRequests] = React.useState([]);

  // Referencias para comparar valores anteriores y evitar recargas innecesarias
  const prevCompanyIdRef = React.useRef(null);
  const prevTeamUserIdsRef = React.useRef(null);
  const prevCurrentWeekRef = React.useRef(null);
  
  // Referencias para el efecto de perfiles (separadas)
  const prevProfilesCompanyIdRef = React.useRef(null);
  const prevProfilesTeamUserIdsRef = React.useRef(null);
  
  // Cache de perfiles de usuario para evitar recargas innecesarias
  const profilesCacheRef = React.useRef({});
  
  // Ref para rastrear si los perfiles se están cargando
  const profilesLoadingRef = React.useRef(false);

  // Meses en español
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Días de la semana
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Función para comparar arrays por contenido
  const arraysEqual = (a, b) => {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // Función para comparar fechas (solo día, mes y año, normalizando a medianoche)
  const datesEqual = (a, b) => {
    if (!a || !b) return a === b;
    // Normalizar ambas fechas a medianoche para comparar solo día/mes/año
    const dateA = new Date(a);
    dateA.setHours(0, 0, 0, 0);
    const dateB = new Date(b);
    dateB.setHours(0, 0, 0, 0);
    return dateA.getTime() === dateB.getTime();
  };
  
  // Función para normalizar una fecha a medianoche (solo día/mes/año)
  const normalizeDate = React.useCallback((date) => {
    if (!date) return null;
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);

  // Obtener las fechas de la semana actual (normalizadas)
  const getWeekDates = React.useCallback((weekStart) => {
    const dates = [];
    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  }, []);

  // Memorizar teamUserIds para evitar recreaciones innecesarias
  const stableTeamUserIds = React.useMemo(() => {
    if (!teamUserIds || teamUserIds.length === 0) return null;
    return [...teamUserIds].sort().join(',');
  }, [teamUserIds]);

  // Normalizar currentWeek para comparaciones estables
  const normalizedCurrentWeek = React.useMemo(() => {
    return normalizeDate(currentWeek);
  }, [currentWeek, normalizeDate]);

  // Cargar TODOS los perfiles del equipo una sola vez cuando cambia el equipo
  React.useEffect(() => {
    const companyIdChanged = prevProfilesCompanyIdRef.current !== companyId;
    const teamUserIdsChanged = prevProfilesTeamUserIdsRef.current !== stableTeamUserIds;
    const isFirstLoad = prevProfilesCompanyIdRef.current === null;

    // Solo cargar perfiles si cambió el equipo o es la primera carga
    if (isFirstLoad || companyIdChanged || teamUserIdsChanged) {
      // Actualizar referencias
      prevProfilesCompanyIdRef.current = companyId;
      prevProfilesTeamUserIdsRef.current = stableTeamUserIds;
      
      if (companyId && teamUserIds && teamUserIds.length > 0) {
        // Limpiar cache anterior
        profilesCacheRef.current = {};
        profilesLoadingRef.current = true;
        
        // Cargar TODOS los perfiles del equipo de una vez
        const loadAllProfiles = async () => {
          try {
            const { data: profiles, error } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, avatar_url')
              .in('user_id', teamUserIds);
            
            if (error) throw error;
            
            if (profiles) {
              // Guardar todos los perfiles en el cache
              profiles.forEach(profile => {
                profilesCacheRef.current[profile.user_id] = {
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url
                };
              });
            }
          } catch (error) {
            console.error('Error loading profiles:', error);
          } finally {
            profilesLoadingRef.current = false;
            // Actualizar solicitudes si hay alguna cargada
            setRequests(prevRequests => {
              if (prevRequests.length === 0) return prevRequests;
              
              const profilesMap = { ...profilesCacheRef.current };
              const needsUpdate = prevRequests.some(request => {
                const profile = profilesMap[request.user_id];
                return profile && (
                  request.employeeName === 'Usuario desconocido' || 
                  (!request.avatarUrl && profile.avatar_url)
                );
              });
              
              if (!needsUpdate) return prevRequests;
              
              return prevRequests.map(request => {
                const profile = profilesMap[request.user_id];
                if (profile) {
                  return {
                    ...request,
                    employeeName: profile.full_name || request.employeeName,
                    avatarUrl: profile.avatar_url ?? request.avatarUrl
                  };
                }
                return request;
              });
            });
          }
        };

        loadAllProfiles();
      } else {
        // Si no hay datos, limpiar el cache
        profilesCacheRef.current = {};
        profilesLoadingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, stableTeamUserIds]);

  // Cargar solicitudes aprobadas del equipo (solo cuando cambia la semana)
  React.useEffect(() => {
    // Verificar si realmente cambiaron los valores
    const companyIdChanged = prevCompanyIdRef.current !== companyId;
    const teamUserIdsChanged = prevTeamUserIdsRef.current !== stableTeamUserIds;
    const currentWeekChanged = !datesEqual(prevCurrentWeekRef.current, normalizedCurrentWeek);

    // Si es la primera carga o si realmente cambió algo
    const isFirstLoad = prevCompanyIdRef.current === null;
    
    // Si no hay cambios reales, no hacer nada
    if (!isFirstLoad && !companyIdChanged && !teamUserIdsChanged && !currentWeekChanged) {
      return;
    }
    
    // Actualizar referencias primero
    prevCompanyIdRef.current = companyId;
    prevTeamUserIdsRef.current = stableTeamUserIds;
    prevCurrentWeekRef.current = normalizedCurrentWeek ? new Date(normalizedCurrentWeek) : null;
    
    if (companyId && teamUserIds && teamUserIds.length > 0) {
      // Función async interna para cargar solo las solicitudes
      const loadRequests = async () => {
        try {
          // Obtener el rango de fechas de la semana actual usando la fecha normalizada
          const weekStart = normalizedCurrentWeek || currentWeek;
          const weekDates = getWeekDates(weekStart);
          const startDate = weekDates[0];
          const endDate = weekDates[6];
          
          // Obtener SOLO solicitudes aprobadas que se solapen con la semana actual
          const { data: approvedRequests, error } = await supabase
            .from('requests')
            .select(`
              id,
              user_id,
              request_type,
              start_date,
              end_date,
              status
            `)
            .eq('company_id', companyId)
            .in('user_id', teamUserIds)
            .eq('status', 'approved')
            .lte('start_date', endDate.toISOString().split('T')[0])
            .gte('end_date', startDate.toISOString().split('T')[0]);

          if (error) throw error;

          // Usar SOLO el cache de perfiles (ya cargados previamente)
          // NO limpiar el cache, solo usar los que ya están
          const profilesMap = { ...profilesCacheRef.current };

          // Mapear solicitudes con nombres y avatares usando el cache
          // Si el perfil no está en cache, usar los datos anteriores si existen
          setRequests(prevRequests => {
            const requestsWithNames = (approvedRequests || []).map(request => {
              // Buscar si ya tenemos esta solicitud con datos de perfil
              const existingRequest = prevRequests.find(r => r.id === request.id);
              
              // Usar perfil del cache si está disponible, sino usar los datos anteriores
              const profile = profilesMap[request.user_id];
              const employeeName = profile?.full_name || existingRequest?.employeeName || 'Usuario desconocido';
              const avatarUrl = profile?.avatar_url ?? existingRequest?.avatarUrl ?? null;
              
              return {
                ...request,
                employeeName,
                avatarUrl
              };
            });
            
            return requestsWithNames;
          });
        } catch (error) {
          console.error('Error loading requests:', error);
          // No limpiar las solicitudes en caso de error, mantener las anteriores
        }
      };

      loadRequests();
    } else {
      // Si no hay datos, limpiar las solicitudes
      setRequests([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, stableTeamUserIds, normalizedCurrentWeek, getWeekDates]);

  // Obtener solicitudes para una fecha específica
  const getRequestsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return requests.filter(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Navegar a la semana anterior
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    newWeek.setHours(0, 0, 0, 0);
    setCurrentWeek(newWeek);
  };

  // Navegar a la semana siguiente
  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    newWeek.setHours(0, 0, 0, 0);
    setCurrentWeek(newWeek);
  };
  
  // Función para seleccionar una fecha (normalizada)
  const handleDateSelect = React.useCallback((date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
  }, []);

  // Obtener el tipo de solicitud en español
  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'vacation':
        return 'Vacaciones';
      case 'sick_leave':
        return 'Baja médica';
      case 'personal_leave':
        return 'Permiso Personal';
      default:
        return 'Ausencia';
    }
  };

  // Obtener el color según el tipo de solicitud
  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'vacation':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'sick_leave':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'personal_leave':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const weekDates = getWeekDates(currentWeek);
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDateRequests = getRequestsForDate(selectedDate);
  const currentMonth = months[currentWeek.getMonth()];
  const currentYear = currentWeek.getFullYear();

  return (
    <div className="card w-full" style={{ height: '304px', display: 'flex', flexDirection: 'column' }}>
      <div className="border-b border-border flex-shrink-0" style={{ padding: '16px' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Sailboat className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">Vacaciones y ausencias</h3>
        </div>
      </div>
      <div className="p-4 md:p-6 flex-1">
        {/* Navegación del mes y año */}
        <div className="text-center mb-4">
          <p className="text-lg font-medium text-foreground">
            {currentMonth} {currentYear}
          </p>
        </div>

        {/* Días de la semana y fechas */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1 hover:bg-secondary rounded transition-colors"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex gap-1 flex-1 justify-center">
                  {weekDays.map((day, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{day}</div>
                  <button
                    onClick={() => handleDateSelect(weekDates[index])}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      weekDates[index].toISOString().split('T')[0] === selectedDateStr
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-2 border-orange-500'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    {weekDates[index].getDate()}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={goToNextWeek}
              className="p-1 hover:bg-secondary rounded transition-colors"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Información del día seleccionado */}
        <div className="mt-6">
          {selectedDateRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Sin ausencias ni vacaciones en el día seleccionado
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDateRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Foto de perfil */}
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {request.avatarUrl ? (
                        <img 
                          src={request.avatarUrl} 
                          alt={request.employeeName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {request.employeeName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{request.employeeName}</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {getRequestTypeLabel(request.request_type)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(request.start_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short'
                      })}
                      {request.start_date !== request.end_date && (
                        <>
                          {' - '}
                          {new Date(request.end_date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export default React.memo(VacationsCalendar, (prevProps, nextProps) => {
  // Comparar companyId
  if (prevProps.companyId !== nextProps.companyId) return false;
  
  // Comparar teamUserIds por contenido, no por referencia
  if (!prevProps.teamUserIds && !nextProps.teamUserIds) return true;
  if (!prevProps.teamUserIds || !nextProps.teamUserIds) return false;
  if (prevProps.teamUserIds.length !== nextProps.teamUserIds.length) return false;
  
  const prevSorted = [...prevProps.teamUserIds].sort().join(',');
  const nextSorted = [...nextProps.teamUserIds].sort().join(',');
  
  return prevSorted === nextSorted;
});

