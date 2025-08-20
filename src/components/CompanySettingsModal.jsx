import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Building2, Settings as SettingsIcon, AlertCircle, CheckCircle, Save, Clock, Bell, Users } from 'lucide-react';

export default function CompanySettingsModal({ isOpen, onClose, company, onSettingsSaved }) {
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('general');
  
  // Datos generales
  const [companyName, setCompanyName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [size, setSize] = React.useState('small');
  
  // Configuración de horarios
  const [workingHoursPerDay, setWorkingHoursPerDay] = React.useState(8.0);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = React.useState(5);
  const [timezone, setTimezone] = React.useState('UTC');
  
  // Configuración de fichajes
  const [requireLocation, setRequireLocation] = React.useState(false);
  const [allowOvertime, setAllowOvertime] = React.useState(true);
  
  // Configuración de solicitudes
  const [autoApproveRequests, setAutoApproveRequests] = React.useState(false);
  const [maxVacationDays, setMaxVacationDays] = React.useState(20);
  
  // Configuración de alertas
  const [notifyTimeClock, setNotifyTimeClock] = React.useState(true);
  const [notifyRequests, setNotifyRequests] = React.useState(true);
  const [notifyEmployees, setNotifyEmployees] = React.useState(true);
  const [notifyDocuments, setNotifyDocuments] = React.useState(true);
  const [notifyInvitations, setNotifyInvitations] = React.useState(true);
  const [notifyLateArrivals, setNotifyLateArrivals] = React.useState(true);
  const [notifyAbsences, setNotifyAbsences] = React.useState(true);
  const [notifyOvertime, setNotifyOvertime] = React.useState(true);
  const [notifySystemWarnings, setNotifySystemWarnings] = React.useState(true);
  
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (isOpen && company) {
      loadCompanyData();
    }
  }, [isOpen, company]);

  async function loadCompanyData() {
    try {
      // Cargar datos de la empresa
      setCompanyName(company.name || '');
      setDescription(company.description || '');
      setWebsite(company.website || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setEmail(company.email || '');
      setIndustry(company.industry || '');
      setSize(company.size || 'small');

      // Cargar configuraciones
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (!error && settings) {
        // Configuración de horarios
        setWorkingHoursPerDay(settings.working_hours_per_day || 8.0);
        setWorkingDaysPerWeek(settings.working_days_per_week || 5);
        setTimezone(settings.timezone || 'UTC');

        // Configuración de fichajes
        setRequireLocation(settings.require_location || false);
        setAllowOvertime(settings.allow_overtime || true);

        // Configuración de solicitudes
        setAutoApproveRequests(settings.auto_approve_requests || false);
        setMaxVacationDays(settings.max_vacation_days || 20);

        // Configuración de alertas
        setNotifyTimeClock(settings.notify_time_clock !== false);
        setNotifyRequests(settings.notify_requests !== false);
        setNotifyEmployees(settings.notify_employees !== false);
        setNotifyDocuments(settings.notify_documents !== false);
        setNotifyInvitations(settings.notify_invitations !== false);
        setNotifyLateArrivals(settings.notify_late_arrivals !== false);
        setNotifyAbsences(settings.notify_absences !== false);
        setNotifyOvertime(settings.notify_overtime !== false);
        setNotifySystemWarnings(settings.notify_system_warnings !== false);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  }

  function validateForm() {
    if (!companyName.trim()) {
      setMessage('Error: El nombre de la empresa es obligatorio');
      return false;
    }

    if (companyName.trim().length < 2) {
      setMessage('Error: El nombre debe tener al menos 2 caracteres');
      return false;
    }

    if (website && !isValidUrl(website)) {
      setMessage('Error: La URL del sitio web no es válida');
      return false;
    }

    if (maxVacationDays < 0 || maxVacationDays > 365) {
      setMessage('Error: Los días de vacaciones deben estar entre 0 y 365');
      return false;
    }

    return true;
  }

  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function saveSettings() {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      // Actualizar datos de la empresa
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          name: companyName.trim(),
          description: description.trim() || null,
          website: website.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          industry: industry.trim() || null,
          size: size.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (companyError) throw companyError;

      // Actualizar o crear configuraciones
      const { error: settingsError } = await supabase
        .from('company_settings')
        .upsert({
          company_id: company.id,
          working_hours_per_day: workingHoursPerDay,
          working_days_per_week: workingDaysPerWeek,
          timezone: timezone,
          require_location: requireLocation,
          allow_overtime: allowOvertime,
          auto_approve_requests: autoApproveRequests,
          max_vacation_days: maxVacationDays,
          notify_time_clock: notifyTimeClock,
          notify_requests: notifyRequests,
          notify_employees: notifyEmployees,
          notify_documents: notifyDocuments,
          notify_invitations: notifyInvitations,
          notify_late_arrivals: notifyLateArrivals,
          notify_absences: notifyAbsences,
          notify_overtime: notifyOvertime,
          notify_system_warnings: notifySystemWarnings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        });

      if (settingsError) throw settingsError;

      setMessage('¡Configuración guardada exitosamente!');
      
      // Notificar al componente padre
      if (onSettingsSaved) {
        onSettingsSaved({
          ...company,
          name: companyName.trim(),
          description: description.trim() || null,
          website: website.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          industry: industry.trim() || null,
          size: size.trim() || null
        });
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Configuración de Empresa</h2>
              <p className="text-sm text-muted-foreground">
                Personaliza los ajustes de tu empresa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'general', label: 'Datos Generales', icon: Building2 },
            { id: 'schedule', label: 'Horarios', icon: SettingsIcon },
            { id: 'timeclock', label: 'Fichajes', icon: SettingsIcon },
            { id: 'requests', label: 'Solicitudes', icon: SettingsIcon },
            { id: 'alerts', label: 'Alertas', icon: Bell }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre de la Empresa <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input w-full"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sitio Web</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://ejemplo.com"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Industria</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tamaño</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-8">
              {/* Horario de trabajo */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Horario de Trabajo
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Horas por día <span className="text-muted-foreground">(estándar)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={workingHoursPerDay}
                        onChange={(e) => setWorkingHoursPerDay(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="24"
                        step="0.5"
                        className="input w-full pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        h
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Horas estándar por día laboral
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Días por semana <span className="text-muted-foreground">(laborables)</span>
                    </label>
                    <select
                      value={workingDaysPerWeek}
                      onChange={(e) => setWorkingDaysPerWeek(parseInt(e.target.value) || 5)}
                      className="input w-full"
                    >
                      <option value="5">5 días (Lunes - Viernes)</option>
                      <option value="6">6 días (Lunes - Sábado)</option>
                      <option value="7">7 días (Lunes - Domingo)</option>
                      <option value="4">4 días (Lunes - Jueves)</option>
                      <option value="3">3 días (Lunes - Miércoles)</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Días laborables por semana
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Zona horaria <span className="text-muted-foreground">(empresa)</span>
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="input w-full"
                    >
                      <option value="Europe/Madrid">Europe/Madrid (GMT+1/+2)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (GMT-8/-7)</option>
                      <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                      <option value="Europe/Paris">Europe/Paris (GMT+1/+2)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      <option value="Australia/Sydney">Australia/Sydney (GMT+10/+11)</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Zona horaria de la empresa
                    </p>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="card p-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Configuración de Horarios</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>Horas semanales:</strong> {workingHoursPerDay * workingDaysPerWeek} horas</p>
                      <p>• <strong>Horas mensuales:</strong> {(workingHoursPerDay * workingDaysPerWeek * 4.33).toFixed(1)} horas (promedio)</p>
                      <p>• <strong>Zona horaria:</strong> {timezone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas importantes */}
              <div className="card p-4 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  </div>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Nota importante:</p>
                    <p>Esta configuración se utilizará como base para calcular las horas trabajadas, detectar tardanzas y gestionar las horas extra de los empleados.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeclock Tab */}
          {activeTab === 'timeclock' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLocation}
                    onChange={(e) => setRequireLocation(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Requerir ubicación en fichajes</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowOvertime}
                    onChange={(e) => setAllowOvertime(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Permitir horas extra</span>
                </label>
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApproveRequests}
                    onChange={(e) => setAutoApproveRequests(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Aprobar solicitudes automáticamente</span>
                </label>

                <div>
                  <label className="block text-sm font-medium mb-2">Días de vacaciones máximos</label>
                  <input
                    type="number"
                    value={maxVacationDays}
                    onChange={(e) => setMaxVacationDays(parseInt(e.target.value) || 0)}
                    min="0"
                    max="365"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-8">
              {/* Notificaciones de fichajes */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Fichajes y Asistencia
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyTimeClock}
                      onChange={(e) => setNotifyTimeClock(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Fichajes de empleados</span>
                      <p className="text-xs text-muted-foreground">Notificar cuando los empleados fichan entrada/salida</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyLateArrivals}
                      onChange={(e) => setNotifyLateArrivals(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Llegadas tardías</span>
                      <p className="text-xs text-muted-foreground">Alertar cuando un empleado llega tarde</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyAbsences}
                      onChange={(e) => setNotifyAbsences(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Ausencias no justificadas</span>
                      <p className="text-xs text-muted-foreground">Notificar cuando un empleado no ficha</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyOvertime}
                      onChange={(e) => setNotifyOvertime(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Horas extra</span>
                      <p className="text-xs text-muted-foreground">Alertar cuando se registran horas extra</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notificaciones de solicitudes */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Solicitudes y Permisos
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyRequests}
                      onChange={(e) => setNotifyRequests(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Nuevas solicitudes</span>
                      <p className="text-xs text-muted-foreground">Notificar cuando se crean solicitudes de vacaciones/permisos</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notificaciones de empleados */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Gestión de Empleados
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyEmployees}
                      onChange={(e) => setNotifyEmployees(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Cambios de empleados</span>
                      <p className="text-xs text-muted-foreground">Notificar altas, bajas y cambios de estado</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyInvitations}
                      onChange={(e) => setNotifyInvitations(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Invitaciones</span>
                      <p className="text-xs text-muted-foreground">Notificar envío y aceptación de invitaciones</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notificaciones de documentos */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-purple-600" />
                  Documentos y Sistema
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyDocuments}
                      onChange={(e) => setNotifyDocuments(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Documentos</span>
                      <p className="text-xs text-muted-foreground">Notificar subida y actualización de documentos</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifySystemWarnings}
                      onChange={(e) => setNotifySystemWarnings(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium">Advertencias del sistema</span>
                      <p className="text-xs text-muted-foreground">Notificar errores y advertencias importantes</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Información adicional */}
              <div className="card p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Configuración de Alertas</p>
                    <p>Estas configuraciones controlan qué notificaciones recibirás como administrador. Los empleados siempre recibirán notificaciones relevantes para ellos.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.includes('Error')
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-success/10 text-success border border-success/20'
            }`}>
              {message.includes('Error') ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 