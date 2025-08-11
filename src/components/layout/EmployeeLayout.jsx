import ThemeToggle from '@/components/common/ThemeToggle';
import NotificationCenter from '@/components/NotificationCenter';

export default function EmployeeLayout({ children }) {
  return (
    <div className='min-h-screen grid grid-cols-[200px_1fr] bg-background text-foreground'>
      <aside className='bg-card border-r border-border'>
        <div className='p-4 font-semibold'>Witar — Empleado</div>
        <nav className='flex flex-col gap-2 p-2'>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/employee'>Mi dashboard</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/employee/my-time-entries'>Mis fichajes</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/employee/my-requests'>Mis solicitudes</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/employee/my-documents'>Mis documentos</a>
        </nav>
        <div className='p-3 flex items-center justify-between'>
          <NotificationCenter />
          <ThemeToggle/>
        </div>
      </aside>
      <main className='p-6'>{children}</main>
    </div>
  );
}
