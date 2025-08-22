import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginAttempts, setLoginAttempts] = React.useState(0);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [blockUntil, setBlockUntil] = React.useState(null);
  const [showCaptcha, setShowCaptcha] = React.useState(false);
  const [captchaValue, setCaptchaValue] = React.useState('');
  const [captchaInput, setCaptchaInput] = React.useState('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');

  // Verificar si el usuario está bloqueado al cargar
  React.useEffect(() => {
    const blockedUntil = localStorage.getItem('loginBlockedUntil');
    if (blockedUntil) {
      const blockTime = new Date(blockedUntil);
      if (blockTime > new Date()) {
        setIsBlocked(true);
        setBlockUntil(blockTime);
      } else {
        // Bloqueo expirado, limpiar
        localStorage.removeItem('loginBlockedUntil');
        localStorage.removeItem('loginAttempts');
      }
    }

    const attempts = localStorage.getItem('loginAttempts');
    if (attempts) {
      const attemptCount = parseInt(attempts);
      setLoginAttempts(attemptCount);
      if (attemptCount >= 3) {
        setShowCaptcha(true);
      }
    }
  }, []);

  // Función para generar CAPTCHA simple
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const result = num1 + num2;
    setCaptchaValue(result.toString());
    return `${num1} + ${num2} = ?`;
  };

  // Función para verificar CAPTCHA
  const verifyCaptcha = (input) => {
    return input === captchaValue;
  };

  // Función para bloquear temporalmente
  const blockTemporarily = () => {
    const blockTime = new Date();
    blockTime.setMinutes(blockTime.getMinutes() + 15); // Bloquear por 15 minutos
    localStorage.setItem('loginBlockedUntil', blockTime.toISOString());
    setIsBlocked(true);
    setBlockUntil(blockTime);
  };

  // Función para incrementar intentos
  const incrementAttempts = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    localStorage.setItem('loginAttempts', newAttempts.toString());
    
    if (newAttempts >= 5) {
      blockTemporarily();
    } else if (newAttempts >= 3) {
      setShowCaptcha(true);
    }
  };

  // Función para resetear intentos
  const resetAttempts = () => {
    setLoginAttempts(0);
    setShowCaptcha(false);
    setCaptchaInput('');
    localStorage.removeItem('loginAttempts');
  };

  async function onLogin(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    // Verificar si está bloqueado
    if (isBlocked) {
      setMsg('Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.');
      setLoading(false);
      return;
    }

    // Verificar CAPTCHA si es necesario
    if (showCaptcha) {
      if (!captchaInput.trim()) {
        setMsg('Por favor, completa el CAPTCHA');
        setLoading(false);
        return;
      }
      
      if (!verifyCaptcha(captchaInput)) {
        setMsg('CAPTCHA incorrecto. Intenta de nuevo.');
        setCaptchaInput('');
        incrementAttempts();
        setLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        incrementAttempts();
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Login exitoso, resetear intentos
        resetAttempts();
        
        // Verificar si es un usuario temporal y redirigir al cambio de contraseña PRIMERO
        if (data.session.user.user_metadata?.temp_user) {
          navigate('/change-password');
          return;
        }

        // Obtener el rol del usuario para redirigir correctamente
        const { data: userRole, error: roleError } = await supabase
          .from('user_company_roles')
          .select('role')
          .eq('user_id', data.session.user.id)
          .eq('is_active', true)
          .single();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          // Si no hay rol, redirigir al login
          setMsg('Error al obtener información del usuario');
          setLoading(false);
          return;
        }

        // Guardar información en sessionStorage (más seguro que localStorage)
        sessionStorage.setItem('userRole', userRole.role);
        // NO guardar access_token - Supabase maneja la sesión automáticamente

        // Redirigir según el rol
        switch (userRole.role) {
          case 'owner':
            navigate('/owner');
            break;
          case 'admin':
            navigate('/admin'); // Los admins van a su propio panel
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'employee':
            navigate('/employee');
            break;
          default:
            setMsg('Rol de usuario no válido');
            setLoading(false);
        }

        // Si hay un token de invitación, procesarlo después del login
        if (invitationToken) {
          try {
            const { data, error } = await supabase.functions.invoke('accept-employee-invitation', {
              body: { token: invitationToken }
            });

            if (error) {
              console.error('Error accepting invitation:', error);
            } else if (data.success) {
              // La invitación se procesó correctamente, el usuario ya está en la empresa
            }
          } catch (error) {
            console.error('Error processing invitation:', error);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      incrementAttempts();
      setMsg('Error inesperado al iniciar sesión');
      setLoading(false);
    }
  }

  // Generar CAPTCHA cuando se muestra
  const [captchaQuestion, setCaptchaQuestion] = React.useState('');
  
  React.useEffect(() => {
    if (showCaptcha) {
      setCaptchaQuestion(generateCaptcha());
    }
  }, [showCaptcha]);

  // Contador regresivo para el bloqueo
  const [timeLeft, setTimeLeft] = React.useState('');
  
  React.useEffect(() => {
    if (isBlocked && blockUntil) {
      const timer = setInterval(() => {
        const now = new Date();
        const timeDiff = blockUntil - now;
        
        if (timeDiff <= 0) {
          setIsBlocked(false);
          setBlockUntil(null);
          localStorage.removeItem('loginBlockedUntil');
          setTimeLeft('');
        } else {
          const minutes = Math.floor(timeDiff / 60000);
          const seconds = Math.floor((timeDiff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isBlocked, blockUntil]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <form onSubmit={onLogin} className="card p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
          <p className="text-muted-foreground mt-2">
            Accede a tu cuenta de Witar
          </p>
        </div>

        {/* Alerta de seguridad si hay muchos intentos */}
        {loginAttempts >= 2 && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Seguridad:</strong> {loginAttempts} intentos fallidos. 
                {loginAttempts >= 3 && ' Se requiere verificación adicional.'}
              </p>
            </div>
          </div>
        )}

        {/* Bloqueo temporal */}
        {isBlocked && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Cuenta temporalmente bloqueada
                </p>
                <p className="text-xs text-red-600 dark:text-red-300">
                  Tiempo restante: {timeLeft}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              className="input" 
              type="email"
              placeholder="tu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              disabled={isBlocked}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <input 
                className="input w-full pr-10" 
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={isBlocked}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isBlocked}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* CAPTCHA */}
          {showCaptcha && !isBlocked && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Verificación de seguridad
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Resuelve: <strong>{captchaQuestion}</strong>
                </p>
                <input
                  className="input w-full"
                  type="number"
                  placeholder="Respuesta"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>

        <button 
          className="btn btn-primary w-full" 
          type="submit"
          disabled={loading || isBlocked}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>

        {msg && (
          <div className="text-sm p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            {msg}
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-primary hover:underline">
            Crear cuenta de empresa
          </a>
        </p>
      </form>
    </div>
  );
}
