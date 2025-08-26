import { 
  Home, 
  Clock, 
  FileText, 
  FolderOpen,
  Menu,
  X
} from 'lucide-react';
import FloatingTimeClock from '@/components/FloatingTimeClock';
import WitarLogo from '@/components/WitarLogo';
import * as React from 'react';

export default function EmployeeLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
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
            href='/employee'
            onClick={() => setSidebarOpen(false)}
          >
            <Home className='w-4 h-4' />
            <span className='lg:block'>Mi dashboard</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-time-entries'
            onClick={() => setSidebarOpen(false)}
          >
            <Clock className='w-4 h-4' />
            <span className='lg:block'>Mis fichajes</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-requests'
            onClick={() => setSidebarOpen(false)}
          >
            <FileText className='w-4 h-4' />
            <span className='lg:block'>Mis solicitudes</span>
          </a>
          <a 
            className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 transition-colors' 
            href='/employee/my-documents'
            onClick={() => setSidebarOpen(false)}
          >
            <FolderOpen className='w-4 h-4' />
            <span className='lg:block'>Mis documentos</span>
          </a>
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
  );
}
