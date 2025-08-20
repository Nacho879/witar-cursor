import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

const InvitationContext = React.createContext();

export function InvitationProvider({ children }) {
  const [pendingCount, setPendingCount] = React.useState(0);
  const [companyId, setCompanyId] = React.useState(null);

  React.useEffect(() => {
    getCompanyId();
  }, []);

  React.useEffect(() => {
    if (companyId) {
      loadPendingCount();
      setupRealtimeSubscription();
    }
  }, [companyId]);

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

  async function loadPendingCount() {
    try {
      const { count, error } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingCount(count);
      }
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  }

  function setupRealtimeSubscription() {
    const channel = supabase
      .channel('invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          // Recargar el contador cuando hay cambios
          loadPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const value = {
    pendingCount,
    refreshCount: loadPendingCount
  };

  return (
    <InvitationContext.Provider value={value}>
      {children}
    </InvitationContext.Provider>
  );
}

export function useInvitations() {
  const context = React.useContext(InvitationContext);
  if (context === undefined) {
    throw new Error('useInvitations must be used within an InvitationProvider');
  }
  return context;
} 