import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle, Clock, Building, User } from 'lucide-react';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [invitation, setInvitation] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [accepting, setAccepting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const token = searchParams.get('token');
  
  // Token extraído de URL params

  React.useEffect(() => {
    if (token) {
      verifyInvitation();
    } else {
      setError('Token de invitación no válido');
      setLoading(false);
    }
  }, [token]);

  async function verifyInvitation() {
    try {
      console.log('🔍 Debug: Verificando invitación con token:', token);
      
      // Usar la Edge Function para evitar el error 406
      const { data, error } = await supabase.functions.invoke('get-invitation', {
        body: { token }
      });

      console.log('🔍 Debug: Resultado de la Edge Function:', { data, error });

      if (error) {
        console.error('❌ Error en la Edge Function:', error);
        setError('Error al verificar la invitación');
        setLoading(false);
        return;
      }

      if (!data || !data.success) {
        console.log('❌ Respuesta inválida de la Edge Function:', data);
        setError(data?.error || 'Invitación no válida o expirada');
        setLoading(false);
        return;
      }

      const invitation = data.invitation;
      console.log('✅ Invitación encontrada:', invitation);

      // Verificar el status después de obtener la invitación
      if (invitation.status !== 'pending' && invitation.status !== 'sent') {
        console.log('❌ Status inválido:', invitation.status);
        setError('Invitación no está disponible para aceptar');
        setLoading(false);
        return;
      }

      console.log('✅ Invitación válida y lista para aceptar');
      setInvitation(invitation);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error general:', error);
      setError('Error al verificar la invitación');
      setLoading(false);
    }
  }

  async function acceptInvitation() {
    setAccepting(true);
    try {
      // Verificar si el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Si no está autenticado, redirigir al login con el token
        navigate(`/login?invitation=${token}`);
        return;
      }

      // Si está autenticado, aceptar la invitación
      const { data, error } = await supabase.functions.invoke('accept-employee-invitation', {
        body: { token }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setSuccess(true);
        // Redirigir según el rol
        const redirectPath = data.role === 'owner' ? '/owner' : 
                           data.role === 'admin' ? '/owner' : 
                           data.role === 'manager' ? '/manager' : '/employee';
        setTimeout(() => {
          navigate(redirectPath);
        }, 3000);
      } else {
        setError(data.error || 'Error al aceptar la invitación');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Error al aceptar la invitación');
    } finally {
      setAccepting(false);
    }
  }

  function getRoleDisplayName(role) {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Jefe de Equipo';
      case 'employee':
        return 'Empleado';
      default:
        return role;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="card p-8 w-full max-w-md text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Invitación Inválida</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn btn-primary"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="card p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">¡Invitación Aceptada!</h1>
          <p className="text-muted-foreground mb-6">
            Has sido agregado exitosamente a {invitation.companies.name} como {getRoleDisplayName(invitation.role)}.
          </p>
          <div className="animate-pulse">
            <p className="text-sm text-muted-foreground">Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Building className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Invitación de Empresa</h1>
          <p className="text-muted-foreground">
            Has sido invitado a unirte a una empresa
          </p>
        </div>

        <div className="space-y-6">
          {/* Información de la empresa */}
          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Empresa</h3>
            <p className="text-lg font-bold text-primary">{invitation.companies.name}</p>
            {invitation.companies.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {invitation.companies.description}
              </p>
            )}
          </div>

          {/* Información del rol */}
          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Rol</h3>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <span className="font-medium">{getRoleDisplayName(invitation.role)}</span>
            </div>
          </div>

          {/* Información de expiración */}
          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Expiración</h3>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Expira el {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button 
              onClick={acceptInvitation}
              disabled={accepting}
              className="btn btn-primary w-full"
            >
              {accepting ? 'Aceptando...' : 'Aceptar Invitación'}
            </button>
            
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-ghost w-full"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Al aceptar esta invitación, tendrás acceso a la plataforma de {invitation.companies.name}
          </p>
        </div>
      </div>
    </div>
  );
} 