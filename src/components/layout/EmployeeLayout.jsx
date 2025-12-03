import { 
  Home, 
  Clock, 
  FileText, 
  FolderOpen,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import FloatingTimeClock from '@/components/FloatingTimeClock';
import WitarLogo from '@/components/WitarLogo';
import NotificationCenter from '@/components/NotificationCenter';
import * as React from 'react';

export default function EmployeeLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored === '1';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', isCollapsed ? '1' : '0');
    } catch {}
  }, [isCollapsed]);

  return (
    <div className='min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[auto_1fr]'>
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
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Header with close button for mobile */}
        <div className='flex items-center justify-between p-4 border-b border-border'>
          <WitarLogo size="small" showText={!isCollapsed} />
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setIsCollapsed(v => !v)}
              className='hidden lg:inline-flex p-1 rounded hover:bg-secondary'
              aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {isCollapsed ? <ChevronRight className='w-5 h-5' /> : <ChevronLeft className='w-5 h-5' />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className='lg:hidden p-1 rounded hover:bg-secondary'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className='flex flex-col gap-2 p-2 flex-1 overflow-y-auto'>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee'
            onClick={() => setSidebarOpen(false)}
          >
            <Home className='w-4 h-4' />
            <span className={isCollapsed ? 'hidden' : 'lg:block'}>Mi dashboard</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-time-entries'
            onClick={() => setSidebarOpen(false)}
          >
            <Clock className='w-4 h-4' />
            <span className={isCollapsed ? 'hidden' : 'lg:block'}>Mis fichajes</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-requests'
            onClick={() => setSidebarOpen(false)}
          >
            <FileText className='w-4 h-4' />
            <span className={isCollapsed ? 'hidden' : 'lg:block'}>Mis solicitudes</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-documents'
            onClick={() => setSidebarOpen(false)}
          >
            <FolderOpen className='w-4 h-4' />
            <span className={isCollapsed ? 'hidden' : 'lg:block'}>Mis documentos</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/notifications'
            onClick={() => setSidebarOpen(false)}
          >
            <Bell className='w-4 h-4' />
            <span className={isCollapsed ? 'hidden' : 'lg:block'}>Notificaciones</span>
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <div className='lg:col-start-2'>
        {/* Header con NotificationCenter */}
        <div className='flex items-center justify-between p-4 border-b border-border bg-card'>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className='lg:hidden p-2 rounded hover:bg-secondary'
            >
              <Menu className='w-5 h-5' />
            </button>
          )}
          <div className={sidebarOpen ? 'hidden' : 'lg:block'} />
          <WitarLogo size="small" className={sidebarOpen ? 'hidden' : 'lg:block'} />
          <div className='flex-1' />
          <NotificationCenter />
        </div>

        {/* Main content area */}
        <main className='p-4 lg:pt-2 lg:px-6 lg:pb-6'>{children}</main>
        
        {/* Floating Time Clock (verde clásico) */}
        <FloatingTimeClock />
      </div>
    </div>
  );
}
