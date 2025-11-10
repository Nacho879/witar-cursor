import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/lib/notificationService';
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  UserCheck,
  UserX,
  Play,
  Pause,
  Square,
  Bell,
  User,
  ChevronDown,
  Check,
  X,
  GripVertical,
  FileText,
  Sailboat
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VacationsCalendar from '@/components/VacationsCalendar';
import RequestActionModal from '@/components/RequestActionModal';

export default function ManagerDashboard() {
  const [stats, setStats] = React.useState({
    teamMembers: 0,
    presentToday: 0,
    pendingRequests: 0,
    teamHours: 0
  });
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [recentRequests, setRecentRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [managerId, setManagerId] = React.useState(null);
  const [companyId, setCompanyId] = React.useState(null);
  const [teamUserIds, setTeamUserIds] = React.useState([]);
  const [sendingNotifications, setSendingNotifications] = React.useState({});
  const [expandedRequest, setExpandedRequest] = React.useState(null);
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState(null);
  const [actionRequest, setActionRequest] = React.useState(null);
  
  // Estado para el orden de las cards
  const [cardOrder, setCardOrder] = React.useState(() => {
    const saved = localStorage.getItem('manager_dashboard_card_order');
    const defaultOrder = ['team-members', 'vacations', 'requests', 'notifications'];
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Si el orden guardado no incluye 'notifications', agregarlo
      if (!parsed.includes('notifications')) {
        const updated = [...parsed, 'notifications'];
        localStorage.setItem('manager_dashboard_card_order', JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    
    return defaultOrder;
  });

  // Memoizar teamUserIds para evitar recargas innecesarias cuando solo cambia el orden de las cards
  // Comparar el contenido del array en lugar de la referencia
  const teamUserIdsKey = React.useMemo(() => {
    return teamUserIds.length > 0 ? [...teamUserIds].sort().join(',') : '';
  }, [teamUserIds.length, teamUserIds]);
  
  const memoizedTeamUserIds = React.useMemo(() => {
    return [...teamUserIds];
  }, [teamUserIdsKey]);
  
  // Estado para notificaciones
  const [notifications, setNotifications] = React.useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    loadDashboardData();
    
    // Actualizar datos cada 30 segundos para reflejar cambios de estado en tiempo real
    const interval = setInterval(() => {
      loadDashboardData();
      if (companyId) {
        loadNotifications();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Cargar notificaciones cuando se tenga companyId
  React.useEffect(() => {
    if (companyId) {
      loadNotifications();
    }
  }, [companyId]);

  // Función para enviar notificación de recordatorio de fichaje
  async function sendClockInReminder(employeeUserId, employeeName) {
    try {
      setSendingNotifications(prev => ({ ...prev, [employeeUserId]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el company_id del manager
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Crear la notificación usando NotificationService
      await NotificationService.createNotification({
        companyId: userRole.company_id,
        recipientId: employeeUserId,
        senderId: user.id,
        type: 'clock_in_reminder',
        title: '⏰ Recordatorio de Fichaje',
        message: `Hola ${employeeName}, recuerda fichar tu entrada cuando llegues al trabajo.`,
        data: {
          reminder_type: 'clock_in',
          employee_name: employeeName
        }
      });

      alert(`Notificación enviada a ${employeeName}`);
    } catch (error) {
      console.error('Error sending clock-in reminder:', error);
      alert('Error al enviar la notificación');
    } finally {
      setSendingNotifications(prev => ({ ...prev, [employeeUserId]: false }));
    }
  }

  // Función para obtener el estado actual de un empleado
  async function getEmployeeCurrentStatus(userId, companyId) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // PRIMERO: Verificar si el empleado tiene una solicitud aprobada de vacaciones o ausencia para hoy
      const { data: approvedRequests } = await supabase
        .from('requests')
        .select('request_type, start_date, end_date')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      // Si hay una solicitud aprobada para hoy, retornar estado de vacaciones/ausencia
      if (approvedRequests && approvedRequests.length > 0) {
        const request = approvedRequests[0];
        let statusType = 'vacation';
        if (request.request_type === 'sick_leave') {
          statusType = 'sick_leave';
        } else if (request.request_type === 'personal_leave') {
          statusType = 'personal_leave';
        }
        
        return {
          status: statusType,
          lastActivity: null,
          currentSession: null,
          totalWorkTime: 0,
          totalBreakTime: 0,
          isOnLeave: true
        };
      }

      // Obtener fichajes de hoy
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .gte('entry_time', startOfDay.toISOString())
        .lte('entry_time', endOfDay.toISOString())
        .order('entry_time', { ascending: true });

      if (!timeEntries || timeEntries.length === 0) {
        return {
          status: 'offline',
          lastActivity: null,
          currentSession: null,
          totalWorkTime: 0,
          totalBreakTime: 0
        };
      }

      // Analizar el estado actual
      let status = 'offline';
      let currentSession = null;
      let totalWorkTime = 0;
      let totalBreakTime = 0;

      // Buscar la última actividad
      const lastEntry = timeEntries[timeEntries.length - 1];
      const now = new Date();
      const lastActivityTime = new Date(lastEntry.entry_time);

      // Buscar el último clock_in o resume (sin clock_out posterior)
      let lastClockIn = null;
      let lastClockOut = null;
      
      for (let i = timeEntries.length - 1; i >= 0; i--) {
        const entry = timeEntries[i];
        if (entry.entry_type === 'clock_in' || entry.entry_type === 'resume') {
          if (!lastClockIn) {
            lastClockIn = entry;
          }
        } else if (entry.entry_type === 'clock_out') {
          if (!lastClockOut) {
            lastClockOut = entry;
          }
        }
      }

      // Si hay un clock_out después del último clock_in, está offline
      if (lastClockIn && lastClockOut) {
        const clockInTime = new Date(lastClockIn.entry_time);
        const clockOutTime = new Date(lastClockOut.entry_time);
        if (clockOutTime > clockInTime) {
          status = 'offline';
        }
      }

      // Si hay un clock_in activo (sin clock_out posterior), verificar pausas
      if (lastClockIn && (!lastClockOut || new Date(lastClockIn.entry_time) > new Date(lastClockOut.entry_time))) {
        // Buscar el último break_start y break_end después del último clock_in
        let lastBreakStart = null;
        let lastBreakEnd = null;
        
        const clockInTime = new Date(lastClockIn.entry_time);
        for (let i = timeEntries.length - 1; i >= 0; i--) {
          const entry = timeEntries[i];
          const entryTime = new Date(entry.entry_time);
          
          if (entryTime > clockInTime) {
            if (entry.entry_type === 'break_start' && !lastBreakStart) {
              lastBreakStart = entry;
            } else if (entry.entry_type === 'break_end' && !lastBreakEnd) {
              lastBreakEnd = entry;
            }
          }
        }

        // Si hay un break_start sin break_end correspondiente, está en pausa
        if (lastBreakStart) {
          if (!lastBreakEnd || new Date(lastBreakStart.entry_time) > new Date(lastBreakEnd.entry_time)) {
            status = 'break';
            currentSession = {
              start: new Date(lastBreakStart.entry_time),
              type: 'break'
            };
          } else {
            // Hay break_end después del break_start, está trabajando
            status = 'working';
            currentSession = {
              start: new Date(lastClockIn.entry_time),
              type: 'work'
            };
          }
        } else {
          // No hay pausa activa, está trabajando
          status = 'working';
          currentSession = {
            start: new Date(lastClockIn.entry_time),
            type: 'work'
          };
        }
      } else if (!lastClockIn) {
        // No hay clock_in, está offline
        status = 'offline';
      }

      // Calcular tiempos totales
      let workStart = null;
      let breakStart = null;

      for (const entry of timeEntries) {
        const entryTime = new Date(entry.entry_time);

        if (entry.entry_type === 'clock_in' || entry.entry_type === 'resume') {
          workStart = entryTime;
        } else if (entry.entry_type === 'clock_out' && workStart) {
          totalWorkTime += (entryTime - workStart) / (1000 * 60 * 60); // Convertir a horas
          workStart = null;
        } else if (entry.entry_type === 'break_start') {
          breakStart = entryTime;
        } else if (entry.entry_type === 'break_end' && breakStart) {
          totalBreakTime += (entryTime - breakStart) / (1000 * 60 * 60); // Convertir a horas
          breakStart = null;
        }
      }

      // Si hay una sesión activa, calcular el tiempo hasta ahora
      if (currentSession) {
        const sessionDuration = (now - currentSession.start) / (1000 * 60 * 60);
        if (currentSession.type === 'work') {
          totalWorkTime += sessionDuration;
        } else if (currentSession.type === 'break') {
          totalBreakTime += sessionDuration;
        }
      }

      return {
        status,
        lastActivity: lastActivityTime,
        currentSession,
        totalWorkTime: Math.round(totalWorkTime * 100) / 100,
        totalBreakTime: Math.round(totalBreakTime * 100) / 100
      };
    } catch (error) {
      console.error('Error getting employee status:', error);
      return {
        status: 'offline',
        lastActivity: null,
        currentSession: null,
        totalWorkTime: 0,
        totalBreakTime: 0
      };
    }
  }

  // Función para obtener el icono del estado
  function getStatusIcon(status) {
    switch (status) {
      case 'working':
        return Play;
      case 'break':
        return Pause;
      case 'offline':
        return Square;
      case 'vacation':
        return Sailboat;
      case 'sick_leave':
        return AlertTriangle;
      case 'personal_leave':
        return Calendar;
      default:
        return Square;
    }
  }

  // Función para obtener el color del estado
  function getStatusColor(status) {
    switch (status) {
      case 'working':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'break':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'offline':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 'vacation':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'sick_leave':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'personal_leave':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  }

  // Función para obtener el texto del estado
  function getStatusText(status) {
    switch (status) {
      case 'working':
        return 'Trabajando';
      case 'break':
        return 'En pausa';
      case 'offline':
        return 'Desconectado';
      case 'vacation':
        return 'Vacaciones';
      case 'sick_leave':
        return 'Baja médica';
      case 'personal_leave':
        return 'Día personal';
      default:
        return 'Desconectado';
    }
  }

  // Función para calcular el progreso de la jornada (asumiendo 8 horas)
  function calculateWorkProgress(totalWorkTime) {
    const workdayHours = 8;
    const progress = Math.min((totalWorkTime / workdayHours) * 100, 100);
    return Math.round(progress);
  }

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('id, company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setManagerId(userRole.id);
          setCompanyId(userRole.company_id);
          await Promise.all([
            loadTeamStats(userRole.company_id, userRole.id),
            loadTeamMembers(userRole.company_id, userRole.id),
            loadRecentRequests(userRole.company_id, userRole.id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamStats(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
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
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      // Miembros del equipo
      const teamMembers = teamUserIds.length;

      // Presentes hoy (simulado)
      const presentToday = Math.floor(Math.random() * teamMembers) + 1;

      // Solicitudes pendientes del equipo
      let pendingRequests = 0;
      if (teamUserIds.length > 0) {
        // Contar solicitudes normales pendientes
        const { count: normalRequests } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .eq('status', 'pending');
        
        // Contar solicitudes de edición de fichajes pendientes
        const { count: timeEditRequests } = await supabase
          .from('time_entry_edit_requests')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .eq('status', 'pending');
        
        pendingRequests = (normalRequests || 0) + (timeEditRequests || 0);
      }

      // Horas del equipo (simulado)
      const teamHours = Math.floor(Math.random() * 100) + 50;

      setStats({
        teamMembers,
        presentToday,
        pendingRequests,
        teamHours
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  }

  async function getTeamUserIds(companyId, managerId) {
    try {
      const { data } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('supervisor_id', managerId)
        .eq('is_active', true);

      return data?.map(item => item.user_id) || [];
    } catch (error) {
      console.error('Error getting team user IDs:', error);
      return [];
    }
  }

  async function loadTeamMembers(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
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
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      // Guardar los IDs del equipo solo si realmente cambiaron
      setTeamUserIds(prevIds => {
        const prevKey = prevIds.length > 0 ? [...prevIds].sort().join(',') : '';
        const newKey = teamUserIds.length > 0 ? [...teamUserIds].sort().join(',') : '';
        // Solo actualizar si el contenido realmente cambió
        return prevKey !== newKey ? teamUserIds : prevIds;
      });

      if (teamUserIds.length > 0) {
        // Obtener los roles de usuario
        const { data: roles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            departments (
              name
            )
          `)
          .in('user_id', teamUserIds)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('joined_at', { ascending: false });

        if (!rolesError && roles) {
          // Obtener los perfiles de usuario por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', teamUserIds);

          if (!profilesError && profiles) {
            // Combinar los datos y obtener el estado actual de cada empleado
            const membersWithProfilesAndStatus = await Promise.all(
              roles.map(async (role) => {
                const profile = profiles.find(p => p.user_id === role.user_id);
                const status = await getEmployeeCurrentStatus(role.user_id, companyId);
                
                return {
                  ...role,
                  user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null },
                  status: status.status,
                  total_work_time: status.totalWorkTime,
                  total_break_time: status.totalBreakTime,
                  last_activity: status.lastActivity,
                  current_session: status.currentSession
                };
              })
            );

            setTeamMembers(membersWithProfilesAndStatus);
          } else {
            // Si no hay perfiles, solo obtener el estado
            const membersWithStatus = await Promise.all(
              roles.map(async (role) => {
                const status = await getEmployeeCurrentStatus(role.user_id, companyId);
                
                return {
                  ...role,
                  user_profiles: { full_name: 'Usuario sin perfil', avatar_url: null },
                  status: status.status,
                  total_work_time: status.totalWorkTime,
                  total_break_time: status.totalBreakTime,
                  last_activity: status.lastActivity,
                  current_session: status.currentSession
                };
              })
            );

            setTeamMembers(membersWithStatus);
          }
        }
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadRecentRequests(companyId, managerId) {
    try {
      // Primero, obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
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
          .eq('company_id', companyId)
          .eq('supervisor_id', managerId)
          .eq('is_active', true);

        if (!supError && supervisedMembers) {
          teamUserIds = supervisedMembers.map(member => member.user_id);
        }
      }

      if (teamUserIds.length > 0) {
        // Cargar todas las solicitudes normales del equipo (sin límite para mostrar todas)
        const { data: normalRequests, error } = await supabase
          .from('requests')
          .select('*')
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .order('created_at', { ascending: false });

        // Cargar todas las solicitudes de edición de fichajes del equipo (sin límite para mostrar todas)
        const { data: timeEditRequests, error: timeEditError } = await supabase
          .from('time_entry_edit_requests')
          .select('*')
          .eq('company_id', companyId)
          .in('user_id', teamUserIds)
          .order('created_at', { ascending: false });

        if (!error && !timeEditError) {
          // Obtener los perfiles de usuario por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', teamUserIds);

          if (!profilesError && profiles) {
            // Combinar y procesar las solicitudes
            const allRequests = [];

            // Agregar solicitudes normales
            if (normalRequests) {
              normalRequests.forEach(request => {
                const profile = profiles.find(p => p.user_id === request.user_id);
                allRequests.push({
                  ...request,
                  request_type: 'normal',
                  original_request_type: request.request_type,
                  user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null }
                });
              });
            }

            // Agregar solicitudes de edición de fichajes
            if (timeEditRequests) {
              timeEditRequests.forEach(request => {
                const profile = profiles.find(p => p.user_id === request.user_id);
                allRequests.push({
                  ...request,
                  request_type: 'time_edit',
                  original_request_type: request.request_type, // Preservar el tipo específico (edit_time, edit_type, etc.)
                  user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null }
                });
              });
            }

            // Ordenar por fecha de creación (sin límite para mostrar todas)
            allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentRequests(allRequests);
          } else {
            setRecentRequests([]);
          }
        }
      } else {
        setRecentRequests([]);
      }
    } catch (error) {
      console.error('Error loading recent requests:', error);
    }
  }

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadNotificationsCount((data || []).filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return date.toLocaleDateString('es-ES');
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'request':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'clock_in_reminder':
        return <Clock className="w-4 h-4 text-green-600" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejection':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  }

  function getRequestTypeDisplay(type) {
    switch (type) {
      case 'vacation': return 'vacaciones';
      case 'sick_leave': return 'baja médica';
      case 'personal_leave': return 'permisos';
      case 'permission': return 'permisos';
      case 'other': return 'otro';
      case 'time_edit': return 'edición de fichaje';
      case 'edit_time': return 'edición de fichaje';
      case 'edit_type': return 'edición de fichaje';
      case 'delete_entry': return 'edición de fichaje';
      case 'add_entry': return 'edición de fichaje';
      default: return type || 'normal';
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getDurationDisplay(request) {
    if (request.request_type === 'permission' || request.original_request_type === 'permission') {
      return `${request.duration_hours || 0}h`;
    } else {
      return `${request.duration_days || 0} día${(request.duration_days || 0) > 1 ? 's' : ''}`;
    }
  }

  function getRequestTypeInfo(type) {
    switch (type) {
      case 'vacation':
        return { label: 'Vacaciones', icon: Calendar, color: 'bg-blue-100 text-blue-800' };
      case 'permission':
        return { label: 'Permiso', icon: Clock, color: 'bg-green-100 text-green-800' };
      case 'sick_leave':
        return { label: 'Baja Médica', icon: AlertTriangle, color: 'bg-red-100 text-red-800' };
      case 'other':
        return { label: 'Otro', icon: FileText, color: 'bg-purple-100 text-purple-800' };
      case 'edit_time':
        return { label: 'Editar Fecha/Hora', icon: Clock, color: 'bg-orange-100 text-orange-800' };
      case 'edit_type':
        return { label: 'Editar Tipo', icon: FileText, color: 'bg-purple-100 text-purple-800' };
      case 'delete_entry':
        return { label: 'Eliminar Fichaje', icon: XCircle, color: 'bg-red-100 text-red-800' };
      case 'add_entry':
        return { label: 'Agregar Fichaje', icon: CheckCircle, color: 'bg-green-100 text-green-800' };
      default:
        return { label: type, icon: FileText, color: 'bg-gray-100 text-gray-800' };
    }
  }

  // Función para aprobar/rechazar solicitudes
  async function handleRequestAction(requestId, status, requestType = 'normal', comments = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (requestType === 'normal') {
        if (status === 'approved') {
          updateData.approved_by = user.id;
          updateData.approved_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);
        if (error) throw error;
      } else if (requestType === 'time_edit') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.approval_notes = comments;
        const { error } = await supabase
          .from('time_entry_edit_requests')
          .update(updateData)
          .eq('id', requestId);
        if (error) throw error;
      }

      // Recargar solicitudes
      if (companyId && managerId) {
        await loadRecentRequests(companyId, managerId);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error al actualizar la solicitud');
    }
  }

  // Función para confirmar acción desde el modal
  async function handleActionConfirm(comments) {
    const status = actionType === 'approve' ? 'approved' : 'rejected';
    await handleRequestAction(actionRequest.id, status, actionRequest.request_type, comments);
    setActionModalOpen(false);
    setActionRequest(null);
    setActionType(null);
  }

  // Contar solicitudes pendientes
  const pendingRequestsCount = recentRequests.filter(r => r.status === 'pending').length;

  // Función para manejar el drag end
  function handleDragEnd(event) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Guardar en localStorage
        localStorage.setItem('manager_dashboard_card_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }

  // Componente SortableCard
  function SortableCard({ id, children }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging 
        ? 'none' 
        : (transition || 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'),
      opacity: isDragging ? 0.8 : 1,
      zIndex: isDragging ? 50 : 1,
      position: 'relative',
      boxShadow: isDragging 
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
        : 'none',
      touchAction: 'none',
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className={`relative ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-secondary rounded transition-colors"
          title="Arrastrar para reordenar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    );
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending': return Activity;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      default: return Activity;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
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
    <div className="w-full p-4 sm:p-6 lg:px-6 lg:pt-6 lg:pb-[350px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Dashboard del Equipo
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestión y supervisión de tu equipo
          </p>
        </div>
      </div>

      {/* Team Members, Vacations Calendar and Recent Requests */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cardOrder}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6 lg:auto-rows-[304px]">
            {cardOrder.map((cardId) => {
              if (cardId === 'team-members') {
                return (
                  <SortableCard key={cardId} id={cardId}>
                    <div className="card w-full min-h-[400px] lg:min-h-[608px] lg:row-span-2 flex flex-col">
          <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">Miembros del Equipo</h3>
            </div>
          </div>
          <div className="p-4 md:p-6 flex-1 overflow-y-auto">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tienes miembros en tu equipo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => {
                  const StatusIcon = getStatusIcon(member.status);
                  const color = getStatusColor(member.status);
                  const isOnLeave = member.status === 'vacation' || member.status === 'sick_leave' || member.status === 'personal_leave';
                  const progress = isOnLeave ? 0 : calculateWorkProgress(member.total_work_time);

                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {member.user_profiles?.avatar_url ? (
                          <img 
                            src={member.user_profiles.avatar_url} 
                            alt={member.user_profiles.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {member.user_profiles?.full_name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{member.user_profiles?.full_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {getStatusText(member.status)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({member.total_work_time}h)
                          </span>
                        </div>
                        {/* Barra de progreso de la jornada - Solo mostrar si no está de vacaciones/ausencia */}
                        {!isOnLeave && (
                          <>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  member.status === 'working' ? 'bg-green-500' : 
                                  member.status === 'break' ? 'bg-yellow-500' : 'bg-gray-400'
                                }`} 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {progress}% de la jornada completada
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => sendClockInReminder(member.user_id, member.user_profiles?.full_name)}
                          disabled={sendingNotifications[member.user_id]}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                            sendingNotifications[member.user_id]
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 cursor-pointer'
                          }`}
                          title="Enviar recordatorio de fichaje"
                        >
                          {sendingNotifications[member.user_id] ? (
                            <>
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3" />
                              Recordar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
                    </div>
                  </SortableCard>
                );
              }
              
              if (cardId === 'vacations') {
                return (
                  <SortableCard key={cardId} id={cardId}>
                    {companyId && memoizedTeamUserIds.length > 0 ? (
                      <div className="w-full h-full min-h-[300px] lg:h-[304px] overflow-hidden">
                        <VacationsCalendar companyId={companyId} teamUserIds={memoizedTeamUserIds} />
                      </div>
                    ) : (
                      <div className="card w-full h-full min-h-[300px] lg:h-[304px] flex flex-col">
                        <div className="border-b border-border flex-shrink-0 p-4">
                          <h3 className="text-base md:text-lg font-semibold text-foreground">Vacaciones y ausencias</h3>
                        </div>
                        <div className="p-4 md:p-6 flex-1">
                          <div className="text-center py-4 md:py-8">
                            <p className="text-muted-foreground text-sm md:text-base">No hay miembros en tu equipo</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableCard>
                );
              }
              
              if (cardId === 'requests') {
                return (
                  <SortableCard key={cardId} id={cardId}>
                    <div className="card w-full min-h-[400px] lg:min-h-[608px] lg:row-span-2 flex flex-col">
        <div className="border-b border-border flex-shrink-0" style={{ padding: '24px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">Solicitudes de equipo</h3>
            </div>
            {pendingRequestsCount > 0 && (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-white">{pendingRequestsCount}</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 md:p-6">
          {pendingRequestsCount === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {recentRequests.filter(r => r.status === 'pending').slice(0, 3).map((request, index) => {
                // Para solicitudes normales, usar original_request_type; para time_edit, usar original_request_type si existe
                const requestType = request.request_type === 'normal' 
                  ? request.original_request_type || request.request_type 
                  : (request.request_type === 'time_edit' && request.original_request_type)
                    ? request.original_request_type
                    : request.request_type;
                const requestTypeLabel = getRequestTypeDisplay(requestType);
                
                return (
                  <div key={request.id} className="p-4 rounded-lg border border-border hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Foto con badge de prioridad */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-300">
                          {request.user_profiles?.avatar_url ? (
                            <img 
                              src={request.user_profiles.avatar_url} 
                              alt={request.user_profiles.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-blue-700">
                              {request.user_profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-xs font-semibold text-white">{index + 1}°</span>
                        </div>
                      </div>

                      {/* Información de la solicitud */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          <span className="font-semibold">{request.user_profiles?.full_name}</span>
                          {' '}solicita {requestTypeLabel}
                        </p>
                        <button
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-1 transition-colors"
                        >
                          Ver más detalles
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedRequest === request.id ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedRequest === request.id && (
                          <div className="mt-3 p-3 bg-secondary rounded-lg text-sm text-muted-foreground">
                            <p><strong>Fecha inicio:</strong> {request.start_date}</p>
                            {request.end_date && <p><strong>Fecha fin:</strong> {request.end_date}</p>}
                            {request.reason && <p><strong>Motivo:</strong> {request.reason}</p>}
                            <p><strong>Solicitado:</strong> {new Date(request.created_at).toLocaleDateString('es-ES')}</p>
                          </div>
                        )}
                      </div>

                      {/* Sección derecha: Botones */}
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">

                        {/* Botones de acción */}
                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Adaptar estructura de datos para el modal
                                const adaptedRequest = {
                                  ...request,
                                  user_company_roles: {
                                    user_profiles: request.user_profiles || { full_name: 'Sin nombre' }
                                  }
                                };
                                setActionRequest(adaptedRequest);
                                setActionType('approve');
                                setActionModalOpen(true);
                              }}
                              className="w-10 h-10 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 transition-colors"
                              title="Aprobar"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                // Adaptar estructura de datos para el modal
                                const adaptedRequest = {
                                  ...request,
                                  user_company_roles: {
                                    user_profiles: request.user_profiles || { full_name: 'Sin nombre' }
                                  }
                                };
                                setActionRequest(adaptedRequest);
                                setActionType('reject');
                                setActionModalOpen(true);
                              }}
                              className="w-10 h-10 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 transition-colors"
                              title="Rechazar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status === 'approved' ? 'Aprobada' : request.status === 'rejected' ? 'Rechazada' : request.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              {pendingRequestsCount > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => window.location.href = '/manager/requests'}
                    className="w-full px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg font-medium transition-colors"
                  >
                    Ver todas las solicitudes ({pendingRequestsCount})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
                    </div>
                  </SortableCard>
                );
              }
              
              if (cardId === 'notifications') {
                return (
                  <SortableCard key={cardId} id={cardId}>
                    <div className="card w-full h-full min-h-[300px] lg:h-[304px] flex flex-col">
                      <div className="border-b border-border flex-shrink-0 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <Bell className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            </div>
                            <h3 className="text-base md:text-lg font-semibold text-foreground">Notificaciones</h3>
                          </div>
                          {unreadNotificationsCount > 0 && (
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-white">{unreadNotificationsCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-4 md:py-8">
                            <Bell className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-2 md:mb-4" />
                            <p className="text-muted-foreground">No hay notificaciones</p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {notifications.slice(0, 5).map((notification) => (
                                <div
                                  key={notification.id}
                                  className={`p-3 rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer ${
                                    !notification.read_at ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''
                                  }`}
                                  onClick={() => !notification.read_at && markNotificationAsRead(notification.id)}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-foreground">
                                          {notification.title}
                                        </p>
                                        {!notification.read_at && (
                                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <span className="text-xs text-muted-foreground mt-1 block">
                                        {formatTimeAgo(notification.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {notifications.length > 5 && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <button
                                  onClick={() => window.location.href = '/notifications'}
                                  className="w-full px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium transition-colors"
                                >
                                  Ver todas ({notifications.length})
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </SortableCard>
                );
              }
              
              return null;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal de acción de solicitud */}
      <RequestActionModal
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setActionRequest(null);
          setActionType(null);
        }}
        request={actionRequest}
        action={actionType}
        onConfirm={handleActionConfirm}
        getRequestTypeInfo={getRequestTypeInfo}
        formatDate={formatDate}
        getDurationDisplay={getDurationDisplay}
      />
    </div>
  );
}
