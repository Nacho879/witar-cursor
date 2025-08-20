import * as React from 'react';
import { useInvitations } from '@/contexts/InvitationContext';

export default function InvitationBadge() {
  const { pendingCount } = useInvitations();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-red-500 text-white rounded-full">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
} 