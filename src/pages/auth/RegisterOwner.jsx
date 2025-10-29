import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterOwner() {
  const [fullName, setFullName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [companySlug, setCompanySlug] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  // Generar slug automáticamente desde el nombre de la empresa
  React.useEffect(() => {
    if (companyName) {
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      setCompanySlug(slug);
    }
  }, [companyName]);

  async function onRegister(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      // Determinar la URL de redirección basada en el entorno
      const redirectUrl = 'https://www.witar.es/login';

      

      // 1. Crear el usuario en Supabase Auth (sin email automático)
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { full_name: fullName }
        }
      });

      if (authError) {
        console.error('Error en auth.signUp:', authError);
        setMsg(`Error al crear usuario: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!user) {
        console.error('No se creó el usuario');
        setMsg('Error al crear la cuenta');
        setLoading(false);
        return;
      }

      

      // 2. Crear la empresa
      
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          email: email,
          status: 'active'
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creando empresa:', companyError);
        setMsg(`Error al crear la empresa: ${companyError.message}`);
        setLoading(false);
        return;
      }

      

      // 3. Crear el perfil del usuario
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: fullName
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // No fallamos aquí, continuamos
      } else {

      }

      // 4. Asignar rol de owner al usuario
      
      const { error: roleError } = await supabase
        .from('user_company_roles')
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: 'owner',
          is_active: true
        });

      if (roleError) {
        console.error('Error asignando rol:', roleError);
        setMsg(`Error al asignar rol: ${roleError.message}`);
        setLoading(false);
        return;
      }


      // 5. Crear configuración por defecto para la empresa
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: company.id,
          working_hours_per_day: 8.0,
          working_days_per_week: 5,
          timezone: 'UTC',
          allow_overtime: true,
          require_location: false,
          auto_approve_requests: false,
          max_vacation_days: 20
        });

      if (settingsError) {
        console.error('Error creating company settings:', settingsError);
        // No fallamos aquí, continuamos
      } else {
      }

      // 6. Enviar email de bienvenida usando Resend
      try {
        console.log('Sending welcome email to:', email);
        const { data: welcomeEmailData, error: welcomeEmailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: email,
            fullName: fullName,
            companyName: companyName
          }
        });

        if (welcomeEmailError) {
          console.error('Error sending welcome email:', welcomeEmailError);
          // No fallamos aquí, el registro fue exitoso
        } else {
          console.log('Welcome email sent successfully:', welcomeEmailData);
          
          // 7. Confirmar el email del usuario manualmente usando el cliente de servicio
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseServiceClient = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
            );
            
            const { error: confirmError } = await supabaseServiceClient.auth.admin.updateUserById(
              user.id,
              { email_confirm: true }
            );
            
            if (confirmError) {
              console.error('Error confirming user email:', confirmError);
              // No fallamos aquí, el usuario puede confirmar manualmente después
            } else {
              console.log('User email confirmed successfully');
            }
          } catch (confirmError) {
            console.error('Error in email confirmation process:', confirmError);
            // No fallamos aquí, el usuario puede confirmar manualmente después
          }
        }
      } catch (welcomeError) {
        console.error('Error invoking welcome email function:', welcomeError);
        // No fallamos aquí, el registro fue exitoso
      }

      setMsg('¡Cuenta creada exitosamente! Revisa tu email para confirmar la cuenta y luego inicia sesión.');
      setLoading(false);
      
      // Redirigir a la página de bienvenida con el email
      setTimeout(() => {
        navigate(`/welcome?email=${encodeURIComponent(email)}`);
      }, 1000);

    } catch (error) {
      console.error('Registration error:', error);
      setMsg(`Error inesperado al crear la cuenta: ${error.message}`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <form onSubmit={onRegister} className="card p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Crear cuenta de Empresa</h1>
          <p className="text-muted-foreground mt-2">
            Crea tu empresa y comienza a gestionar tu equipo
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre completo</label>
            <input 
              className="input" 
              placeholder="Tu nombre y apellido" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nombre de la empresa</label>
            <input 
              className="input" 
              placeholder="Nombre de tu empresa" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug de la empresa</label>
            <input 
              className="input" 
              placeholder="identificador-empresa" 
              value={companySlug} 
              onChange={e => setCompanySlug(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Identificador único para tu empresa (se genera automáticamente)
            </p>
          </div>

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
              placeholder="Mínimo 6 caracteres" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        </div>

        <button 
          className="btn btn-primary w-full" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        {msg && (
          <div className={`text-sm p-3 rounded-lg ${
            msg.includes('exitosamente') 
              ? 'bg-success/10 text-success border border-success/20' 
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {msg}
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-primary hover:underline">
            Iniciar sesión
          </a>
        </p>
      </form>
    </div>
  );
}
