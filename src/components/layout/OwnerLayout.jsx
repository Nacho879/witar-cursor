import ThemeToggle from '@/components/common/ThemeToggle';
import { Mail } from 'lucide-react';
import InvitationBadge from '@/components/InvitationBadge';
import NotificationCenter from '@/components/NotificationCenter';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function OwnerLayout({ children }){
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    async function getCompanyId() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userRole } = await supabase
            .from('user_company_roles')
            .select('company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          if (userRole) {
            setCompanyId(userRole.company_id);
          }
        }
      } catch (error) {
        console.error('Error getting company ID:', error);
      }
    }
    
    getCompanyId();
  }, []);
  return (
    <div className='min-h-screen grid grid-cols-[240px_1fr] bg-background text-foreground'>
      <aside className='bg-card border-r border-border'>
        <div className='p-4 font-semibold'>Witar — Owner</div>
        <nav className='flex flex-col gap-2 p-2'>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner'>Dashboard</a>
          <a className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2' href='/owner/company'>
            <Building2 className='w-4 h-4' />
            Empresa
          </a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/employees'>Empleados</a>
          <a className='px-3 py-2 rounded hover:bg-secondary flex items-center gap-2 justify-between' href='/owner/invitations'>
            <div className='flex items-center gap-2'>
              <Mail className='w-4 h-4' />
              Invitaciones
            </div>
            <InvitationBadge companyId={companyId} />
          </a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/departments'>Departamentos</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/time-entries'>Fichajes</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/requests'>Solicitudes</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/settings'>Configuración</a>
          <a className='px-3 py-2 rounded hover:bg-secondary' href='/owner/billing'>Facturación</a>
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
