import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Copy, Trash2 } from 'lucide-react';

export default function Invitations() {
  const [invitations, setInvitations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState(null);
  const [filter, setFilter] = React.useState('all'); // all, pending, accepted, expired

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
          await loadInvitations(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvitations(companyId) {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          companies (
            name
          ),
          departments (
            name
          ),
          user_company_roles!invitations_supervisor_id_fkey (
            user_profiles (
              full_name
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvitations(data);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }

  async function cancelInvitation(invitationId) {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (!error) {
        await loadInvitations(companyId);
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  }

  async function resendInvitation(invitation) {
    try {
      // Generar nuevo token y fecha de expiración
      const newToken = crypto.randomUUID();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await supabase
        .from('invitations')
        .update({ 
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          status: 'pending'
        })
        .eq('id', invitation.id);

      if (!error) {
        await loadInvitations(companyId);
        // Aquí podrías enviar el nuevo email
        const newInvitationUrl = `${window.location.origin}/accept-invitation?token=${newToken}`;
        alert(`Nueva invitación generada. Enlace: ${newInvitationUrl}`);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  }

  function copyInvitationLink(token) {
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    alert('Enlace copiado al portapapeles');
  }

  function getRoleDisplayName(role) {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Jefe de Equipo';
      case 'employee': return 'Empleado';
      default: return role;
    }
  }

  function getStatusDisplay(status) {
    switch (status) {
      case 'pending': return { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'accepted': return { text: 'Aceptada', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'expired': return { text: 'Expirada', color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'cancelled': return { text: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: XCircle };
      default: return { text: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  }

  const filteredInvitations = invitations.filter(invitation => {
    if (filter === 'all') return true;
    return invitation.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="card p-6">
            <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold">Invitaciones</h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Todas ({invitations.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Pendientes ({invitations.filter(i => i.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`btn btn-sm ${filter === 'accepted' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Aceptadas ({invitations.filter(i => i.status === 'accepted').length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`btn btn-sm ${filter === 'expired' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Expiradas ({invitations.filter(i => i.status === 'expired').length})
          </button>
        </div>
      </div>

      {/* Lista de invitaciones */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">Email</th>
                <th className="th">Rol</th>
                <th className="th">Departamento</th>
                <th className="th">Supervisor</th>
                <th className="th">Estado</th>
                <th className="th">Fecha de Envío</th>
                <th className="th">Expiración</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="td text-center text-muted-foreground py-8">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No hay invitaciones {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => {
                  const statusInfo = getStatusDisplay(invitation.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={invitation.id}>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className="badge">{getRoleDisplayName(invitation.role)}</span>
                      </td>
                      <td className="td">
                        {invitation.departments?.name || 'Sin departamento'}
                      </td>
                      <td className="td">
                        {invitation.user_company_roles?.user_profiles?.full_name || 'Sin supervisor'}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className={`badge ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </td>
                      <td className="td">
                        <span className="text-sm text-muted-foreground">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="td">
                        <span className="text-sm text-muted-foreground">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-2">
                          {invitation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => copyInvitationLink(invitation.token)}
                                className="btn btn-ghost btn-sm"
                                title="Copiar enlace"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => resendInvitation(invitation)}
                                className="btn btn-ghost btn-sm"
                                title="Reenviar invitación"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => cancelInvitation(invitation.id)}
                                className="btn btn-ghost btn-sm text-destructive"
                                title="Cancelar invitación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {invitation.status === 'accepted' && (
                            <span className="text-sm text-success">Aceptada</span>
                          )}
                          {(invitation.status === 'expired' || invitation.status === 'cancelled') && (
                            <button
                              onClick={() => resendInvitation(invitation)}
                              className="btn btn-ghost btn-sm"
                              title="Reenviar invitación"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 