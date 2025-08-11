import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function InvitationBadge({ companyId }) {
  const [pendingCount, setPendingCount] = React.useState(0);

  React.useEffect(() => {
    if (companyId) {
      loadPendingInvitations();
    }
  }, [companyId]);

  async function loadPendingInvitations() {
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
      console.error('Error loading pending invitations:', error);
    }
  }

  if (pendingCount === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-red-500 text-white rounded-full">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
} 