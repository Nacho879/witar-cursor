import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Verificar que el usuario está autenticado y es temporal
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      if (!user.user_metadata?.temp_user) {
        // Si no es usuario temporal, redirigir según su rol
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          const redirectPath = userRole.role === 'owner' ? '/owner' : 
                             userRole.role === 'admin' ? '/admin' :
                             userRole.role === 'manager' ? '/manager' : '/employee';
          navigate(redirectPath);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  }

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

  async function changePassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validar contraseñas
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

      // Cambiar contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      // Actualizar metadata del usuario para quitar la marca de temporal
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { temp_user: false }
      });

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
      }

      setMessage('✅ Contraseña cambiada exitosamente. Redirigiendo...');
      
      // Redirigir según el rol después de 2 segundos
      setTimeout(async () => {
        try {
          const { data: userRole } = await supabase
            .from('user_company_roles')
            .select('role')
            .eq('user_id', (await supabase.auth.getUser()).data.user.id)
            .eq('is_active', true)
            .single();

          if (userRole) {
            const redirectPath = userRole.role === 'owner' || userRole.role === 'admin' ? '/owner' : 
                               userRole.role === 'manager' ? '/manager' : '/employee';
            navigate(redirectPath);
          } else {
            navigate('/login');
          }
        } catch (error) {
          console.error('Error getting user role:', error);
          navigate('/login');
        }
      }, 2000);

    } catch (error) {
      console.error('Error changing password:', error);
      setMessage(`Error al cambiar contraseña: ${error.message}`);
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Cambiar Contraseña</h1>
          <p className="text-muted-foreground">
            Por seguridad, debes cambiar tu contraseña temporal
          </p>
        </div>

        <form onSubmit={changePassword} className="space-y-6">
          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña Actual</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Tu contraseña temporal"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Nueva contraseña"
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
            <div className="mt-2 text-xs text-muted-foreground">
              <p>La contraseña debe contener:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>Mínimo 8 caracteres</li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>Al menos una mayúscula</li>
                <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>Al menos una minúscula</li>
                <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>Al menos un número</li>
                <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : ''}>Al menos un carácter especial</li>
              </ul>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium mb-2">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Confirma tu nueva contraseña"
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

          {/* Mensaje */}
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.includes('Error')
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-success/10 text-success border border-success/20'
            }`}>
              {message.includes('Error') ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="whitespace-pre-line">{message}</span>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
} 