// src/lib/browserNotificationService.js
export class BrowserNotificationService {
  // Solicitar permiso para notificaciones
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // Verificar si las notificaciones están permitidas
  static isPermissionGranted() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // Enviar notificación del navegador
  static async sendNotification(title, options = {}) {
    console.log('🔔 [BrowserNotification] Verificando permisos...');
    
    if (!this.isPermissionGranted()) {
      console.log('🔔 [BrowserNotification] Permisos no concedidos, solicitando...');
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ [BrowserNotification] Permiso de notificaciones denegado:', permission);
        return null;
      }
      console.log('✅ [BrowserNotification] Permisos concedidos');
    } else {
      console.log('✅ [BrowserNotification] Permisos ya concedidos');
    }

    const defaultOptions = {
      body: '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'witar-notification',
      requireInteraction: false,
      silent: false,
      ...options
    };

    console.log('🔔 [BrowserNotification] Creando notificación con opciones:', {
      title,
      body: defaultOptions.body,
      requireInteraction: defaultOptions.requireInteraction
    });

    try {
      const notification = new Notification(title, defaultOptions);
      console.log('✅ [BrowserNotification] Notificación creada exitosamente');
      
      // Si requireInteraction es true, no cerrar automáticamente
      // Solo cerrar después de 10 segundos si no requiere interacción
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
          console.log('🔔 [BrowserNotification] Notificación cerrada automáticamente');
        }, 10000);
      }

      // Manejar clic en la notificación
      notification.onclick = (event) => {
        event.preventDefault();
        console.log('🔔 [BrowserNotification] Notificación clickeada');
        window.focus();
        notification.close();
      };

      // Manejar errores de la notificación
      notification.onerror = (error) => {
        console.error('❌ [BrowserNotification] Error en la notificación:', error);
      };

      return notification;
    } catch (error) {
      console.error('❌ [BrowserNotification] Error enviando notificación del navegador:', error);
      return null;
    }
  }

  // Enviar notificación de recordatorio de fichaje
  static async sendClockInReminderNotification(employeeName) {
    console.log('⏰ [BrowserNotification] Enviando notificación de recordatorio de fichaje para:', employeeName);
    
    return await this.sendNotification(
      '⏰ Recordatorio de Fichaje',
      {
        body: `Hola ${employeeName}, recuerda fichar tu entrada cuando llegues al trabajo.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'clock-in-reminder',
        requireInteraction: false, // Cambiado a false para que se pueda cerrar automáticamente
        vibrate: [200, 100, 200], // Vibración en dispositivos móviles (solo funciona en service workers)
        data: {
          type: 'clock_in_reminder',
          employeeName
        }
      }
    );
  }
}

