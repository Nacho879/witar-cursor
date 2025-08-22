import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Clock,
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  Activity,
  CheckCircle,
  XCircle,
  Camera,
  Download,
  FileText,
  Upload,
  Save,
  X,
  AlertCircle,
  Settings,
  Shield
} from 'lucide-react';

export default function AdminProfile() {
  const [profile, setProfile] = React.useState(null);
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [editMode, setEditMode] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    totalDepartments: 0,
    totalRequests: 0,
    totalDocuments: 0
  });
  const [editForm, setEditForm] = React.useState({
    full_name: '',
    phone: '',
    position: ''
  });

  React.useEffect(() => {
    loadProfileData();
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el company_id del usuario
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Cargar estadísticas de la empresa
      const [employeesResult, departmentsResult, requestsResult, documentsResult] = await Promise.all([
        supabase
          .from('user_company_roles')
          .select('*', { count: 'exact' })
          .eq('company_id', userRole.company_id)
          .eq('is_active', true),
        supabase
          .from('departments')
          .select('*', { count: 'exact' })
          .eq('company_id', userRole.company_id),
        supabase
          .from('requests')
          .select('*', { count: 'exact' })
          .eq('company_id', userRole.company_id),
        supabase
          .from('documents')
          .select('*', { count: 'exact' })
          .eq('company_id', userRole.company_id)
      ]);

      setStats({
        totalEmployees: employeesResult.count || 0,
        totalDepartments: departmentsResult.count || 0,
        totalRequests: requestsResult.count || 0,
        totalDocuments: documentsResult.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target.result;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('user_profiles')
          .update({ avatar_url: base64String })
          .eq('user_id', user.id);

        if (error) throw error;

        setProfile(prev => ({ ...prev, avatar_url: base64String }));
        setMessage('✅ Avatar actualizado correctamente');
        setTimeout(() => setMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage('❌ Error al subir el avatar');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleQuickAction(action) {
    switch (action) {
      case 'employees':
        window.location.href = '/admin/employees';
        break;
      case 'departments':
        window.location.href = '/admin/departments';
        break;
      case 'requests':
        window.location.href = '/admin/requests';
        break;
      case 'documents':
        window.location.href = '/admin/documents';
        break;
      case 'time_entries':
        window.location.href = '/admin/time-entries';
        break;
      case 'settings':
        window.location.href = '/admin/settings';
        break;
      default:
        break;
    }
  }

  async function loadProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔄 Iniciando carga de datos del usuario...');

      // Cargar perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('📋 Resultado perfil:', { profileData, error: profileError });

      if (!profileError && profileData) {
        setProfile(profileData);
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          position: profileData.position || ''
        });
      } else if (!profileData) {
        // Crear perfil si no existe
        console.log('🔄 Creando perfil automáticamente...');
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.email?.split('@')[0] || 'Administrador',
            phone: '',
            position: 'Administrador'
          })
          .select()
          .single();

        if (!createError && newProfile) {
          console.log('✅ Perfil creado:', newProfile);
          setProfile(newProfile);
          setEditForm({
            full_name: newProfile.full_name || '',
            phone: newProfile.phone || '',
            position: newProfile.position || ''
          });
        }
      }

      // Obtener información laboral completa del admin
      const { data: adminRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select(`
          id, 
          company_id, 
          department_id, 
          role,
          joined_at,
          companies (
            id,
            name,
            description,
            address,
            phone,
            email,
            website,
            logo_url
          ),
          departments (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .single();

      console.log('👤 Resultado rol:', { adminRole, error: roleError });

      if (adminRole) {
        // Obtener el email del admin usando la Edge Function
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds: [user.id] }
        });

        // Establecer la información laboral
        setCompanyInfo({
          company: adminRole.companies,
          department: adminRole.departments,
          role: adminRole.role,
          joined_at: adminRole.joined_at,
          email: emailData?.emails?.[0]?.email || 'No disponible'
        });

        console.log('🏢 Información de empresa establecida:', {
          company: adminRole.companies,
          department: adminRole.departments,
          role: adminRole.role,
          joined_at: adminRole.joined_at,
          email: emailData?.emails?.[0]?.email
        });
      } else if (!adminRole) {
        // Crear rol si no existe
        console.log('🔄 Creando rol automáticamente...');
        // Buscar primera empresa disponible
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .limit(1);

        if (companies && companies.length > 0) {
          const { data: newRole, error: createRoleError } = await supabase
            .from('user_company_roles')
            .insert({
              user_id: user.id,
              company_id: companies[0].id,
              role: 'admin',
              is_active: true,
              joined_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!createRoleError && newRole) {
            console.log('✅ Rol creado:', newRole);
            // Recargar datos después de crear el rol
            await loadProfileData();
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          position: editForm.position,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (!error) {
        setProfile(prev => ({ ...prev, ...editForm }));
        setEditMode(false);
        setMessage('Perfil actualizado correctamente');
        // Recargar datos
        await loadProfileData();
      } else {
        setMessage('Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditMode(false);
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      position: profile?.position || ''
    });
    setMessage('');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
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
            Gestiona tu información personal y profesional como Administrador
          </p>
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

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => handleQuickAction('employees')}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Empleados</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('departments')}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-center"
          >
            <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Departamentos</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('requests')}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-center"
          >
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Solicitudes</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('time_entries')}
            className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center"
          >
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Fichajes</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('documents')}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-center"
          >
            <Download className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Documentos</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('settings')}
            className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors text-center"
          >
            <Settings className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Configuración</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Empleados</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Departamentos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDepartments}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solicitudes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalRequests}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Documentos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDocuments}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <div className="lg:col-span-3 space-y-6">
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
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
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
                          {profile?.full_name || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {companyInfo?.email || 'No especificado'}
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
                          {profile?.phone || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cargo
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editForm.position}
                          onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profile?.position || 'No especificado'}
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
                      <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Ingreso</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {companyInfo?.joined_at ? new Date(companyInfo.joined_at).toLocaleDateString('es-ES') : 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Empleados a Cargo</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {stats.totalEmployees} empleados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Departamentos</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {stats.totalDepartments} departamentos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 