import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, User, Mail, Phone, MapPin, Calendar, Save, Edit, Building, Shield, Trash2 } from 'lucide-react';
import DeleteEmployeeModal from './DeleteEmployeeModal';

export default function EmployeeProfileModal({ isOpen, onClose, employee, onEmployeeDeleted }) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [departments, setDepartments] = React.useState([]);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    full_name: '',
    phone: '',
    position: '',
    address: '',
    date_of_birth: '',
    role: '',
    department_id: null
  });

  React.useEffect(() => {
    if (isOpen && employee) {
      loadEmployeeData();
      loadDepartments();
    }
  }, [isOpen, employee]);

  async function loadEmployeeData() {
    try {
      setLoading(true);
      
      // Cargar datos del perfil
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', employee.user_id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      // Cargar datos del rol
      const { data: roleData, error: roleError } = await supabase
        .from('user_company_roles')
        .select('role, department_id')
        .eq('id', employee.id)
        .single();

      if (roleError) {
        console.error('Error loading role data:', roleError);
      }

      setFormData({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        position: profile?.position || '',
        address: profile?.address || '',
        date_of_birth: profile?.date_of_birth || '',
        role: roleData?.role || employee.role,
        department_id: roleData?.department_id || employee.departments?.id || null
      });

    } catch (error) {
      console.error('Error loading employee data:', error);
      setMessage('Error al cargar los datos del empleado');
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
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
          const { data, error } = await supabase
            .from('departments')
            .select('id, name')
            .eq('company_id', userRole.company_id)
            .eq('status', 'active')
            .order('name');

          if (!error && data) {
            setDepartments(data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Actualizar perfil del usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: employee.user_id,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          position: formData.position.trim() || null,
          address: formData.address.trim() || null,
          date_of_birth: formData.date_of_birth || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Actualizar rol y departamento
      const { error: roleError } = await supabase
        .from('user_company_roles')
        .update({
          role: formData.role,
          department_id: formData.department_id
        })
        .eq('id', employee.id);

      if (roleError) throw roleError;

      setMessage('✅ Perfil actualizado exitosamente');
      setIsEditing(false);
      
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  const handleEmployeeDeleted = (employeeId, deletedEmployee) => {
    // Cerrar el modal de perfil
    onClose();
    
    // Llamar al callback del padre si existe
    if (onEmployeeDeleted) {
      onEmployeeDeleted(employeeId, deletedEmployee);
    }
  };

  function getRoleDisplayName(role) {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'employee': return 'Empleado';
      default: return role;
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil del Empleado
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
          {loading && !formData.full_name ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              {/* Employee Info Header */}
              <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-medium text-primary">
                    {formData.full_name?.charAt(0) || employee.profile?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">
                    {formData.full_name || employee.profile?.full_name || 'Empleado'}
                  </h3>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(formData.role)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleDisplayName(formData.role)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {isEditing ? 'Cancelar' : 'Editar'}
                  </button>
                  
                  {/* Solo mostrar botón de eliminar para empleados (no admins/owners) */}
                  {employee.role === 'employee' && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="btn btn-error flex items-center gap-2"
                      title="Eliminar empleado"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre completo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="input w-full"
                    placeholder="Nombre completo del empleado"
                    required
                    disabled={!isEditing}
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={employee.email}
                    className="input w-full bg-gray-50"
                    disabled
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
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input w-full"
                    placeholder="+34 600 000 000"
                    disabled={!isEditing}
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
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="input w-full"
                    placeholder="Desarrollador, Manager, etc."
                    disabled={!isEditing}
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
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="input w-full"
                    disabled={!isEditing}
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="input w-full"
                    disabled={!isEditing}
                  >
                    <option value="employee">Empleado</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrador</option>
                    {employee.role === 'owner' && <option value="owner">Propietario</option>}
                  </select>
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Building className="w-4 h-4 inline mr-1" />
                    Departamento
                  </label>
                  <select
                    value={formData.department_id || ''}
                    onChange={(e) => handleInputChange('department_id', e.target.value || null)}
                    className="input w-full"
                    disabled={!isEditing}
                  >
                    <option value="">Sin departamento</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Dirección
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="input w-full"
                    rows="3"
                    placeholder="Dirección completa"
                    disabled={!isEditing}
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
              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
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
              )}
            </form>
          )}
        </div>
      </div>

      {/* Delete Employee Modal */}
      <DeleteEmployeeModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        employee={employee}
        onEmployeeDeleted={handleEmployeeDeleted}
      />
    </div>
  );
} 