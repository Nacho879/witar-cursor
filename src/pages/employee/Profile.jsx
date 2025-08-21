import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building, 
  Users, 
  Edit, 
  Save, 
  X, 
  Camera,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';

export default function Profile() {
  const [userProfile, setUserProfile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [managerInfo, setManagerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({
    daysWorked: 0,
    totalHours: 0,
    requestsCount: 0,
    documentsCount: 0
  });

  useEffect(() => {
    loadProfileData();
    loadStats();
  }, []);

  async function loadProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Combinar datos del perfil con el email del usuario autenticado
      const profileWithEmail = {
        ...profile,
        email: user.email // Usar el email del usuario autenticado
      };
      
      setUserProfile(profileWithEmail);
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        avatar_url: profile.avatar_url || ''
      });

      // Cargar información de la empresa
      const { data: userRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select(`
          company_id,
          role,
          departments (
            name
          ),
          companies (
            name,
            address,
            phone,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!roleError && userRole) {
        setCompanyInfo({
          company: userRole.companies,
          department: userRole.departments,
          role: userRole.role
        });

        // Cargar información del manager
        if (userRole.departments && userRole.departments.id) {
          const { data: managerRole, error: managerError } = await supabase
            .from('user_company_roles')
            .select('user_id')
            .eq('company_id', userRole.company_id)
            .eq('department_id', userRole.departments.id)
            .eq('role', 'manager')
            .eq('is_active', true)
            .maybeSingle();

          if (!managerError && managerRole) {
            const { data: managerProfile, error: managerProfileError } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('user_id', managerRole.user_id)
              .single();

            if (!managerProfileError && managerProfile) {
              setManagerInfo(managerProfile);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
      setMessage('Error al cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener estadísticas de fichajes
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('entry_time, entry_type')
        .eq('user_id', user.id);

      // Obtener estadísticas de solicitudes
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', user.id);

      // Obtener estadísticas de documentos
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id);

      if (!timeError && !requestsError && !documentsError) {
        // Calcular días trabajados (días únicos con fichajes)
        const uniqueDays = new Set();
        if (timeEntries) {
          timeEntries.forEach(entry => {
            const date = new Date(entry.entry_time).toDateString();
            uniqueDays.add(date);
          });
        }

        // Calcular horas totales (aproximado)
        let totalHours = 0;
        if (timeEntries) {
          const entriesByDay = {};
          timeEntries.forEach(entry => {
            const date = new Date(entry.entry_time).toDateString();
            if (!entriesByDay[date]) entriesByDay[date] = [];
            entriesByDay[date].push(entry);
          });

          Object.values(entriesByDay).forEach(dayEntries => {
            if (dayEntries.length >= 2) {
              // Calcular horas entre entrada y salida
              const sortedEntries = dayEntries.sort((a, b) => 
                new Date(a.entry_time) - new Date(b.entry_time)
              );
              
              for (let i = 0; i < sortedEntries.length - 1; i += 2) {
                const start = new Date(sortedEntries[i].entry_time);
                const end = new Date(sortedEntries[i + 1].entry_time);
                const hours = (end - start) / (1000 * 60 * 60);
                totalHours += hours;
              }
            }
          });
        }

        setStats({
          daysWorked: uniqueDays.size,
          totalHours: Math.round(totalHours * 10) / 10,
          requestsCount: requests?.length || 0,
          documentsCount: documents?.length || 0
        });
      }

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage('Error: Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Error: El archivo es demasiado grande (máximo 5MB)');
      return;
    }

    setUploadingAvatar(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado o ID no válido');
      }

      // Convertir imagen a base64 para almacenamiento temporal
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Image = e.target.result;
          
          // Actualizar perfil con imagen en base64
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ avatar_url: base64Image })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Update error:', updateError);
            throw new Error(`Error al actualizar perfil: ${updateError.message}`);
          }

          // Actualizar estado local
          setUserProfile(prev => ({ ...prev, avatar_url: base64Image }));
          setEditForm(prev => ({ ...prev, avatar_url: base64Image }));
          setMessage('Avatar actualizado correctamente');

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => setMessage(''), 3000);

        } catch (error) {
          console.error('Error processing avatar:', error);
          setMessage(`Error al procesar el avatar: ${error.message}`);
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        setMessage('Error al leer el archivo de imagen');
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage(`Error al subir el avatar: ${error.message}`);
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('user_profiles')
        .update(editForm)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserProfile(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
      setMessage('Perfil actualizado correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditForm({
      full_name: userProfile?.full_name || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || '',
      avatar_url: userProfile?.avatar_url || ''
    });
    setEditMode(false);
    setMessage('');
  }

  function handleQuickAction(action) {
    switch (action) {
      case 'time-entries':
        window.location.href = '/employee/my-time-entries';
        break;
      case 'requests':
        window.location.href = '/employee/my-requests';
        break;
      case 'documents':
        window.location.href = '/employee/my-documents';
        break;
      case 'download':
        // Implementar descarga de datos
        alert('Función de descarga próximamente');
        break;
      default:
        break;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu información personal y profesional
          </p>
        </div>
        <div className="flex items-center gap-3">
          
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') 
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.includes('Error') ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <span className={`text-sm font-medium ${
              message.includes('Error') 
                ? 'text-red-800 dark:text-red-200' 
                : 'text-green-800 dark:text-green-200'
            }`}>
              {message}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Perfil Principal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Información Personal
                </h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img 
                          src={userProfile.avatar_url} 
                          alt="Avatar" 
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    {editMode && (
                      <div className="absolute bottom-0 right-0">
                        <label className="cursor-pointer">
                          <div className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors">
                            {uploadingAvatar ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre Completo
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {userProfile?.full_name || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {userProfile?.email || 'No especificado'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Email con el que aceptaste la invitación
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Teléfono
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {userProfile?.phone || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dirección
                      </label>
                      {editMode ? (
                        <textarea
                          value={editForm.address}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {userProfile?.address || 'No especificado'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Información Laboral
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Empresa</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {companyInfo?.company?.name || 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Departamento</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {companyInfo?.department?.name || 'Sin departamento'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cargo</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {companyInfo?.role || 'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Registro</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('es-ES') : 'No especificado'}
                      </p>
                    </div>
                  </div>

                  {managerInfo && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manager Asignado</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {managerInfo.full_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {userProfile?.email || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  )}

                  {companyInfo?.company && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dirección de la Empresa</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {companyInfo.company.address || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Acciones Rápidas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Acciones Rápidas
              </h3>
            </div>
            
            <div className="p-6 space-y-3">
              <button 
                onClick={() => handleQuickAction('time-entries')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 dark:text-gray-300">Ver mis fichajes</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('requests')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">Mis solicitudes</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('documents')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700 dark:text-gray-300">Mis documentos</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('download')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5 text-orange-600" />
                <span className="text-gray-700 dark:text-gray-300">Descargar datos</span>
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Estadísticas
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Días trabajados</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.daysWorked}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Horas totales</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.totalHours}h</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Solicitudes</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.requestsCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Documentos</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.documentsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 