import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Copy, Trash2, Edit, Eye, EyeOff, X } from 'lucide-react';
import { useInvitations } from '@/contexts/InvitationContext';

export default function Invitations() {
  const [invitations, setInvitations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState(null);
  const [filter, setFilter] = React.useState('all'); // all, pending, accepted, expired
  const { refreshCount } = useInvitations();
  const [editingInvitation, setEditingInvitation] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState({});
  const [editForm, setEditForm] = React.useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'employee',
    department_id: ''
  });
  const [departments, setDepartments] = React.useState([]);

  React.useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

  React.useEffect(() => {
    if (companyId) {
      setupRealtimeSubscription();
    }
  }, [companyId]);

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
          await Promise.all([
            loadInvitations(userRole.company_id),
            loadDepartments(userRole.company_id)
          ]);
          // Verificar invitaciones expiradas después de establecer companyId
          setTimeout(() => checkExpiredInvitations(), 100);
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

  async function loadDepartments(companyId) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function cancelInvitation(invitationId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta invitación? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
  
      
      const { data, error } = await supabase.functions.invoke('delete-invitation-v2', {
        body: { invitationId }
      });

      

      if (error) {
        console.error('Error calling delete function:', error);
        alert(`Error al eliminar la invitación: ${error.message}`);
        return;
      }

      if (data && data.success) {

        // Actualizar la interfaz inmediatamente sin recargar
        setInvitations(prevInvitations => 
          prevInvitations.filter(invitation => invitation.id !== invitationId)
        );
        // Refrescar el contador de la sidebar
        refreshCount();
        // Mostrar mensaje de éxito
        alert('Invitación eliminada exitosamente');
      } else {
        console.error('Delete function returned error:', data);
        alert(`Error al eliminar la invitación: ${data?.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error in cancelInvitation:', error);
      alert('Error al eliminar la invitación');
    }
  }

  async function resendInvitation(invitation) {
    if (!confirm('¿Estás seguro de que quieres reenviar esta invitación?')) {
      return;
    }



    if (!invitation.id) {
      alert('Error: ID de invitación no válido');
      return;
    }

    try {
      // Actualizar el estado de la invitación directamente en la base de datos
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ 
          status: 'pending',
          sent_at: null,
          temp_password: null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        throw updateError;
      }



      // Enviar nueva invitación
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: { invitationId: invitation.id }
      });

      if (emailError) {
        throw emailError;
      }

      if (emailData && emailData.success) {
        // Actualizar la interfaz inmediatamente
        setInvitations(prevInvitations => 
          prevInvitations.map(inv => 
            inv.id === invitation.id 
              ? { ...inv, status: 'pending', temp_password: emailData.tempPassword }
              : inv
          )
        );
        refreshCount();
        alert(`✅ Invitación reenviada exitosamente a ${emailData.email}\n\nNuevas credenciales temporales:\nEmail: ${emailData.email}\nContraseña: ${emailData.tempPassword}`);
      } else {
        alert('Error al reenviar la invitación');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Error al reenviar la invitación');
    }
  }

  async function editInvitation(invitation) {
    setEditingInvitation(invitation);
    setEditForm({
      first_name: invitation.first_name || '',
      last_name: invitation.last_name || '',
      email: invitation.email || '',
      role: invitation.role || 'employee',
      department_id: invitation.department_id || ''
    });
  }

  async function saveEdit() {
    if (!editingInvitation) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.toLowerCase().trim(),
          role: editForm.role,
          department_id: editForm.department_id || null
        })
        .eq('id', editingInvitation.id);

      if (error) {
        throw error;
      }

      // Actualizar la interfaz inmediatamente
      setInvitations(prevInvitations => 
        prevInvitations.map(inv => 
          inv.id === editingInvitation.id 
            ? { ...inv, ...editForm }
            : inv
        )
      );

      setEditingInvitation(null);
      alert('✅ Invitación actualizada exitosamente');
    } catch (error) {
      console.error('Error updating invitation:', error);
      alert('Error al actualizar la invitación');
    }
  }

  function togglePasswordVisibility(invitationId) {
    setShowPassword(prev => ({
      ...prev,
      [invitationId]: !prev[invitationId]
    }));
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
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

  async function checkExpiredInvitations() {
    try {
      
      if (!companyId) {
        return;
      }
      
      const now = new Date().toISOString();
      
      // Buscar invitaciones que han expirado pero aún están en estado pending o sent
      const { data: expiredInvitations, error } = await supabase
        .from('invitations')
        .select('id, email, status, expires_at')
        .eq('company_id', companyId)
        .in('status', ['pending', 'sent'])
        .lt('expires_at', now);


      if (!error && expiredInvitations && expiredInvitations.length > 0) {
        
        // Actualizar todas las invitaciones expiradas
        const { error: updateError } = await supabase
          .from('invitations')
          .update({ 
            status: 'expired',
            expired_at: now
          })
          .in('id', expiredInvitations.map(inv => inv.id));

        if (!updateError) {
          // Recargar las invitaciones para mostrar los cambios
          await loadInvitations(companyId);
          refreshCount();
        } else {
          console.error('Error updating expired invitations:', updateError);
        }
      }
    } catch (error) {
      console.error('Error checking expired invitations:', error);
    }
  }

  function setupRealtimeSubscription() {
    if (!companyId) return;


    const channel = supabase
      .channel(`invitations-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          // Recargar las invitaciones cuando hay cambios
          loadInvitations(companyId);
          refreshCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {invitation.first_name && invitation.last_name 
                                ? `${invitation.first_name} ${invitation.last_name}`
                                : invitation.email
                              }
                            </span>
                          </div>
                          {invitation.first_name && invitation.last_name && (
                            <span className="text-sm text-muted-foreground mt-1">
                              {invitation.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="td">
                        <span className="badge">{getRoleDisplayName(invitation.role)}</span>
                      </td>
                      <td className="td">
                        {invitation.departments?.name || 'Sin departamento'}
                      </td>
                      <td className="td">
                        Sin supervisor
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
                          {invitation.status === 'accepted' ? (
                            <span className="text-green-600">Aceptada</span>
                          ) : invitation.expires_at ? (
                            new Date(invitation.expires_at).toLocaleDateString()
                          ) : (
                            'Sin fecha'
                          )}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-2">
                          {/* Ver contraseña temporal */}
                          {invitation.temp_password && (
                            <button
                              onClick={() => togglePasswordVisibility(invitation.id)}
                              className="btn btn-ghost btn-sm"
                              title="Ver contraseña temporal"
                            >
                              {showPassword[invitation.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Editar invitación */}
                          <button
                            onClick={() => editInvitation(invitation)}
                            className="btn btn-ghost btn-sm"
                            title="Editar invitación"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Copiar enlace */}
                          <button
                            onClick={() => copyInvitationLink(invitation.token)}
                            className="btn btn-ghost btn-sm"
                            title="Copiar enlace"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Reenviar invitación */}
                          <button
                            onClick={() => resendInvitation(invitation)}
                            className="btn btn-ghost btn-sm"
                            title="Reenviar invitación"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Eliminar invitación */}
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="btn btn-ghost btn-sm text-destructive"
                            title="Eliminar invitación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Mostrar contraseña temporal */}
                          {showPassword[invitation.id] && invitation.temp_password && (
                            <div className="absolute bg-background border border-border rounded-lg p-3 shadow-lg z-10 mt-8">
                              <div className="text-sm font-medium mb-2">Contraseña temporal:</div>
                              <div className="flex items-center gap-2">
                                <code className="bg-secondary px-2 py-1 rounded text-sm">
                                  {invitation.temp_password}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(invitation.temp_password)}
                                  className="btn btn-ghost btn-xs"
                                  title="Copiar contraseña"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
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

      {/* Modal de Edición */}
      {editingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Edit className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Editar Invitación</h2>
              </div>
              <button
                onClick={() => setEditingInvitation(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="p-6 space-y-4">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="input w-full"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Apellido</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="input w-full"
                    placeholder="Pérez"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input w-full"
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="input w-full"
                  required
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Jefe de Equipo</option>
                  <option value="employee">Empleado</option>
                </select>
              </div>

              {/* Departamento */}
              {departments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Departamento</label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, department_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Sin departamento</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingInvitation(null)}
                  className="btn btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 