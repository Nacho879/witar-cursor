import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, User, Mail, Phone, MapPin, Calendar, Save, Camera } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState({
    full_name: '',
    phone: '',
    position: '',
    address: '',
    date_of_birth: '',
    avatar_url: null
  });

  React.useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  async function loadUserData() {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      setUser(user);

      // Obtener perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          position: profileData.position || '',
          address: profileData.address || '',
          date_of_birth: profileData.date_of_birth || '',
          avatar_url: profileData.avatar_url || null
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage('Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim() || null,
          position: profile.position.trim() || null,
          address: profile.address.trim() || null,
          date_of_birth: profile.date_of_birth || null,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMessage('✅ Perfil actualizado exitosamente');
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field, value) {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Mi Perfil
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && !profile.full_name ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium text-primary">
                      {profile.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">
                    {profile.full_name || 'Usuario'}
                  </h3>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre completo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="input w-full"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input w-full"
                    placeholder="+34 600 000 000"
                  />
                </div>

                {/* Posición */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Posición/Cargo
                  </label>
                  <input
                    type="text"
                    value={profile.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="input w-full"
                    placeholder="Desarrollador, Manager, etc."
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={profile.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Dirección
                  </label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="input w-full"
                    rows="3"
                    placeholder="Tu dirección completa"
                  />
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('✅') 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 