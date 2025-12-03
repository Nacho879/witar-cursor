import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { BrowserNotificationService } from '@/lib/browserNotificationService';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Mail, 
  FileText, 
  Calendar, 
  Users, 
  Settings, 
  DollarSign, 
  Building,
  Edit
} from 'lucide-react';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [userRole, setUserRole] = React.useState(null);

  React.useEffect(() => {
    let channel = null;
    
    async function initialize() {
      try {
        // Obtener el rol del usuario
        const role = sessionStorage.getItem('userRole');
        if (role) {
          setUserRole(role);
        } else {
          // Si no está en sessionStorage, consultar directamente
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userRoleData } = await supabase
              .from('user_company_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .single();
            if (userRoleData) {
              setUserRole(userRoleData.role);
            }
          }
        }
        
        await loadNotifications();
        channel = setupRealtimeSubscription();
      } catch (error) {
        console.error('Error initializing notification center:', error);
      }
    }
    
    initialize();
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('company_id', userRole.company_id)
          .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read_at).length);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSubscription() {
    // Obtener el usuario de forma asíncrona
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Nueva notificación recibida:', payload.new);
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Enviar notificación del navegador si es recordatorio de fichaje
            if (payload.new.type === 'clock_in_reminder') {
              console.log('⏰ Notificación de recordatorio de fichaje detectada');
              
              // Parsear el campo data si viene como string JSON
              let notificationData = payload.new.data;
              if (typeof notificationData === 'string') {
                try {
                  notificationData = JSON.parse(notificationData);
                } catch (e) {
                  console.warn('Error parseando data de notificación:', e);
                  notificationData = {};
                }
              }
              
              const employeeName = notificationData?.employee_name || 'Usuario';
              console.log('👤 Nombre del empleado:', employeeName);
              console.log('📱 Intentando enviar notificación del navegador...');
              
              BrowserNotificationService.sendClockInReminderNotification(employeeName)
                .then(notification => {
                  if (notification) {
                    console.log('✅ Notificación del navegador enviada exitosamente');
                  } else {
                    console.warn('⚠️ No se pudo enviar la notificación del navegador');
                  }
                })
                .catch(error => {
                  console.error('❌ Error enviando notificación del navegador:', error);
                });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'time_clock':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'request':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'request_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'request_rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'time_edit_request':
        return <Edit className="w-4 h-4 text-orange-600" />;
      case 'employee':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'invitation':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'company':
        return <Building className="w-4 h-4 text-gray-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  function getNotificationColor(type) {
    switch (type) {
      case 'time_clock':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      case 'request':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'request_approved':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      case 'request_rejected':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'time_edit_request':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'employee':
        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10';
      case 'document':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'invitation':
        return 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10';
      case 'company':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
      case 'warning':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  }

  function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Ahora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('es-ES');
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              {notifications.filter(n => n.type === 'request' && !n.read_at).length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <FileText className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    {notifications.filter(n => n.type === 'request' && !n.read_at).length} nueva{notifications.filter(n => n.type === 'request' && !n.read_at).length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No hay notificaciones</p>
                <p className="text-sm">Te notificaremos cuando haya novedades</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-secondary transition-colors cursor-pointer border-l-4 ${
                      notification.read_at ? '' : 'bg-secondary/50'
                    } ${getNotificationColor(notification.type)}`}
                    onClick={() => markAsRead(notification.id)}
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
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.sender_id && (
                            <span className="text-xs text-muted-foreground">
                              Sistema
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-secondary/20">
              <button
                onClick={() => {
                  setIsOpen(false);
                  const notificationsPath = userRole === 'owner' ? '/owner/notifications' :
                                          userRole === 'admin' ? '/admin/notifications' :
                                          userRole === 'manager' ? '/manager/notifications' :
                                          '/employee/notifications';
                  navigate(notificationsPath);
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 