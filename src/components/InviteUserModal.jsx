import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BillingService } from '@/lib/billingService';
import { X, Mail, User, Building, Users, Send, AlertTriangle } from 'lucide-react';

export default function InviteUserModal({ isOpen, onClose, companyId, departments = [] }) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('employee');
  const [departmentId, setDepartmentId] = React.useState('');
  const [supervisorId, setSupervisorId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [managers, setManagers] = React.useState([]);

  React.useEffect(() => {
    if (isOpen) {
      loadManagers();
    }
  }, [isOpen, companyId]);

  async function loadManagers() {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          id,
          user_id
        `)
        .eq('company_id', companyId)
        .eq('role', 'manager')
        .eq('is_active', true);

      if (!error && data) {
        // Obtener perfiles de managers por separado
        const managersWithProfiles = await Promise.all(
          data.map(async (manager) => {
            const { data: profile, error } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('user_id', manager.user_id)
              .maybeSingle();
            
            return {
              ...manager,
              profile: profile || { full_name: 'Usuario sin perfil' }
            };
          })
        );
        setManagers(managersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }

  async function sendInvitation(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
          // Iniciando proceso de invitación

      // Verificar que tenemos companyId
      if (!companyId) {
        throw new Error('Company ID no encontrado');
      }

      // Verificar límite del plan antes de enviar invitación
      const canAddEmployee = await BillingService.canAddEmployee(companyId);
      if (!canAddEmployee) {
        setMessage('Error: Has alcanzado el límite de 25 empleados de tu plan. Contacta con ventas para un plan personalizado.');
        return;
      }

      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Generar token único
      const token = crypto.randomUUID();

      // Calcular fecha de expiración (7 días)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Datos de la invitación
      const invitationData = {
        company_id: companyId,
        invited_by: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        role: role,
        department_id: departmentId || null,
        supervisor_id: supervisorId || null,
        token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      };



      // Crear la invitación
      const { data, error } = await supabase
        .from('invitations')
        .insert(invitationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        throw error;
      }



      // Enviar email con credenciales temporales
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: { invitationId: data.id }
      });

      if (emailError) {
        console.error('Error calling function:', emailError);
        throw new Error(`Error en la función: ${emailError.message}`);
      }

      if (emailData && emailData.success) {
        setMessage(`✅ Invitación enviada exitosamente a ${emailData.email}. 
        
Credenciales temporales:
Email: ${emailData.email}
Contraseña: ${emailData.tempPassword}

El usuario puede acceder en: ${emailData.invitationUrl}`);
        
        // Limpiar formulario
        setFirstName('');
        setLastName('');
        setEmail('');
        setRole('employee');
        setDepartmentId('');
        setSupervisorId('');
        
        // Cerrar modal después de 5 segundos
        setTimeout(() => {
          onClose();
          setMessage('');
        }, 5000);
      } else {
        const errorMsg = emailData?.error || 'Error desconocido al enviar la invitación';
        setMessage(`Error: ${errorMsg}`);
      }

    } catch (error) {
      console.error('Error sending invitation:', error);
      setMessage(`Error al enviar invitación: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Invitar Usuario</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={sendInvitation} className="p-6 space-y-4">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input w-full"
                placeholder="Juan"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input w-full"
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="usuario@empresa.com"
              required
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium mb-2">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input w-full"
              required
            >
              <option value="admin">Administrador</option>
              <option value="manager">Jefe de Equipo</option>
              <option value="employee">Empleado</option>
            </select>
          </div>

          {/* Departamento */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Departamento</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="input w-full"
              >
                <option value="">Sin departamento</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Supervisor */}
          {role === 'employee' && managers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Supervisor</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="input w-full"
              >
                <option value="">Sin supervisor</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.profile.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mensaje */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Error') 
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-success/10 text-success border border-success/20'
            }`}>
              {message}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 