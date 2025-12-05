import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Lock, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ChangePasswordAfterInvitation from '@/components/ChangePasswordAfterInvitation';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginAttempts, setLoginAttempts] = React.useState(0);
  const [showCaptcha, setShowCaptcha] = React.useState(false);
  const [captchaAnswer, setCaptchaAnswer] = React.useState('');
  const [captchaCorrectAnswer, setCaptchaCorrectAnswer] = React.useState('');
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [blockUntil, setBlockUntil] = React.useState(null);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [tempPasswordUser, setTempPasswordUser] = React.useState(null);

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
    setCaptchaCorrectAnswer(result.toString());
    setCaptchaAnswer(''); // Limpiar la respuesta del usuario
    return `${num1} + ${num2} = ?`;
  };

  // Función para verificar CAPTCHA
  const verifyCaptcha = (input) => {
    return input.trim() === captchaCorrectAnswer;
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
    setCaptchaAnswer('');
    setCaptchaCorrectAnswer('');
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
      if (!captchaAnswer || !captchaAnswer.trim()) {
        setMsg('Por favor, completa el CAPTCHA');
        setLoading(false);
        return;
      }
      
      if (!verifyCaptcha(captchaAnswer)) {
        setMsg('CAPTCHA incorrecto. Intenta de nuevo.');
        setCaptchaAnswer('');
        // Regenerar CAPTCHA
        setCaptchaQuestion(generateCaptcha());
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
        
        // Manejar errores específicos
        let errorMessage = error.message;
        
        // Detectar errores de CORS o red
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('CORS') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_FAILED')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet y que la URL de Supabase esté configurada correctamente.';
          console.error('❌ Error de conexión/CORS:', error);
        }
        
        setMsg(errorMessage);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Login exitoso, resetear intentos
        resetAttempts();
        
        // Verificar si el usuario tiene contraseña temporal PRIMERO
        if (data.session.user.user_metadata?.temp_user) {
          console.log('🔍 Usuario temporal detectado, mostrando modal de cambio de contraseña');
          setTempPasswordUser(data.session.user);
          setShowPasswordModal(true);
          setLoading(false);
          return;
        }

        // Si hay un token de invitación, procesarlo después del login
        if (invitationToken) {
          console.log('🔍 Token de invitación detectado, redirigiendo a página de aceptación');
          try {
            // En lugar de procesar la invitación aquí, redirigir de vuelta a la página de aceptación
            setLoading(false);
            navigate(`/accept-invitation?token=${invitationToken}`);
            return;
          } catch (error) {
            console.error('Error redirecting to invitation:', error);
            setLoading(false);
          }
        }

        // Asegurar que el perfil del usuario esté completo
        console.log('🔍 Asegurando que el perfil del usuario esté completo');
        try {
          const { data: profileData, error: profileError } = await supabase.functions.invoke('ensure-user-profile');
          
          if (profileError) {
            console.error('⚠️ Error ensuring user profile:', profileError);
          } else {
            console.log('✅ User profile ensured:', profileData);
          }
        } catch (error) {
          console.error('⚠️ Error calling ensure-user-profile:', error);
        }

        // Obtener el rol del usuario para redirigir correctamente (if not temp_user or invitation)
        console.log('🔍 Obteniendo rol del usuario para redirección');
        const { data: userRole, error: roleError } = await supabase
          .from('user_company_roles')
          .select('role, company_id, companies(id, name, slug)')
          .eq('user_id', data.session.user.id)
          .eq('is_active', true)
          .single();

        console.log('🔍 Resultado de consulta de rol:', { userRole, error: roleError });

        if (roleError) {
          console.error('❌ Error obteniendo rol del usuario:', roleError);
          
          // Si no hay rol activo, verificar si hay invitaciones pendientes
          const { data: pendingInvitation } = await supabase
            .from('invitations')
            .select('*')
            .eq('email', data.session.user.email)
            .in('status', ['pending', 'sent'])
            .single();

          if (pendingInvitation) {
            console.log('🔍 Invitación pendiente encontrada, redirigiendo a aceptación');
            setLoading(false);
            navigate(`/accept-invitation?token=${pendingInvitation.token}`);
            return;
          } else {
            console.log('❌ No hay rol ni invitación pendiente, redirigiendo a employee por defecto');
            setLoading(false);
            navigate('/employee');
            return;
          }
        }

        if (userRole) {
          console.log('✅ Rol encontrado:', userRole.role);
          const redirectPath = userRole.role === 'owner' ? '/owner' : 
                             userRole.role === 'admin' ? '/admin' : 
                             userRole.role === 'manager' ? '/manager' : '/employee';
          console.log('🔀 Redirigiendo a:', redirectPath);
          setLoading(false);
          navigate(redirectPath);
        } else {
          console.log('❌ No se encontró rol, redirigiendo a employee por defecto');
          setLoading(false);
          navigate('/employee');
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      incrementAttempts();
      
      // Manejar errores de red o CORS
      let errorMessage = 'Error inesperado al iniciar sesión';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet y la configuración de Supabase.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMsg(errorMessage);
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
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
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
        <p className="text-sm text-muted-foreground text-center">
          ¿Olvidaste tu contraseña?{' '}
          <a href="/forgot-password" className="text-primary hover:underline">
            Recuperarla aquí
          </a>
        </p>
      </form>
      
      {/* Modal de cambio de contraseña */}
      {showPasswordModal && tempPasswordUser && (
        <ChangePasswordAfterInvitation
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={async () => {
            setShowPasswordModal(false);
            
            console.log('🔍 Procesando redirección después del cambio de contraseña');
            
            // Después de cambiar la contraseña, verificar si hay una invitación pendiente
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              console.log('🔍 Usuario autenticado:', user.email);
              
              // Primero, intentar obtener el rol directamente
              const { data: userRole, error: roleError } = await supabase
                .from('user_company_roles')
                .select('role, company_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single();

              console.log('🔍 Resultado de consulta de rol:', { userRole, error: roleError });

              if (userRole && !roleError) {
                console.log('✅ Rol encontrado:', userRole.role);
                const redirectPath = userRole.role === 'owner' ? '/owner' : 
                                   userRole.role === 'admin' ? '/admin' : 
                                   userRole.role === 'manager' ? '/manager' : '/employee';
                console.log('🔀 Redirigiendo a:', redirectPath);
                navigate(redirectPath);
                return;
              }

              // Si no hay rol activo, buscar invitaciones pendientes
              console.log('🔍 No hay rol activo, buscando invitaciones pendientes');
              const { data: pendingInvitation, error: invitationError } = await supabase
                .from('invitations')
                .select('*')
                .eq('email', user.email)
                .in('status', ['pending', 'sent'])
                .single();

              console.log('🔍 Resultado de búsqueda de invitación:', { pendingInvitation, error: invitationError });

              if (pendingInvitation && !invitationError) {
                console.log('✅ Invitación pendiente encontrada, procesando...');
                // Procesar la invitación automáticamente
                try {
                  const { data, error } = await supabase.functions.invoke('accept-employee-invitation', {
                    body: { token: pendingInvitation.token }
                  });

                  console.log('🔍 Resultado de procesamiento de invitación:', { data, error });

                  if (data && data.success) {
                    console.log('✅ Invitación procesada exitosamente');
                    // Redirigir al dashboard correspondiente
                    const redirectPath = data.role === 'owner' ? '/owner' : 
                                       data.role === 'admin' ? '/admin' : 
                                       data.role === 'manager' ? '/manager' : '/employee';
                    console.log('🔀 Redirigiendo a:', redirectPath);
                    navigate(redirectPath);
                  } else {
                    console.error('❌ Error procesando invitación:', error);
                    // Si hay error, intentar usar la función de verificación como respaldo
                    console.log('🔄 Intentando reparación automática con verify-user-role...');
                    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-user-role');
                    
                    if (verifyData && verifyData.success && verifyData.hasRole) {
                      console.log('✅ Reparación automática exitosa:', verifyData.role);
                      const redirectPath = verifyData.role === 'owner' ? '/owner' : 
                                         verifyData.role === 'admin' ? '/admin' : 
                                         verifyData.role === 'manager' ? '/manager' : '/employee';
                      navigate(redirectPath);
                    } else {
                      console.error('❌ Reparación automática falló:', verifyError);
                      alert('Hubo un problema al procesar tu invitación. Por favor, contacta al administrador.');
                      navigate('/employee');
                    }
                  }
                } catch (error) {
                  console.error('❌ Error en procesamiento de invitación:', error);
                  // Intentar reparación automática como último recurso
                  try {
                    console.log('🔄 Intentando reparación automática como último recurso...');
                    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-user-role');
                    
                    if (verifyData && verifyData.success && verifyData.hasRole) {
                      console.log('✅ Reparación automática exitosa:', verifyData.role);
                      const redirectPath = verifyData.role === 'owner' ? '/owner' : 
                                         verifyData.role === 'admin' ? '/admin' : 
                                         verifyData.role === 'manager' ? '/manager' : '/employee';
                      navigate(redirectPath);
                    } else {
                      console.error('❌ Reparación automática falló:', verifyError);
                      alert('Error al procesar la invitación. Por favor, contacta al administrador.');
                      navigate('/employee');
                    }
                  } catch (verifyError) {
                    console.error('❌ Error en reparación automática:', verifyError);
                    alert('Error al procesar la invitación. Por favor, contacta al administrador.');
                    navigate('/employee');
                  }
                }
              } else {
                console.log('❌ No hay invitación pendiente ni rol activo');
                // Intentar reparación automática como último recurso
                try {
                  console.log('🔄 Intentando reparación automática...');
                  const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-user-role');
                  
                  if (verifyData && verifyData.success && verifyData.hasRole) {
                    console.log('✅ Reparación automática exitosa:', verifyData.role);
                    const redirectPath = verifyData.role === 'owner' ? '/owner' : 
                                       verifyData.role === 'admin' ? '/admin' : 
                                       verifyData.role === 'manager' ? '/manager' : '/employee';
                    navigate(redirectPath);
                  } else {
                    console.error('❌ Reparación automática falló:', verifyError);
                    alert('No se encontró información de tu cuenta. Por favor, contacta al administrador.');
                    navigate('/employee');
                  }
                } catch (verifyError) {
                  console.error('❌ Error en reparación automática:', verifyError);
                  alert('No se encontró información de tu cuenta. Por favor, contacta al administrador.');
                  navigate('/employee');
                }
              }
            } else {
              console.error('❌ No se pudo obtener el usuario autenticado');
              navigate('/employee');
            }
          }}
        />
      )}
    </div>
  );
}
