import { supabase } from './supabaseClient';

export class UserService {
  // Obtener emails de múltiples usuarios
  static async getUserEmails(userIds) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      
      // Filtrar solo los usuarios que necesitamos
      const userEmails = data.users
        .filter(user => userIds.includes(user.id))
        .map(user => ({
          user_id: user.id,
          email: user.email
        }));
      
      return userEmails;
    } catch (error) {
      console.error('Error getting user emails:', error);
      return [];
    }
  }

  // Obtener email de un usuario específico
  static async getUserEmail(userId) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      
      if (error) throw error;
      
      return data.user?.email || null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }

  // Obtener información completa de usuarios
  static async getUsersInfo(userIds) {
    try {
      // Verificar que userIds sea un array válido
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      // Obtener perfiles de usuario usando la sintaxis correcta de Supabase
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
        throw profilesError;
      }

      // Obtener emails usando Edge Function
      const { data: emailsData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      // Combinar datos
      const usersInfo = userIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const email = emailsData?.emails?.find(e => e.user_id === userId)?.email;
        
        return {
          user_id: userId,
          full_name: profile?.full_name || 'Usuario sin perfil',
          avatar_url: profile?.avatar_url,
          email: email || 'No disponible'
        };
      });

      return usersInfo;
    } catch (error) {
      console.error('Error getting users info:', error);
      return [];
    }
  }
} 