import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, Check, Trash2, Filter, Search, Clock, FileText, Users, Building2, Mail, AlertTriangle } from 'lucide-react';
import { NotificationService } from '@/lib/notificationService';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadNotifications();
    }
  }, [companyId, filter]);

  async function loadUserData() {
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
      console.error('Error loading user data:', error);
    }
  }

  async function loadNotifications() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && companyId) {
        let query = supabase
          .from('notifications')
          .select('*')
          .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        // Aplicar filtros
        if (filter === 'unread') {
          query = query.is('read_at', null);
        } else if (filter === 'read') {
          query = query.not('read_at', 'is', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filtrar por término de búsqueda
        let filteredNotifications = data || [];
        if (searchTerm) {
          filteredNotifications = filteredNotifications.filter(notification =>
            notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.message.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setNotifications(filteredNotifications);

        // Calcular estadísticas
        const total = data?.length || 0;
        const unread = data?.filter(n => !n.read_at).length || 0;
        const read = total - unread;

        setStats({ total, unread, read });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true }
            : n
        )
      );
      setStats(prev => ({ ...prev, unread: prev.unread - 1, read: prev.read + 1 }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await NotificationService.markAllAsRead(user.id);
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        setStats(prev => ({ ...prev, unread: 0, read: prev.total }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'request_approved': return <Check className="w-5 h-5 text-green-600" />;
      case 'request_rejected': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'time_edit_request': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'time_clock': return <Clock className="w-5 h-5 text-purple-600" />;
      case 'request': return <FileText className="w-5 h-5 text-orange-600" />;
      case 'employee': return <Users className="w-5 h-5 text-indigo-600" />;
      case 'document': return <FileText className="w-5 h-5 text-teal-600" />;
      case 'invitation': return <Mail className="w-5 h-5 text-pink-600" />;
      case 'company': return <Building2 className="w-5 h-5 text-gray-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Historial de Notificaciones</h1>
                <p className="text-muted-foreground">
                  Gestiona todas tus notificaciones
                </p>
              </div>
            </div>
            
            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No leídas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.read}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-card p-4 rounded-lg border border-border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar notificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Todas</option>
                <option value="unread">No leídas</option>
                <option value="read">Leídas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay notificaciones
              </h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'No tienes notificaciones aún'
                  : filter === 'unread'
                  ? 'No tienes notificaciones sin leer'
                  : 'No tienes notificaciones leídas'
                }
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-card p-6 rounded-lg border border-border transition-all hover:shadow-md ${
                  notification.read ? '' : 'ring-2 ring-primary/20'
                } ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-muted-foreground mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {notification.user_company_roles?.user_profiles && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {notification.user_company_roles.user_profiles.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Marcar como leída"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 