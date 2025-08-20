import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Settings, 
  Building2,
  LogOut,
  Bell,
  User,
  BarChart3,
  FolderOpen,
  Mail
} from 'lucide-react';
import FloatingTimeClock from '@/components/FloatingTimeClock';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [company, setCompany] = React.useState(null);

  React.useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select(`
            companies (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole?.companies) {
          setCompany(userRole.companies);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const menuItems = [
    {
      path: '/admin',
      icon: LayoutDashboard,
      label: 'Dashboard',
      section: 'Mi Perfil'
    },
    {
      path: '/admin/my-time-entries',
      icon: Clock,
      label: 'Mis Fichajes',
      section: 'Mi Perfil'
    },
    {
      path: '/admin/my-requests',
      icon: FileText,
      label: 'Mis Solicitudes',
      section: 'Mi Perfil'
    },
    {
      path: '/admin/my-documents',
      icon: FolderOpen,
      label: 'Mis Documentos',
      section: 'Mi Perfil'
    },
    {
      path: '/admin/company',
      icon: Building2,
      label: 'Empresa',
      section: 'Empresa'
    },
    {
      path: '/admin/departments',
      icon: Users,
      label: 'Departamentos',
      section: 'Empresa'
    },
    {
      path: '/admin/invitations',
      icon: Mail,
      label: 'Invitaciones',
      section: 'Empresa'
    },
    {
      path: '/admin/reports',
      icon: BarChart3,
      label: 'Reportes',
      section: 'Empresa'
    },
    {
      path: '/admin/employees',
      icon: Users,
      label: 'Empleados',
      section: 'Equipo'
    },
    {
      path: '/admin/requests',
      icon: FileText,
      label: 'Solicitudes',
      section: 'Equipo'
    },
    {
      path: '/admin/time-entries',
      icon: Clock,
      label: 'Control Horario',
      section: 'Equipo'
    },
    {
      path: '/admin/documents',
      icon: FolderOpen,
      label: 'Documentos',
      section: 'Equipo'
    },
    {
      path: '/admin/settings',
      icon: Settings,
      label: 'Configuración',
      section: 'Empresa'
    }
  ];

  const sections = ['Mi Perfil', 'Empresa', 'Equipo'];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">Witar</h1>
                <p className="text-sm text-muted-foreground">Administrador</p>
              </div>
            </div>
            {company && (
              <p className="text-xs text-muted-foreground mt-2">
                {company.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {sections.map((section) => (
              <div key={section} className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section}
                </h3>
                <ul className="space-y-1">
                  {menuItems
                    .filter(item => item.section === section)
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Floating Time Clock */}
      <FloatingTimeClock />
    </div>
  );
} 