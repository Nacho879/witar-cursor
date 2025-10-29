import React, { useState } from 'react';
import { useTimeClock } from '@/contexts/TimeClockContext';
import { Clock, Play, Pause, Square, MapPin, RefreshCw, AlertTriangle, ChevronDown, LogOut, User, Bell, Sun, Moon, X, Check, Trash2, Search, Filter } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { NotificationService } from '@/lib/notificationService';
import { supabase } from '@/lib/supabaseClient';
import TimeClockDebug from './TimeClockDebug';

export default function GlobalFloatingTimeClock() {
  const {
    isActive,
    elapsedTime,
    isPaused,
    location,
    isOnline,
    lastSyncTime,
    loading,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    getCurrentLocation,
    syncWithDatabase,
    formatTime
  } = useTimeClock();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    unread: 0,
    read: 0
  });
  const { theme, toggleTheme } = useTheme();

  const [message, setMessage] = useState('');

  React.useEffect(() => {
    loadUserProfile();
    checkUserRole();
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
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationFilter === 'unread') {
        query = query.is('read_at', null);
      } else if (notificationFilter === 'read') {
        query = query.not('read_at', 'is', null);
      }

      if (notificationSearch) {
        query = query.ilike('message', `%${notificationSearch}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
      
      setNotificationStats({
        total: data?.length || 0,
        unread: data?.filter(n => !n.read_at).length || 0,
        read: data?.filter(n => n.read_at).length || 0
      });
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

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Recargar notificaciones
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      // Recargar notificaciones
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function handleClockIn() {
    try {
      setMessage('');
      
      // Obtener ubicación si está disponible
      const locationData = await getCurrentLocation();
      
      const data = await startSession(locationData);
      
      setMessage('✅ Fichaje iniciado correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage('❌ Error al iniciar fichaje: ' + error.message);
    }
  }

  async function handleClockOut() {
    try {
      setMessage('');
      
      const data = await endSession();
      
      setMessage('✅ Fichaje completado correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage('❌ Error al finalizar fichaje: ' + error.message);
    }
  }

  async function handlePause() {
    try {
      setMessage('');
      
      const data = await pauseSession();
      
      setMessage('⏸️ Fichaje pausado');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error pausing:', error);
      setMessage('❌ Error al pausar fichaje: ' + error.message);
    }
  }

  async function handleResume() {
    try {
      setMessage('');
      
      const data = await resumeSession();
      
      setMessage('▶️ Fichaje reanudado');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error resuming:', error);
      setMessage('❌ Error al reanudar fichaje: ' + error.message);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  function getActionButton() {
    if (isActive) {
      if (isPaused) {
        return (
          <button
            onClick={handleResume}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2 inline" />
            {loading ? 'Reanudando...' : 'Reanudar'}
          </button>
        );
      } else {
        return (
          <div className="space-y-2">
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 w-full"
            >
              <Square className="w-4 h-4 mr-2 inline" />
              {loading ? 'Finalizando...' : 'Finalizar'}
            </button>
            <button
              onClick={handlePause}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 w-full"
            >
              <Pause className="w-4 h-4 mr-2 inline" />
              {loading ? 'Pausando...' : 'Pausar'}
            </button>
          </div>
        );
      }
    } else {
      return (
        <button
          onClick={handleClockIn}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-2 inline" />
          {loading ? 'Iniciando...' : 'Iniciar'}
        </button>
      );
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Debug component */}
      <TimeClockDebug />
      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : message.includes('❌')
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {message}
        </div>
      )}

      {/* Reloj flotante */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Fichaje</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Estado de conexión */}
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            
            {/* Botón de notificaciones */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de usuario */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estado actual */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            isActive 
              ? (isPaused ? 'bg-yellow-500' : 'bg-green-500') 
              : 'bg-gray-400'
          }`} />
          <span className={`text-sm font-medium ${
            isActive 
              ? (isPaused ? 'text-yellow-600' : 'text-green-600') 
              : 'text-gray-600'
          }`}>
            {isActive 
              ? (isPaused ? 'En pausa' : 'Trabajando') 
              : 'Fuera de servicio'
            }
          </span>
        </div>

        {/* Tiempo transcurrido */}
        {isActive && (
          <div className="text-center mb-4">
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {isPaused ? 'Tiempo pausado' : 'Tiempo trabajado hoy'}
            </p>
          </div>
        )}

        {/* Ubicación */}
        {location && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-4">
            <MapPin className="w-3 h-3" />
            <span>Ubicación registrada</span>
          </div>
        )}

        {/* Botón de acción */}
        <div className="mb-4">
          {getActionButton()}
        </div>

        {/* Botón de sincronización manual */}
        {isActive && (
          <button
            onClick={syncWithDatabase}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
          >
            <RefreshCw className="w-3 h-3" />
            Sincronizar
          </button>
        )}

        {/* Advertencia si está offline */}
        {!isOnline && isActive && (
          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded mt-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Sin conexión</span>
          </div>
        )}
      </div>

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="absolute top-full right-0 mt-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setNotificationFilter('all')}
                className={`px-2 py-1 text-xs rounded ${
                  notificationFilter === 'all' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                Todas ({notificationStats.total})
              </button>
              <button
                onClick={() => setNotificationFilter('unread')}
                className={`px-2 py-1 text-xs rounded ${
                  notificationFilter === 'unread' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                No leídas ({notificationStats.unread})
              </button>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notificaciones..."
                value={notificationSearch}
                onChange={(e) => setNotificationSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                    !notification.read_at ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={markAllAsRead}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
