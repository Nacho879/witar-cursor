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
  Lock
} from 'lucide-react';
import TimeEntryEditRequestModal from '@/components/TimeEntryEditRequestModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function ManagerProfile() {
  const [profile, setProfile] = React.useState(null);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    full_name: '',
    phone: '',
    position: ''
  });
  
  // Nuevos estados para funcionalidades del empleado
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [editMode, setEditMode] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [stats, setStats] = React.useState({
    daysWorked: 0,
    totalHours: 0,
    requestsCount: 0,
    documentsCount: 0
  });
  const [showTimeEditModal, setShowTimeEditModal] = React.useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = React.useState(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);

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

      // Cargar estadísticas
      const [timeResult, requestsResult, documentsResult] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', userRole.company_id),
        supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', userRole.company_id),
        supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', userRole.company_id)
      ]);

      const timeEntries = timeResult.data || [];
      const requests = requestsResult.data || [];
      const documents = documentsResult.data || [];

      // Calcular estadísticas
      const uniqueDays = new Set(timeEntries.map(entry => 
        new Date(entry.entry_time).toDateString()
      )).size;

      const totalHours = timeEntries.reduce((total, entry) => {
        if (entry.entry_type === 'clock_out' && entry.clock_in_time) {
          const clockIn = new Date(entry.clock_in_time);
          const clockOut = new Date(entry.entry_time);
          return total + (clockOut - clockIn) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      setStats({
        daysWorked: uniqueDays,
        totalHours: Math.round(totalHours * 100) / 100,
        requestsCount: requests.length,
        documentsCount: documents.length
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
      case 'time_entries':
        window.location.href = '/manager/time-entries';
        break;
      case 'requests':
        window.location.href = '/manager/requests';
        break;
      case 'team':
        window.location.href = '/manager/team';
        break;
      case 'documents':
        window.location.href = '/manager/documents';
        break;
      default:
        break;
    }
  }

  function handleTimeEditRequest(timeEntry) {
    setSelectedTimeEntry(timeEntry);
    setShowTimeEditModal(true);
  }

  async function loadProfileData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          position: profileData.position || ''
        });
      }

      // Obtener información laboral completa del manager
      const { data: managerRole } = await supabase
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
        .eq('role', 'manager')
        .eq('is_active', true)
        .single();

      if (managerRole) {
        // Obtener el email del manager usando la Edge Function
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds: [user.id] }
        });

        // Establecer la información laboral
        setCompanyInfo({
          company: managerRole.companies,
          department: managerRole.departments,
          role: managerRole.role,
          joined_at: managerRole.joined_at,
          email: emailData?.emails?.[0]?.email || 'No disponible'
        });

        // Cargar miembros del equipo
        if (managerRole.department_id) {
          // Cargar empleados del departamento del manager
          const { data: members, error } = await supabase
            .from('user_company_roles')
            .select(`
              id,
              user_id,
              role,
              is_active,
              joined_at,
              supervisor_id,
              departments (
                name
              )
            `)
            .eq('company_id', managerRole.company_id)
            .eq('department_id', managerRole.department_id)
            .eq('is_active', true)
            .neq('role', 'manager') // Excluir otros managers
            .order('joined_at', { ascending: true });

          if (!error && members) {
            // Obtener los perfiles de usuario por separado
            const userIds = members.map(member => member.user_id);
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, avatar_url, phone, position')
              .in('user_id', userIds);

            if (!profilesError && profiles) {
              // Obtener los emails usando la Edge Function
              const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds }
              });
              
              // Combinar los datos
              const membersWithProfiles = members.map(member => {
                const profile = profiles.find(p => p.user_id === member.user_id);
                const emailData = emailsData?.emails?.find(e => e.user_id === member.user_id);
                
                return {
                  ...member,
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  }
                };
              });
              
              setTeamMembers(membersWithProfiles);
            }
          }
        } else {
          // Si el manager no tiene departamento asignado, mostrar empleados con supervisor_id
          const { data: members, error } = await supabase
            .from('user_company_roles')
            .select(`
              id,
              user_id,
              role,
              is_active,
              joined_at,
              departments (
                name
              )
            `)
            .eq('company_id', managerRole.company_id)
            .eq('supervisor_id', managerRole.id)
            .eq('is_active', true)
            .order('joined_at', { ascending: true });

          if (!error && members) {
            // Obtener los perfiles de usuario por separado
            const userIds = members.map(member => member.user_id);
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('user_id, full_name, avatar_url, phone, position')
              .in('user_id', userIds);

            if (!profilesError && profiles) {
              // Obtener los emails usando la Edge Function
              const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds }
              });
              
              // Combinar los datos
              const membersWithProfiles = members.map(member => {
                const profile = profiles.find(p => p.user_id === member.user_id);
                const emailData = emailsData?.emails?.find(e => e.user_id === member.user_id);
                
                return {
                  ...member,
                  user_profiles: {
                    ...profile,
                    email: emailData?.email || 'No disponible'
                  }
                };
              });
              
              setTeamMembers(membersWithProfiles);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
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
        setShowEditModal(false);
        // Recargar datos
        await loadProfileData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user_profiles?.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && member.is_active) ||
      (statusFilter === 'inactive' && !member.is_active);
    
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu información personal y profesional
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
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => handleQuickAction('time_entries')}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center"
          >
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Mis Fichajes</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('requests')}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-center"
          >
            <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Mis Solicitudes</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('team')}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Mi Equipo</span>
          </button>
          
          <button
            onClick={() => handleQuickAction('documents')}
            className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center"
          >
            <Download className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Documentos</span>
          </button>
          
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-center"
          >
            <Lock className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Cambiar Contraseña</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Días Trabajados</p>
              <p className="text-3xl font-bold text-foreground">{stats.daysWorked}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes</p>
              <p className="text-3xl font-bold text-foreground">{stats.requestsCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Documentos</p>
              <p className="text-3xl font-bold text-foreground">{stats.documentsCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-600" />
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">Miembros del Equipo</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teamMembers.length} empleados
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entry Edit Request Modal */}
      <TimeEntryEditRequestModal
        isOpen={showTimeEditModal}
        onClose={() => {
          setShowTimeEditModal(false);
          setSelectedTimeEntry(null);
        }}
        timeEntry={selectedTimeEntry}
        onRequestSubmitted={() => {
          setShowTimeEditModal(false);
          setSelectedTimeEntry(null);
          // Recargar estadísticas
          loadStats();
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
} 