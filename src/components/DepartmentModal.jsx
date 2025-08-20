import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Building, Users, AlertCircle, CheckCircle } from 'lucide-react';

export default function DepartmentModal({ isOpen, onClose, department = null, onDepartmentSaved }) {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [managerId, setManagerId] = React.useState('');
  const [companyId, setCompanyId] = React.useState(null);
  const [managers, setManagers] = React.useState([]);
  const [message, setMessage] = React.useState('');

  const isEditing = !!department;

  React.useEffect(() => {
    if (isOpen) {
      loadCompanyId();
      loadManagers();
      if (isEditing && department) {
        setName(department.name || '');
        setDescription(department.description || '');
        setManagerId(department.manager_id || '');
      } else {
        setName('');
        setDescription('');
        setManagerId('');
      }
    }
  }, [isOpen, department]);

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

  async function loadManagers() {
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
        // Cargar SOLO managers de la empresa (no admins ni owners)
        const { data: managersData, error } = await supabase
          .from('user_company_roles')
          .select('id, user_id')
          .eq('company_id', userRole.company_id)
          .eq('role', 'manager') // Solo managers
          .eq('is_active', true);

        if (!error && managersData) {
          // Obtener los perfiles de usuario para cada manager
          const managersWithProfiles = await Promise.all(
            managersData.map(async (manager) => {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', manager.user_id)
                .maybeSingle();
              
              return {
                ...manager,
                profile: profile || { full_name: `Manager ${manager.user_id.slice(0, 8)}` }
              };
            })
          );

          setManagers(managersWithProfiles);
        }
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }

  function validateForm() {
    if (!name.trim()) {
      setMessage('Error: El nombre del departamento es obligatorio');
      return false;
    }

    if (name.trim().length < 2) {
      setMessage('Error: El nombre debe tener al menos 2 caracteres');
      return false;
    }

    if (name.trim().length > 50) {
      setMessage('Error: El nombre no puede exceder 50 caracteres');
      return false;
    }

    if (description.trim().length > 200) {
      setMessage('Error: La descripción no puede exceder 200 caracteres');
      return false;
    }

    return true;
  }

  async function saveDepartment() {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      if (!companyId) {
        setMessage('Error: No se pudo identificar la empresa');
        return;
      }

      let result;
      let oldManagerId = null;

      if (isEditing) {
        // Obtener el manager anterior antes de actualizar
        oldManagerId = department.manager_id;
        
        // Actualizar departamento existente
        const { data, error } = await supabase
          .from('departments')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            manager_id: managerId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', department.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Crear nuevo departamento
        const { data, error } = await supabase
          .from('departments')
          .insert({
            company_id: companyId,
            name: name.trim(),
            description: description.trim() || null,
            manager_id: managerId || null,
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Actualizar supervisores de empleados del departamento
      if (result.id) {
        await updateDepartmentEmployeeSupervisors(result.id, oldManagerId, managerId);
      }

      setMessage('¡Departamento guardado exitosamente!');
      
      // Notificar al componente padre
      if (onDepartmentSaved) {
        onDepartmentSaved(result);
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error saving department:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateDepartmentEmployeeSupervisors(departmentId, oldManagerId, newManagerId) {
    try {
      // Si hay un manager anterior, remover supervisión de empleados del departamento
      if (oldManagerId && oldManagerId !== newManagerId) {
        await supabase
          .from('user_company_roles')
          .update({ supervisor_id: null })
          .eq('department_id', departmentId)
          .eq('supervisor_id', oldManagerId)
          .neq('role', 'manager'); // No cambiar supervisores de otros managers
      }

      // Si hay un nuevo manager, asignar supervisión a todos los empleados del departamento
      if (newManagerId) {
        await supabase
          .from('user_company_roles')
          .update({ supervisor_id: newManagerId })
          .eq('department_id', departmentId)
          .eq('supervisor_id', null) // Solo empleados sin supervisor
          .neq('role', 'manager'); // No asignar supervisores a managers
      }
    } catch (error) {
      console.error('Error updating employee supervisors:', error);
      // No lanzar error para no interrumpir el guardado del departamento
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {isEditing ? 'Editar Departamento' : 'Nuevo Departamento'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Modifica la información del departamento' : 'Crea un nuevo departamento'}
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Departamento <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Recursos Humanos, Ventas, IT..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {name.length}/50 caracteres
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
            <textarea
              placeholder="Describe las funciones y responsabilidades del departamento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input w-full resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/200 caracteres
            </p>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium mb-2">Manager del Departamento</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="input w-full"
            >
              <option value="">Sin manager asignado</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.profile?.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona un manager o admin para supervisar este departamento
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
              onClick={saveDepartment}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Building className="w-4 h-4" />
              )}
              {isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 