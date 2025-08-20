import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Calendar, Clock, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function CreateRequestModal({ isOpen, onClose, onRequestCreated }) {
  const [loading, setLoading] = React.useState(false);
  const [requestType, setRequestType] = React.useState('vacation');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [companyId, setCompanyId] = React.useState(null);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      loadCompanyId();
      // Establecer fecha mínima como hoy
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    }
  }, [isOpen]);

  async function loadCompanyId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyId(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading company ID:', error);
    }
  }

  function getRequestTypeInfo(type) {
    switch (type) {
      case 'vacation':
        return {
          title: 'Solicitud de Vacaciones',
          description: 'Solicita días de vacaciones',
          icon: Calendar,
          color: 'text-blue-600 bg-blue-100'
        };
      case 'permission':
        return {
          title: 'Solicitud de Permiso',
          description: 'Solicita un permiso por horas',
          icon: Clock,
          color: 'text-green-600 bg-green-100'
        };
      case 'sick_leave':
        return {
          title: 'Baja por Enfermedad',
          description: 'Solicita baja médica',
          icon: AlertCircle,
          color: 'text-red-600 bg-red-100'
        };
      case 'other':
        return {
          title: 'Otra Solicitud',
          description: 'Solicitud personalizada',
          icon: FileText,
          color: 'text-purple-600 bg-purple-100'
        };
      default:
        return {
          title: 'Solicitud',
          description: 'Crear nueva solicitud',
          icon: FileText,
          color: 'text-gray-600 bg-gray-100'
        };
    }
  }

  function validateForm() {
    if (!startDate) {
      setMessage('Error: La fecha de inicio es obligatoria');
      return false;
    }

    if (requestType === 'permission') {
      if (!startTime || !endTime) {
        setMessage('Error: Para permisos, las horas son obligatorias');
        return false;
      }
    } else {
      if (!endDate) {
        setMessage('Error: La fecha de fin es obligatoria');
        return false;
      }

      if (new Date(endDate) < new Date(startDate)) {
        setMessage('Error: La fecha de fin no puede ser anterior a la fecha de inicio');
        return false;
      }
    }

    if (!reason.trim()) {
      setMessage('Error: El motivo es obligatorio');
      return false;
    }

    return true;
  }

  async function createRequest() {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      // Calcular duración
      let duration_hours = 0;
      let duration_days = 0;

      if (requestType === 'permission') {
        // Para permisos, calcular horas
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${startDate}T${endTime}`);
        duration_hours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
      } else {
        // Para otros tipos, calcular días
        const start = new Date(startDate);
        const end = new Date(endDate);
        duration_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }

      // Crear la solicitud
      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          user_id: user.id,
          company_id: companyId,
          request_type: requestType,
          start_date: startDate,
          end_date: requestType === 'permission' ? startDate : endDate,
          reason: reason.trim(),
          notes: description.trim() || null, // Usar notes en lugar de description
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMessage('¡Solicitud creada exitosamente!');
      
      // Limpiar formulario
      setReason('');
      setDescription('');
      
      // Notificar al componente padre
      if (onRequestCreated) {
        onRequestCreated(request);
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error creating request:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const typeInfo = getRequestTypeInfo(requestType);
  const TypeIcon = typeInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{typeInfo.title}</h2>
              <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium mb-3">Tipo de Solicitud</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'vacation', label: 'Vacaciones', icon: Calendar, color: 'text-blue-600 bg-blue-100' },
                { value: 'permission', label: 'Permiso', icon: Clock, color: 'text-green-600 bg-green-100' },
                { value: 'sick_leave', label: 'Baja Médica', icon: AlertCircle, color: 'text-red-600 bg-red-100' },
                { value: 'other', label: 'Otro', icon: FileText, color: 'text-purple-600 bg-purple-100' }
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setRequestType(type.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      requestType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${type.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date/Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input w-full"
              />
            </div>

            {requestType === 'permission' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Fin</label>
                <input
                  type="date"
                  value={startDate}
                  disabled
                  className="input w-full bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Los permisos son por día</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          {/* Time Selection (only for permissions) */}
          {requestType === 'permission' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hora de Inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Motivo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Vacaciones familiares, Cita médica, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/100 caracteres
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
            <textarea
              placeholder="Proporciona más detalles sobre tu solicitud..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input w-full resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 caracteres
            </p>
          </div>

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
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={createRequest}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Crear Solicitud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 