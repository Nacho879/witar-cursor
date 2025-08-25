import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, ChevronDown, LogOut, User, Bell, Sun, Moon, Play, Pause, Square, X, Check, Trash2, Search, Filter } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { NotificationService } from '@/lib/notificationService';

export default function FloatingTimeClock() {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [notificationFilter, setNotificationFilter] = useState('all'); // all, unread, read
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    unread: 0,
    read: 0
  });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadUserProfile();
    checkUserRole();
    checkActiveSession();
    // Cargar notificaciones del usuario
    loadNotifications();
    
    // Suscripción en tiempo real para notificaciones
    const notificationsSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications'
        }, 
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsSubscription);
    };
  }, []);

  useEffect(() => {
    if (companyId) {
      loadNotifications();
    }
  }, [companyId, notificationFilter, notificationSearch]);

  useEffect(() => {
    let interval;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const pausedTime = totalPausedTime + (pauseStartTime ? now - pauseStartTime : 0);
        setElapsedTime(now - startTime - pausedTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime, totalPausedTime, pauseStartTime]);

  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase
          .from('user_company_roles')
          .select('role, company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (role) {
          setUserRole(role.role);
          setCompanyId(role.company_id);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  async function checkActiveSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: activeEntry } = await supabase
          .from('time_entries')
          .select('entry_time')
          .eq('user_id', user.id)
          .eq('entry_type', 'clock_in')
          .order('entry_time', { ascending: false })
          .limit(1);

        if (activeEntry && activeEntry.length > 0) {
          const lastClockOut = await supabase
            .from('time_entries')
            .select('entry_time')
            .eq('user_id', user.id)
            .eq('entry_type', 'clock_out')
            .gt('entry_time', activeEntry[0].entry_time)
            .order('entry_time', { ascending: false })
            .limit(1);

          if (!lastClockOut.data || lastClockOut.data.length === 0) {
            // Hay una sesión activa, verificar si está en pausa
            const lastBreakStart = await supabase
              .from('time_entries')
              .select('entry_time')
              .eq('user_id', user.id)
              .eq('entry_type', 'break_start')
              .gt('entry_time', activeEntry[0].entry_time)
              .order('entry_time', { ascending: false })
              .limit(1);

            const lastBreakEnd = await supabase
              .from('time_entries')
              .select('entry_time')
              .eq('user_id', user.id)
              .eq('entry_type', 'break_end')
              .gt('entry_time', activeEntry[0].entry_time)
              .order('entry_time', { ascending: false })
              .limit(1);

            // Si hay un break_start sin break_end correspondiente, está en pausa
            const isCurrentlyPaused = lastBreakStart.data && lastBreakStart.data.length > 0 &&
              (!lastBreakEnd.data || lastBreakEnd.data.length === 0 || 
               lastBreakStart.data[0].entry_time > lastBreakEnd.data[0].entry_time);

            setIsActive(true);
            setStartTime(new Date(activeEntry[0].entry_time).getTime());
            
            if (isCurrentlyPaused) {
              // Está en pausa, calcular tiempo pausado
              setIsPaused(true);
              setPauseStartTime(new Date(lastBreakStart.data[0].entry_time).getTime());
              
              // Calcular tiempo total pausado hasta ahora
              const now = Date.now();
              const pauseStart = new Date(lastBreakStart.data[0].entry_time).getTime();
              const currentPauseTime = now - pauseStart;
              
              // Calcular tiempo total pausado anterior
              let totalPausedBefore = 0;
              if (lastBreakEnd.data && lastBreakEnd.data.length > 0) {
                // Hay pausas anteriores, calcular tiempo total
                const { data: allBreaks } = await supabase
                  .from('time_entries')
                  .select('entry_time, entry_type')
                  .eq('user_id', user.id)
                  .in('entry_type', ['break_start', 'break_end'])
                  .gt('entry_time', activeEntry[0].entry_time)
                  .lt('entry_time', lastBreakStart.data[0].entry_time)
                  .order('entry_time', { ascending: true });

                if (allBreaks) {
                  let pauseStartTime = null;
                  for (const entry of allBreaks) {
                    if (entry.entry_type === 'break_start') {
                      pauseStartTime = new Date(entry.entry_time).getTime();
                    } else if (entry.entry_type === 'break_end' && pauseStartTime) {
                      totalPausedBefore += new Date(entry.entry_time).getTime() - pauseStartTime;
                      pauseStartTime = null;
                    }
                  }
                }
              }
              
              setTotalPausedTime(totalPausedBefore);
              setElapsedTime(now - new Date(activeEntry[0].entry_time).getTime() - totalPausedBefore - currentPauseTime);
            } else {
              // No está en pausa, calcular tiempo total pausado anterior
              setIsPaused(false);
              setPauseStartTime(null);
              
              let totalPaused = 0;
              const { data: allBreaks } = await supabase
                .from('time_entries')
                .select('entry_time, entry_type')
                .eq('user_id', user.id)
                .in('entry_type', ['break_start', 'break_end'])
                .gt('entry_time', activeEntry[0].entry_time)
                .order('entry_time', { ascending: true });

              if (allBreaks) {
                let pauseStartTime = null;
                for (const entry of allBreaks) {
                  if (entry.entry_type === 'break_start') {
                    pauseStartTime = new Date(entry.entry_time).getTime();
                  } else if (entry.entry_type === 'break_end' && pauseStartTime) {
                    totalPaused += new Date(entry.entry_time).getTime() - pauseStartTime;
                    pauseStartTime = null;
                  }
                }
              }
              
              setTotalPausedTime(totalPaused);
              setElapsedTime(Date.now() - new Date(activeEntry[0].entry_time).getTime() - totalPaused);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  }

  async function handleClockIn() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtener información de la empresa
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        const { error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            company_id: userRole?.company_id,
            entry_type: 'clock_in',
            entry_time: new Date().toISOString()
          });

        if (!error) {
          setIsActive(true);
          setStartTime(Date.now());
          setElapsedTime(0);
          setIsPaused(false);
          setTotalPausedTime(0);
          setPauseStartTime(null);
          
          // Mostrar notificación de éxito
          showToast('✅ Fichaje iniciado correctamente', 'success');
        } else {
          showToast('❌ Error al iniciar fichaje', 'error');
        }
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      showToast('❌ Error al iniciar fichaje', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtener información de la empresa
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        const { error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            company_id: userRole?.company_id,
            entry_type: 'clock_out',
            entry_time: new Date().toISOString()
          });

        if (!error) {
          setIsActive(false);
          setStartTime(null);
          setElapsedTime(0);
          setIsPaused(false);
          setTotalPausedTime(0);
          setPauseStartTime(null);
          
          // Mostrar notificación de éxito
          showToast('✅ Fichaje finalizado correctamente', 'success');
        } else {
          showToast('❌ Error al finalizar fichaje', 'error');
        }
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      showToast('❌ Error al finalizar fichaje', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtener información de la empresa
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (isPaused) {
          // Reanudar - registrar fin de pausa
          const { error } = await supabase
            .from('time_entries')
            .insert({
              user_id: user.id,
              company_id: userRole?.company_id,
              entry_type: 'break_end',
              entry_time: new Date().toISOString()
            });

          if (!error) {
            setTotalPausedTime(totalPausedTime + (Date.now() - pauseStartTime));
            setPauseStartTime(null);
            setIsPaused(false);
            showToast('▶️ Pausa finalizada', 'info');
          } else {
            console.error('Error ending break:', error);
            showToast('❌ Error al finalizar pausa', 'error');
          }
        } else {
          // Pausar - registrar inicio de pausa
          const { error } = await supabase
            .from('time_entries')
            .insert({
              user_id: user.id,
              company_id: userRole?.company_id,
              entry_type: 'break_start',
              entry_time: new Date().toISOString()
            });

          if (!error) {
            setPauseStartTime(Date.now());
            setIsPaused(true);
            showToast('⏸️ Pausa iniciada', 'info');
          } else {
            console.error('Error starting break:', error);
            showToast('❌ Error al iniciar pausa', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Error handling pause:', error);
      showToast('❌ Error al manejar pausa', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && companyId) {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('company_id', companyId)
          .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
          .order('created_at', { ascending: false });

        // Aplicar filtros
        if (notificationFilter === 'unread') {
          query = query.is('read_at', null);
        } else if (notificationFilter === 'read') {
          query = query.not('read_at', 'is', null);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading notifications:', error);
          return;
        }

        // Filtrar por término de búsqueda
        let filteredNotifications = data || [];
        if (notificationSearch) {
          filteredNotifications = filteredNotifications.filter(notification =>
            notification.title.toLowerCase().includes(notificationSearch.toLowerCase()) ||
            notification.message.toLowerCase().includes(notificationSearch.toLowerCase())
          );
        }

        setNotifications(filteredNotifications);

        // Calcular estadísticas
        const total = data?.length || 0;
        const unread = data?.filter(n => !n.read_at).length || 0;
        const read = total - unread;

        setNotificationStats({ total, unread, read });
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  async function markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setNotificationStats(prev => ({ ...prev, unread: prev.unread - 1, read: prev.read + 1 }));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllNotificationsAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && companyId) {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('company_id', companyId)
          .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
          .is('read_at', null);

        if (error) throw error;

        setNotifications(prev => 
          prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
        );
        setNotificationStats(prev => ({ ...prev, unread: 0, read: prev.total }));
        setUnreadCount(0);
        showToast('✅ Todas las notificaciones marcadas como leídas', 'success');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('❌ Error al marcar notificaciones', 'error');
    }
  }

  async function deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setNotificationStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Ahora mismo';
  }

  function getNotificationColor(type) {
    switch (type) {
      case 'request_approved': return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      case 'request_rejected': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'time_edit_request': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      case 'time_clock': return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10';
      case 'request': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'employee': return 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10';
      case 'document': return 'border-l-teal-500 bg-teal-50 dark:bg-teal-900/10';
      case 'invitation': return 'border-l-pink-500 bg-pink-50 dark:bg-pink-900/10';
      case 'company': return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      
      // Limpiar sessionStorage antes de cerrar sesión
      sessionStorage.clear();
      
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('❌ Error al cerrar sesión', 'error');
      setLoading(false);
    }
  }

  function formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  }

  function handleProfileClick() {
    if (userRole === 'employee') {
      window.location.href = '/employee/profile';
    } else if (userRole === 'manager') {
      window.location.href = '/manager/profile';
    } else if (userRole === 'admin') {
      window.location.href = '/admin/profile';
    }
    setIsDropdownOpen(false);
  }

  function handleNotificationsClick() {
    setShowNotifications(!showNotifications);
    setIsDropdownOpen(false);
  }

  function showToast(message, type = 'info') {
    // Crear un toast temporal
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'request_approved': return '✅';
      case 'request_rejected': return '❌';
      case 'time_edit_request': return '⏰';
      default: return '📢';
    }
  }

  // Solo mostrar para empleados, managers y admins
  if (!userRole || (userRole !== 'employee' && userRole !== 'manager' && userRole !== 'admin')) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-green-100 dark:bg-green-900/20 rounded-full px-3 sm:px-5 py-2 shadow-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Tiempo transcurrido */}
          <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] sm:min-w-[70px] flex items-center">
            {isActive ? formatTime(elapsedTime) : '0h 0min'}
          </div>

          {/* Botones de acción - Responsive */}
          <div className="flex items-center gap-1 sm:gap-2">
            {!isActive && (
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="px-2 sm:px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-full text-xs transition-colors font-medium flex items-center justify-center"
              >
                <Play className="w-3 h-3" />
                <span className="ml-1 hidden sm:inline">Fichar</span>
              </button>
            )}
            
            {isActive && (
              <>
                <button
                  onClick={handlePause}
                  disabled={loading}
                  className="px-2 sm:px-3 py-1.5 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white rounded-full text-xs transition-colors font-medium flex items-center justify-center"
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span className="ml-1 hidden sm:inline">{isPaused ? 'Reanudar' : 'Pausa'}</span>
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="px-2 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-full text-xs transition-colors font-medium flex items-center justify-center"
                >
                  <Square className="w-3 h-3" />
                  <span className="ml-1 hidden sm:inline">Salir</span>
                </button>
              </>
            )}
          </div>

          {/* Perfil del usuario */}
          <div className="relative flex items-center">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 hover:bg-green-200 dark:hover:bg-green-800/30 rounded-full px-1 sm:px-2 py-1 transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-green-300 dark:border-green-700 overflow-hidden shadow-md flex items-center justify-center">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    {userProfile?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start justify-center hidden sm:block">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                  {userProfile?.full_name || 'Usuario'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                  {userRole === 'employee' ? 'Empleado' : userRole === 'manager' ? 'Manager' : userRole === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            </button>

            {/* Menú desplegable */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-3">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-green-300 dark:border-green-700 overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt={userProfile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-lg font-bold">
                          {userProfile?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {userProfile?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {userRole === 'employee' ? 'Empleado' : userRole === 'manager' ? 'Manager' : userRole === 'admin' ? 'Administrador' : 'Usuario'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleProfileClick}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Mi Perfil</span>
                </button>
                <button
                  onClick={handleNotificationsClick}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span>Notificaciones</span>
                  {notifications.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 font-medium">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <button
                  onClick={() => {
                    handleSignOut();
                  }}
                  disabled={loading}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cerrando...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Cerrar Sesión</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de notificaciones mejorado */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notificationStats.unread > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Marcar todas como leídas"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Total: {notificationStats.total}</span>
              <span>•</span>
              <span className="text-red-500">No leídas: {notificationStats.unread}</span>
              <span>•</span>
              <span className="text-green-500">Leídas: {notificationStats.read}</span>
            </div>

            {/* Filtros y búsqueda */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificaciones..."
                  value={notificationSearch}
                  onChange={(e) => setNotificationSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    notificationFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setNotificationFilter('unread')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    notificationFilter === 'unread'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  No leídas
                </button>
                <button
                  onClick={() => setNotificationFilter('read')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    notificationFilter === 'read'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  Leídas
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No hay notificaciones</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {notificationFilter === 'all' 
                    ? 'No tienes notificaciones aún'
                    : notificationFilter === 'unread'
                    ? 'No tienes notificaciones sin leer'
                    : 'No tienes notificaciones leídas'
                  }
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-l-4 ${
                      notification.read_at ? '' : 'ring-2 ring-blue-500/20'
                    } ${getNotificationColor(notification.type)}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>{formatTimeAgo(notification.created_at)}</span>
                              
                              {notification.sender_name && (
                                <>
                                  <span>•</span>
                                  <span>{notification.sender_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read_at && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  // Navegar a la página completa de notificaciones según el rol
                  if (userRole === 'owner') {
                    window.location.href = '/owner/notifications';
                  } else if (userRole === 'admin') {
                    window.location.href = '/admin/notifications';
                  } else if (userRole === 'manager') {
                    window.location.href = '/manager/notifications';
                  } else {
                    window.location.href = '/employee/notifications';
                  }
                }}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline text-center"
              >
                Ver historial completo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Iconos flotantes */}
      <div className="absolute -top-2 -right-2 flex gap-1">
        {/* Icono de reloj para fichajes */}
        <div className="w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
          <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        </div>
        
        {/* Icono de solicitudes nuevas */}
        {notifications.filter(n => n.type === 'request' && !n.read_at).length > 0 && (
          <div className="w-6 h-6 bg-orange-500 rounded-full shadow-lg flex items-center justify-center border-2 border-white dark:border-gray-800 relative">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
              {notifications.filter(n => n.type === 'request' && !n.read_at).length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 