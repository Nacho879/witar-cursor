import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle, Clock, Building, User } from 'lucide-react';
import ChangePasswordAfterInvitation from '@/components/ChangePasswordAfterInvitation';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [invitation, setInvitation] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [accepting, setAccepting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [acceptedRole, setAcceptedRole] = React.useState(null);

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
        // Si no está autenticado, mostrar la contraseña temporal y redirigir al login
        setSuccess(true);
        return;
      }

      // Si está autenticado, verificar si es el usuario correcto para esta invitación
      if (user.email !== invitation.email) {
        setError(`Esta invitación es para ${invitation.email}, pero estás logueado como ${user.email}. Por favor, cierra sesión y accede con la cuenta correcta.`);
        setAccepting(false);
        return;
      }

      // Si está autenticado y es el usuario correcto, aceptar la invitación
      const { data, error } = await supabase.functions.invoke('accept-employee-invitation', {
        body: { token }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setAcceptedRole(data.role);
        
        // Redirigir según el rol
        const redirectPath = data.role === 'owner' ? '/owner' : 
                           data.role === 'admin' ? '/admin' : 
                           data.role === 'manager' ? '/manager' : '/employee';
        
        // Redirigir inmediatamente al dashboard
        navigate(redirectPath);
        
        // Mostrar el popup de cambio de contraseña después de un breve delay
        setTimeout(() => {
          setShowPasswordModal(true);
        }, 1000);
        
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

  function handlePasswordChangeSuccess() {
    // El usuario ya está en el dashboard correcto, solo cerrar el modal
    setShowPasswordModal(false);
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
          
          {/* Credenciales temporales */}
          <div className="bg-secondary p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-foreground mb-3">Credenciales Temporales</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Email:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitation.email}
                    readOnly
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(invitation.email)}
                    className="btn btn-sm btn-ghost"
                    title="Copiar email"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Contraseña Temporal:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invitation.temp_password || 'No disponible'}
                    readOnly
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(invitation.temp_password || '')}
                    className="btn btn-sm btn-ghost"
                    title="Copiar contraseña"
                    disabled={!invitation.temp_password}
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Instrucciones:</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 text-left space-y-1">
              <li>1. Copia las credenciales temporales</li>
              <li>2. Ve al login e inicia sesión</li>
              <li>3. Se te pedirá cambiar la contraseña</li>
              <li>4. ¡Listo! Ya puedes usar la plataforma</li>
            </ol>
          </div>

          <button 
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full"
          >
            Ir al Login
          </button>
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
            <p className="text-lg font-bold text-primary">{getRoleDisplayName(invitation.role)}</p>
          </div>

          {/* Información del email */}
          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Email</h3>
            <p className="text-lg font-bold text-primary">{invitation.email}</p>
          </div>

          {/* Botón de aceptar */}
          <button
            onClick={acceptInvitation}
            disabled={accepting}
            className="btn btn-primary w-full"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Aceptando...
              </>
            ) : (
              'Aceptar Invitación'
            )}
          </button>
        </div>

        {/* Modal de cambio de contraseña */}
        {showPasswordModal && (
          <ChangePasswordAfterInvitation
            isOpen={showPasswordModal}
            onClose={() => setShowPasswordModal(false)}
            onSuccess={handlePasswordChangeSuccess}
          />
        )}
      </div>
    </div>
  );
} 