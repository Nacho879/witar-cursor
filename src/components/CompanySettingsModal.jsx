import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Building2, Settings, AlertCircle, CheckCircle, Save } from 'lucide-react';

export default function CompanySettingsModal({ isOpen, onClose, company, onSettingsSaved }) {
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('general');
  
  // Datos generales
  const [companyName, setCompanyName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [zipCode, setZipCode] = React.useState('');
  const [country, setCountry] = React.useState('España');
  
  // Configuración de horarios
  const [workDays, setWorkDays] = React.useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [workStartTime, setWorkStartTime] = React.useState('09:00');
  const [workEndTime, setWorkEndTime] = React.useState('18:00');
  const [breakStartTime, setBreakStartTime] = React.useState('13:00');
  const [breakEndTime, setBreakEndTime] = React.useState('14:00');
  
  // Configuración de fichajes
  const [requireLocation, setRequireLocation] = React.useState(false);
  const [allowOvertime, setAllowOvertime] = React.useState(true);
  const [maxOvertimeHours, setMaxOvertimeHours] = React.useState(40);
  const [autoApproveOvertime, setAutoApproveOvertime] = React.useState(false);
  
  // Configuración de solicitudes
  const [defaultVacationDays, setDefaultVacationDays] = React.useState(22);
  const [autoApproveRequests, setAutoApproveRequests] = React.useState(false);
  const [requireApprovalForOvertime, setRequireApprovalForOvertime] = React.useState(true);
  
  // Configuración de notificaciones
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [notifyLateArrivals, setNotifyLateArrivals] = React.useState(true);
  const [notifyAbsences, setNotifyAbsences] = React.useState(true);
  
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
      setCity(company.city || '');
      setState(company.state || '');
      setZipCode(company.zip_code || '');
      setCountry(company.country || 'España');

      // Cargar configuraciones
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (!error && settings) {
        // Configuración de horarios
        setWorkDays(settings.work_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
        setWorkStartTime(settings.work_start_time || '09:00');
        setWorkEndTime(settings.work_end_time || '18:00');
        setBreakStartTime(settings.break_start_time || '13:00');
        setBreakEndTime(settings.break_end_time || '14:00');

        // Configuración de fichajes
        setRequireLocation(settings.require_location || false);
        setAllowOvertime(settings.allow_overtime || true);
        setMaxOvertimeHours(settings.max_overtime_hours || 40);
        setAutoApproveOvertime(settings.auto_approve_overtime || false);

        // Configuración de solicitudes
        setDefaultVacationDays(settings.default_vacation_days || 22);
        setAutoApproveRequests(settings.auto_approve_requests || false);
        setRequireApprovalForOvertime(settings.require_approval_for_overtime || true);

        // Configuración de notificaciones
        setEmailNotifications(settings.email_notifications || true);
        setPushNotifications(settings.push_notifications || true);
        setNotifyLateArrivals(settings.notify_late_arrivals || true);
        setNotifyAbsences(settings.notify_absences || true);
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

    if (maxOvertimeHours < 0 || maxOvertimeHours > 168) {
      setMessage('Error: Las horas extra máximas deben estar entre 0 y 168');
      return false;
    }

    if (defaultVacationDays < 0 || defaultVacationDays > 365) {
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
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          country: country.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (companyError) throw companyError;

      // Actualizar o crear configuraciones
      const { error: settingsError } = await supabase
        .from('company_settings')
        .upsert({
          company_id: company.id,
          work_days: workDays,
          work_start_time: workStartTime,
          work_end_time: workEndTime,
          break_start_time: breakStartTime,
          break_end_time: breakEndTime,
          require_location: requireLocation,
          allow_overtime: allowOvertime,
          max_overtime_hours: maxOvertimeHours,
          auto_approve_overtime: autoApproveOvertime,
          default_vacation_days: defaultVacationDays,
          auto_approve_requests: autoApproveRequests,
          require_approval_for_overtime: requireApprovalForOvertime,
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          notify_late_arrivals: notifyLateArrivals,
          notify_absences: notifyAbsences,
          updated_at: new Date().toISOString()
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
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          country: country.trim()
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

  function toggleWorkDay(day) {
    setWorkDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }

  const workDaysOptions = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
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
            { id: 'schedule', label: 'Horarios', icon: Settings },
            { id: 'timeclock', label: 'Fichajes', icon: Settings },
            { id: 'requests', label: 'Solicitudes', icon: Settings },
            { id: 'notifications', label: 'Notificaciones', icon: Settings }
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
                  <label className="block text-sm font-medium mb-2">País</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Provincia</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Código Postal</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Días Laborables</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {workDaysOptions.map((day) => (
                    <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workDays.includes(day.value)}
                        onChange={() => toggleWorkDay(day.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Hora de Inicio</label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hora de Fin</label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Inicio de Pausa</label>
                  <input
                    type="time"
                    value={breakStartTime}
                    onChange={(e) => setBreakStartTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fin de Pausa</label>
                  <input
                    type="time"
                    value={breakEndTime}
                    onChange={(e) => setBreakEndTime(e.target.value)}
                    className="input w-full"
                  />
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

                {allowOvertime && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Horas extra máximas por mes</label>
                      <input
                        type="number"
                        value={maxOvertimeHours}
                        onChange={(e) => setMaxOvertimeHours(parseInt(e.target.value) || 0)}
                        min="0"
                        max="168"
                        className="input w-full"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoApproveOvertime}
                        onChange={(e) => setAutoApproveOvertime(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Aprobar horas extra automáticamente</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Días de vacaciones por defecto</label>
                <input
                  type="number"
                  value={defaultVacationDays}
                  onChange={(e) => setDefaultVacationDays(parseInt(e.target.value) || 0)}
                  min="0"
                  max="365"
                  className="input w-full"
                />
              </div>

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

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApprovalForOvertime}
                    onChange={(e) => setRequireApprovalForOvertime(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Requerir aprobación para horas extra</span>
                </label>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Notificaciones por email</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Notificaciones push</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyLateArrivals}
                    onChange={(e) => setNotifyLateArrivals(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Notificar llegadas tardías</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyAbsences}
                    onChange={(e) => setNotifyAbsences(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Notificar ausencias</span>
                </label>
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