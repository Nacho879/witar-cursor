import { supabase } from './supabaseClient';

export class NotificationService {
  static async createNotification({
    companyId,
    recipientId = null, // null para notificaciones globales
    senderId = null,
    type,
    title,
    message,
    data = null
  }) {
    try {
      // Construir el objeto de inserción básico
      const insertData = {
        company_id: companyId,
        recipient_id: recipientId,
        type,
        title,
        message,
        created_at: new Date().toISOString()
      };

      // Intentar primero con todas las columnas (si están disponibles)
      if (senderId !== null) {
        insertData.sender_id = senderId;
      }
      if (data !== null) {
        insertData.data = data;
      }

      let { data: notification, error } = await supabase
        .from('notifications')
        .insert(insertData)
        .select()
        .single();

      // Si falla por columnas faltantes, intentar sin las opcionales
      if (error && (error.message?.includes("sender_id") || error.message?.includes("data"))) {
        const fallbackData = {
          company_id: companyId,
          recipient_id: recipientId,
          type,
          title,
          message,
          created_at: new Date().toISOString()
        };
        
        const { data: fallbackNotification, error: fallbackError } = await supabase
          .from('notifications')
          .insert(fallbackData)
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        return fallbackNotification;
      }

      if (error) throw error;
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notificaciones de fichajes
  static async notifyTimeClockEvent({
    companyId,
    userId,
    eventType,
    employeeName,
    time
  }) {
    const events = {
      clock_in: {
        title: 'Fichaje de entrada',
        message: `${employeeName} ha fichado entrada a las ${time}`
      },
      clock_out: {
        title: 'Fichaje de salida',
        message: `${employeeName} ha fichado salida a las ${time}`
      },
      break_start: {
        title: 'Inicio de pausa',
        message: `${employeeName} ha iniciado su pausa a las ${time}`
      },
      break_end: {
        title: 'Fin de pausa',
        message: `${employeeName} ha terminado su pausa a las ${time}`
      }
    };

    const event = events[eventType];
    if (!event) return;

    // Notificar a managers y admins
    const { data: managers } = await supabase
      .from('user_company_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['owner', 'admin', 'manager'])
      .eq('is_active', true);

    if (managers) {
      for (const manager of managers) {
        if (manager.user_id !== userId) {
          await this.createNotification({
            companyId,
            recipientId: manager.user_id,
            senderId: userId,
            type: 'time_clock',
            title: event.title,
            message: event.message,
            data: { eventType, time, employeeName }
          });
        }
      }
    }
  }

  // Notificaciones de solicitudes
  static async notifyRequestEvent({
    companyId,
    requestId,
    requestType,
    employeeName,
    eventType,
    managerId = null
  }) {
    const events = {
      created: {
        title: 'Nueva solicitud',
        message: `${employeeName} ha creado una solicitud de ${requestType}`,
        recipientId: managerId
      },
      approved: {
        title: 'Solicitud aprobada',
        message: `Tu solicitud de ${requestType} ha sido aprobada`,
        recipientId: null // Se enviará al empleado
      },
      rejected: {
        title: 'Solicitud rechazada',
        message: `Tu solicitud de ${requestType} ha sido rechazada`,
        recipientId: null // Se enviará al empleado
      }
    };

    const event = events[eventType];
    if (!event) return;

    // Para eventos de aprobación/rechazo, necesitamos obtener el empleado
    if (eventType === 'approved' || eventType === 'rejected') {
      const { data: request } = await supabase
        .from('requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (request) {
        await this.createNotification({
          companyId,
          recipientId: request.user_id,
          type: 'request',
          title: event.title,
          message: event.message,
          data: { requestId, requestType, eventType }
        });
      }
    } else {
      // Para nuevas solicitudes, notificar al manager
      if (event.recipientId) {
        await this.createNotification({
          companyId,
          recipientId: event.recipientId,
          type: 'request',
          title: event.title,
          message: event.message,
          data: { requestId, requestType, eventType }
        });
      }
    }
  }

  // Notificaciones de empleados
  static async notifyEmployeeEvent({
    companyId,
    eventType,
    employeeName,
    managerId = null
  }) {
    const events = {
      joined: {
        title: 'Nuevo empleado',
        message: `${employeeName} se ha unido a la empresa`,
        recipientId: null // Notificación global
      },
      left: {
        title: 'Empleado saliente',
        message: `${employeeName} ha dejado la empresa`,
        recipientId: null // Notificación global
      },
      status_changed: {
        title: 'Cambio de estado',
        message: `El estado de ${employeeName} ha sido actualizado`,
        recipientId: managerId
      }
    };

    const event = events[eventType];
    if (!event) return;

    await this.createNotification({
      companyId,
      recipientId: event.recipientId,
      type: 'employee',
      title: event.title,
      message: event.message,
      data: { eventType, employeeName }
    });
  }

  // Notificaciones de documentos
  static async notifyDocumentEvent({
    companyId,
    eventType,
    documentTitle,
    employeeName,
    departmentId = null
  }) {
    const events = {
      uploaded: {
        title: 'Nuevo documento',
        message: `${employeeName} ha subido "${documentTitle}"`,
        recipientId: null // Notificación global o por departamento
      },
      updated: {
        title: 'Documento actualizado',
        message: `${employeeName} ha actualizado "${documentTitle}"`,
        recipientId: null
      }
    };

    const event = events[eventType];
    if (!event) return;

    // Si es por departamento, notificar solo a miembros del departamento
    if (departmentId) {
      const { data: departmentMembers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('department_id', departmentId)
        .eq('is_active', true);

      if (departmentMembers) {
        for (const member of departmentMembers) {
          await this.createNotification({
            companyId,
            recipientId: member.user_id,
            type: 'document',
            title: event.title,
            message: event.message,
            data: { eventType, documentTitle, employeeName, departmentId }
          });
        }
      }
    } else {
      // Notificación global
      await this.createNotification({
        companyId,
        recipientId: null,
        type: 'document',
        title: event.title,
        message: event.message,
        data: { eventType, documentTitle, employeeName }
      });
    }
  }

  // Notificar cuando se sube un documento a un usuario específico
  static async notifyDocumentUploadedToUser({
    companyId,
    documentTitle,
    recipientUserId,
    uploaderName,
    documentId = null
  }) {
    try {
      // Obtener información del destinatario
      const { data: recipient } = await supabase
        .from('user_company_roles')
        .select('user_profiles(full_name)')
        .eq('user_id', recipientUserId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      const recipientName = recipient?.user_profiles?.full_name || 'Usuario';

      await this.createNotification({
        companyId,
        recipientId: recipientUserId,
        senderId: null, // El sistema envía la notificación
        type: 'document',
        title: 'Nuevo documento disponible',
        message: `${uploaderName} ha subido el documento "${documentTitle}" para ti`,
        data: { 
          documentTitle, 
          uploaderName, 
          recipientName,
          documentId 
        }
      });
    } catch (error) {
      console.error('Error notifying document upload to user:', error);
    }
  }

  // Notificaciones de invitaciones
  static async notifyInvitationEvent({
    companyId,
    eventType,
    invitedEmail,
    inviterName
  }) {
    const events = {
      sent: {
        title: 'Invitación enviada',
        message: `${inviterName} ha enviado una invitación a ${invitedEmail}`,
        recipientId: null // Notificación para admins
      },
      accepted: {
        title: 'Invitación aceptada',
        message: `${invitedEmail} ha aceptado la invitación`,
        recipientId: null // Notificación para admins
      },
      expired: {
        title: 'Invitación expirada',
        message: `La invitación para ${invitedEmail} ha expirado`,
        recipientId: null // Notificación para admins
      }
    };

    const event = events[eventType];
    if (!event) return;

    // Notificar a admins y owners
    const { data: admins } = await supabase
      .from('user_company_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['owner', 'admin'])
      .eq('is_active', true);

    if (admins) {
      for (const admin of admins) {
        await this.createNotification({
          companyId,
          recipientId: admin.user_id,
          type: 'invitation',
          title: event.title,
          message: event.message,
          data: { eventType, invitedEmail, inviterName }
        });
      }
    }
  }

  // Notificaciones de empresa
  static async notifyCompanyEvent({
    companyId,
    eventType,
    title,
    message,
    recipientId = null
  }) {
    await this.createNotification({
      companyId,
      recipientId,
      type: 'company',
      title,
      message,
      data: { eventType }
    });
  }

  // Notificaciones de advertencias
  static async notifyWarning({
    companyId,
    recipientId,
    title,
    message,
    data = null
  }) {
    await this.createNotification({
      companyId,
      recipientId,
      type: 'warning',
      title,
      message,
      data
    });
  }

  // Marcar notificación como leída
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Marcar todas las notificaciones como leídas
  static async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Obtener notificaciones del usuario
  static async getUserNotifications(userId, companyId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Obtener conteo de notificaciones no leídas
  static async getUnreadCount(userId, companyId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null`)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Obtener historial de notificaciones borradas
  static async getDeletedNotifications(userId, companyId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('deleted_notifications')
        .select('*')
        .eq('company_id', companyId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null,deleted_by.eq.${userId}`)
        .order('deleted_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting deleted notifications:', error);
      throw error;
    }
  }

  // Limpiar notificaciones borradas mayores a 15 días (solo para admins)
  static async cleanupOldDeletedNotifications() {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_deleted_notifications');
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up deleted notifications:', error);
      throw error;
    }
  }
} 