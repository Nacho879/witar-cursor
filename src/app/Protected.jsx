import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function Protected({ roles, children }) {
  const [ok, setOk] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState(null);
  const [userCompany, setUserCompany] = React.useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    checkAuth();
  }, [roles]);

  async function checkAuth() {
    try {
      // Verificar si hay sesión activa
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setOk(false);
        setLoading(false);
        navigate('/login');
        return;
      }

      // Si no se especifican roles, solo verificar autenticación
      if (!roles || roles.length === 0) {
        setOk(true);
        setLoading(false);
        return;
      }

      // Obtener el rol del usuario en su empresa
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select(`
          role,
          company_id,
          companies (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (rolesError || !userRoles) {
        console.error('Error fetching user role:', rolesError);
        setOk(false);
        setLoading(false);
        navigate('/login');
        return;
      }

      // Verificar si el usuario tiene uno de los roles requeridos
      const hasRequiredRole = roles.includes(userRoles.role);
      
      if (hasRequiredRole) {
        setOk(true);
        setUserRole(userRoles.role);
        setUserCompany(userRoles.companies);
        // Guardar información en localStorage para uso posterior
        localStorage.setItem('userRole', userRoles.role);
        localStorage.setItem('userCompany', JSON.stringify(userRoles.companies));
        localStorage.setItem('sb-access-token', session.access_token);
      } else {
        setOk(false);
        setLoading(false);
        // Redirigir según el rol del usuario
        switch (userRoles.role) {
          case 'owner':
            navigate('/owner');
            break;
          case 'admin':
            navigate('/owner'); // Los admins usan el mismo layout que owners
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'employee':
            navigate('/employee');
            break;
          default:
            navigate('/login');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setOk(false);
      setLoading(false);
      navigate('/login');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="btn btn-primary"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return children;
}
