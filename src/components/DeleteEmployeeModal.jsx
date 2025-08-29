import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, User, Mail, Shield, Trash2, X } from 'lucide-react';

export default function DeleteEmployeeModal({ isOpen, onClose, employee, onEmployeeDeleted }) {
  const [loading, setLoading] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!employee) return;

    setLoading(true);
    setError('');

    try {
      console.log('🗑️ Employee object:', employee);
      console.log('🗑️ Employee ID:', employee.id);
      console.log('🗑️ Employee user_id:', employee.user_id);
      console.log('🗑️ Employee role:', employee.role);
      
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: {
          employeeId: employee.id,
          reason: reason.trim() || 'Sin motivo especificado'
        }
      });

      if (error) {
        console.error('❌ Error deleting employee:', error);
        setError(error.message || 'Error al eliminar empleado');
        setLoading(false);
        return;
      }

      if (data && data.success) {
        console.log('✅ Employee deleted successfully:', data);
        
        // Llamar al callback para actualizar la lista
        if (onEmployeeDeleted) {
          onEmployeeDeleted(employee.id, data.employee);
        }
        
        // Cerrar el modal
        onClose();
      } else {
        setError('Error inesperado al eliminar empleado');
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setError('Error inesperado al eliminar empleado');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'employee': return 'Empleado';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              Eliminar Empleado
            </h2>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Employee Info */}
          <div className="bg-secondary/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {employee.profile?.full_name || 'Sin nombre'}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {employee.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
                <Shield className="w-3 h-3 mr-1" />
                {getRoleDisplayName(employee.role)}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {employee.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                  ⚠️ Acción Irreversible
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• El empleado será desactivado inmediatamente</li>
                  <li>• Se eliminarán sus fichajes futuros</li>
                  <li>• Se cancelarán sus solicitudes pendientes</li>
                  <li>• Esta acción se registrará en el historial</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Motivo de la eliminación (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full h-20 resize-none"
              placeholder="Especifica el motivo de la eliminación..."
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn btn-destructive flex-1 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar Empleado
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 