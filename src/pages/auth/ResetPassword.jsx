import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [ready, setReady] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Verificar que tenemos una sesión de recuperación
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Algunos proveedores ponen el token en el hash y Supabase lo procesa automáticamente.
        // Si no hay sesión, pedimos al usuario que vuelva a abrir el enlace o solicite uno nuevo.
        setMessage('Error: enlace inválido o expirado. Solicita otro desde "Recuperar contraseña".');
        setReady(false);
      } else {
        setReady(true);
      }
    })();
  }, []);

  function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      errors: [
        password.length < minLength && 'Mínimo 8 caracteres',
        !hasUpperCase && 'Al menos una mayúscula',
        !hasLowerCase && 'Al menos una minúscula',
        !hasNumbers && 'Al menos un número',
        !hasSpecialChar && 'Al menos un carácter especial'
      ].filter(Boolean)
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (newPassword !== confirmPassword) {
        setMessage('Error: Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setMessage(`Error: La contraseña debe cumplir los siguientes requisitos:\n${passwordValidation.errors.join('\n')}`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage('✅ Contraseña restablecida correctamente. Ahora te redirigimos al login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Restablecer contraseña</h1>
          <p className="text-muted-foreground">Introduce tu nueva contraseña</p>
        </div>

        {!ready && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 mb-6 text-sm">
            {message || 'Validando enlace...'}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nueva contraseña</label>
            <div className="relative">
              <input
                className="input w-full pr-10"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!ready}
                required
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

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                className="input w-full pr-10"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirma tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!ready}
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
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                message.startsWith('Error')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-success/10 text-success border border-success/20'
              }`}
            >
              {message.startsWith('Error') ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="whitespace-pre-line">{message}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !ready} className="btn btn-primary w-full">
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-2">
          <a href="/forgot-password" className="text-primary hover:underline">
            Volver a recuperar contraseña
          </a>
        </p>
      </div>
    </div>
  );
}


