import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ChangePasswordAfterInvitation({ isOpen, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('');
      setSuccess(false);
    }
  }, [isOpen]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validaciones
      if (newPassword.length < 6) {
        setMessage('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage('Las contraseñas no coinciden');
        return;
      }

      // Cambiar contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      setMessage('Contraseña cambiada exitosamente');
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error changing password:', error);
      setMessage(`Error al cambiar la contraseña: ${error.message}`);
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
            <Lock className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {success ? 'Contraseña Cambiada' : 'Cambiar Contraseña'}
            </h2>
          </div>
          {!loading && !success && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <p className="text-success font-medium mb-4">
                ¡Contraseña cambiada exitosamente!
              </p>
              <p className="text-muted-foreground text-sm">
                Serás redirigido automáticamente...
              </p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Nueva Contraseña */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input w-full pr-10"
                      placeholder="Nueva contraseña"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input w-full pr-10"
                      placeholder="Confirmar contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

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
                        Cambiando...
                      </>
                    ) : (
                      'Cambiar Contraseña'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 