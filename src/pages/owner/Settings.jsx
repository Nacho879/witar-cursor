import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Clock, 
  FileText, 
  Bell,
  Edit,
  Calendar,
  MapPin,
  Phone,
  Globe,
  Mail,
  CheckCircle,
  AlertCircle,
  Lock,
  User
} from 'lucide-react';
import CompanySettingsModal from '@/components/CompanySettingsModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function Settings() {
  const [company, setCompany] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [userProfile, setUserProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);

  React.useEffect(() => {
    loadCompanyData();
  }, []);

  async function loadCompanyData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        // Cargar datos de la empresa
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userRole.company_id)
          .single();

        if (!companyError && companyData) {
          setCompany(companyData);
        }

        // Cargar configuraciones
        const { data: settingsData, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', userRole.company_id)
          .single();

        if (!settingsError && settingsData) {
          setSettings(settingsData);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getWorkDaysDisplay(workDays) {
    if (!workDays || workDays.length === 0) return 'No configurado';
    
    const dayNames = {
      monday: 'Lun',
      tuesday: 'Mar',
      wednesday: 'Mié',
      thursday: 'Jue',
      friday: 'Vie',
      saturday: 'Sáb',
      sunday: 'Dom'
    };
    
    return workDays.map(day => dayNames[day]).join(', ');
  }

  function formatTime(time) {
    if (!time) return 'No configurado';
    return time;
  }

  function getStatusIcon(enabled) {
    return enabled ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-orange-600" />
    );
  }

  function handleSettingsSaved(updatedCompany) {
    setCompany(updatedCompany);
    loadCompanyData(); // Recargar configuraciones
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
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
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la configuración de tu empresa
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Cambiar Contraseña
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar Configuración
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {company?.name || 'Empresa'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Información general de la empresa
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {company?.name || 'Nombre no configurado'}
                  </p>
                  <p className="text-xs text-muted-foreground">Nombre de la empresa</p>
                </div>
              </div>

              {company?.description && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {company.description}
                    </p>
                    <p className="text-xs text-muted-foreground">Descripción</p>
                  </div>
                </div>
              )}

              {company?.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                    <p className="text-xs text-muted-foreground">Sitio web</p>
                  </div>
                </div>
              )}

              {company?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {company.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {company?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {company.address}
                    </p>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                  </div>
                </div>
              )}

              {(company?.city || company?.state || company?.zip_code) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {[company.city, company.state, company.zip_code].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">Ciudad, Provincia, CP</p>
                  </div>
                </div>
              )}

              {company?.country && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {company.country}
                    </p>
                    <p className="text-xs text-muted-foreground">País</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Work Schedule */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Horario Laboral</h3>
              <p className="text-sm text-muted-foreground">Configuración de horarios</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Días laborables:</span>
              <span className="text-sm font-medium">
                {getWorkDaysDisplay(settings?.work_days)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Horario:</span>
              <span className="text-sm font-medium">
                {formatTime(settings?.work_start_time)} - {formatTime(settings?.work_end_time)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pausa:</span>
              <span className="text-sm font-medium">
                {formatTime(settings?.break_start_time)} - {formatTime(settings?.break_end_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Time Clock */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Control Horario</h3>
              <p className="text-sm text-muted-foreground">Configuración de fichajes</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ubicación requerida:</span>
              {getStatusIcon(settings?.require_location)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Horas extra permitidas:</span>
              {getStatusIcon(settings?.allow_overtime)}
            </div>
            {settings?.allow_overtime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Máx. horas extra:</span>
                <span className="text-sm font-medium">
                  {settings.max_overtime_hours || 0} h/mes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Requests */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Solicitudes</h3>
              <p className="text-sm text-muted-foreground">Configuración de permisos</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vacaciones por defecto:</span>
              <span className="text-sm font-medium">
                {settings?.default_vacation_days || 22} días
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Aprobación automática:</span>
              {getStatusIcon(settings?.auto_approve_requests)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Aprobación horas extra:</span>
              {getStatusIcon(settings?.require_approval_for_overtime)}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              <p className="text-sm text-muted-foreground">Configuración de alertas</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email:</span>
              {getStatusIcon(settings?.email_notifications)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Push:</span>
              {getStatusIcon(settings?.push_notifications)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Llegadas tardías:</span>
              {getStatusIcon(settings?.notify_late_arrivals)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ausencias:</span>
              {getStatusIcon(settings?.notify_absences)}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-gray-600" />
              </div>
            <div>
              <h3 className="font-semibold text-foreground">Acciones Rápidas</h3>
              <p className="text-sm text-muted-foreground">Gestionar configuración</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full btn btn-outline btn-sm"
            >
              <Edit className="w-4 h-4" />
              Editar Configuración
            </button>
            <button
              onClick={loadCompanyData}
              className="w-full btn btn-ghost btn-sm"
            >
              <SettingsIcon className="w-4 h-4" />
              Recargar Datos
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Información del Sistema</h3>
              <p className="text-sm text-muted-foreground">Estado y detalles</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <span className="badge bg-green-100 text-green-800">Activo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Última actualización:</span>
              <span className="text-sm font-medium">
                {company?.updated_at ? new Date(company.updated_at).toLocaleDateString('es-ES') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Configurado:</span>
              {getStatusIcon(!!settings)}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <CompanySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        company={company}
        onSettingsSaved={handleSettingsSaved}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
}
