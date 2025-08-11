import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  async function onLogin(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
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

        // Guardar información en localStorage
        localStorage.setItem('sb-access-token', data.session.access_token);
        localStorage.setItem('userRole', userRole.role);

        // Redirigir según el rol
        switch (userRole.role) {
          case 'owner':
          case 'admin':
            navigate('/owner');
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
      }
    } catch (error) {
      console.error('Login error:', error);
      setMsg('Error inesperado al iniciar sesión');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <form onSubmit={onLogin} className="card p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
          <p className="text-muted-foreground mt-2">
            Accede a tu cuenta de Witar
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              className="input" 
              type="email"
              placeholder="tu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input 
              className="input" 
              type="password"
              placeholder="Tu contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button 
          className="btn btn-primary w-full" 
          type="submit"
          disabled={loading}
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
