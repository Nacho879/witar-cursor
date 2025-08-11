import * as React from 'react';
import { X, Mail, Phone, Calendar, MapPin, Clock, User, Building2 } from 'lucide-react';

export default function EmployeeProfileModal({ isOpen, onClose, employee }) {
  if (!isOpen || !employee) return null;

  function getRoleDisplayName(role) {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'manager': return 'Jefe de Equipo';
      case 'employee': return 'Empleado';
      default: return role;
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Perfil del Empleado</h2>
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
          {/* Employee Info */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {employee.user_profiles?.avatar_url ? (
                <img 
                  src={employee.user_profiles.avatar_url} 
                  alt={employee.user_profiles.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {employee.user_profiles?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {employee.user_profiles?.full_name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${getRoleColor(employee.role)}`}>
                  {getRoleDisplayName(employee.role)}
                </span>
                <span className={`badge ${employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {employee.user_profiles?.position && (
                <p className="text-muted-foreground">
                  {employee.user_profiles.position}
                </p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h4 className="font-semibold text-foreground mb-3">Información de Contacto</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{employee.user_profiles?.email}</span>
                </div>
                {employee.user_profiles?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="text-foreground">{employee.user_profiles.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-4">
              <h4 className="font-semibold text-foreground mb-3">Información Laboral</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fecha de ingreso:</span>
                  <span className="text-foreground">{formatDate(employee.joined_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Departamento:</span>
                  <span className="text-foreground">
                    {employee.departments?.name || 'Sin departamento'}
                  </span>
                </div>
                {employee.user_company_roles?.user_profiles?.full_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Supervisor:</span>
                    <span className="text-foreground">
                      {employee.user_company_roles.user_profiles.full_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {employee.user_profiles?.address && (
            <div className="card p-4">
              <h4 className="font-semibold text-foreground mb-3">Dirección</h4>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-foreground">{employee.user_profiles.address}</span>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground">Días trabajados</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.floor((new Date() - new Date(employee.joined_at)) / (1000 * 60 * 60 * 24))}
              </p>
            </div>

            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="text-lg font-semibold text-foreground">
                {employee.is_active ? 'Activo' : 'Inactivo'}
              </p>
            </div>

            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground">Rol</p>
              <p className="text-lg font-semibold text-foreground">
                {getRoleDisplayName(employee.role)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                // Implementar edición
                alert('Función de edición próximamente');
              }}
              className="btn btn-primary flex-1"
            >
              Editar Perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 