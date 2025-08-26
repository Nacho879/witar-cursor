import { 
  Mail, 
  BarChart3, 
  Building, 
  Users, 
  Clock, 
  FileText, 
  Settings, 
  CreditCard, 
  Home,
  Menu,
  X,
  Bell,
  LogOut
} from 'lucide-react';
import InvitationBadge from '@/components/InvitationBadge';
import FloatingTimeClock from '@/components/FloatingTimeClock';
import WitarLogo from '@/components/WitarLogo';
import { InvitationProvider } from '@/contexts/InvitationContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import React from 'react';

export default function OwnerLayout({ children }){
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Limpiar sessionStorage antes de cerrar sesión
      sessionStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <InvitationProvider>
      <div className='min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[256px_1fr]'>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className='fixed inset-0 bg-black/50 z-40 lg:hidden'
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed top-0 left-0 z-50 h-full bg-card border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:col-start-1
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64
        `}>
          {/* Header with close button for mobile */}
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <WitarLogo size="small" />
            <button
              onClick={() => setSidebarOpen(false)}
              className='lg:hidden p-1 rounded hover:bg-secondary'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Navigation */}
          <nav className='flex flex-col gap-2 p-2 flex-1 overflow-y-auto'>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner'
              onClick={() => setSidebarOpen(false)}
            >
              <Home className='w-4 h-4' />
              <span className='lg:block'>Dashboard</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/company'
              onClick={() => setSidebarOpen(false)}
            >
              <Building className='w-4 h-4' />
              <span className='lg:block'>Empresa</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/employees'
              onClick={() => setSidebarOpen(false)}
            >
              <Users className='w-4 h-4' />
              <span className='lg:block'>Empleados</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 justify-between transition-colors' 
              href='/owner/invitations'
              onClick={() => setSidebarOpen(false)}
            >
              <div className='flex items-center gap-2'>
                <Mail className='w-4 h-4' />
                <span className='lg:block'>Invitaciones</span>
              </div>
              <InvitationBadge />
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/departments'
              onClick={() => setSidebarOpen(false)}
            >
              <Building className='w-4 h-4' />
              <span className='lg:block'>Departamentos</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/time-entries'
              onClick={() => setSidebarOpen(false)}
            >
              <Clock className='w-4 h-4' />
              <span className='lg:block'>Fichajes</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/requests'
              onClick={() => setSidebarOpen(false)}
            >
              <FileText className='w-4 h-4' />
              <span className='lg:block'>Solicitudes</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/settings'
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className='w-4 h-4' />
              <span className='lg:block'>Configuración</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/billing'
              onClick={() => setSidebarOpen(false)}
            >
              <CreditCard className='w-4 h-4' />
              <span className='lg:block'>Facturación</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/reports'
              onClick={() => setSidebarOpen(false)}
            >
              <BarChart3 className='w-4 h-4' />
              <span className='lg:block'>Reportes</span>
            </a>
            <a 
              className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
              href='/owner/notifications'
              onClick={() => setSidebarOpen(false)}
            >
              <Bell className='w-4 h-4' />
              <span className='lg:block'>Notificaciones</span>
            </a>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className='px-3 py-2 rounded hover:bg-destructive/10 text-destructive hover:text-destructive flex items-center gap-2 transition-colors'
            >
              <LogOut className='w-4 h-4' />
              <span className='lg:block'>Cerrar Sesión</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <div className='lg:col-start-2'>
          {/* Mobile header - solo visible en móvil cuando sidebar está cerrada */}
          {!sidebarOpen && (
            <div className='lg:hidden flex items-center justify-between p-4 border-b border-border bg-card'>
              <button
                onClick={() => setSidebarOpen(true)}
                className='p-2 rounded hover:bg-secondary'
              >
                <Menu className='w-5 h-5' />
              </button>
              <WitarLogo size="small" />
            </div>
          )}

          {/* Main content area */}
          <main className='p-4 lg:pt-2 lg:px-6 lg:pb-6'>{children}</main>
          
          {/* Floating Time Clock */}
          <FloatingTimeClock />
        </div>
      </div>
    </InvitationProvider>
  );
}
