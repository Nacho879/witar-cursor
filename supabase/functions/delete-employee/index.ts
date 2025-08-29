import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Function started - delete-employee');
    console.log('🔍 SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('🔍 SUPABASE_SERVICE_ROLE_KEY length:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length);
    
    // Cliente de servicio para operaciones de base de datos
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Cliente anónimo para autenticación
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const body = await req.json();
    console.log('📋 Request body:', body);
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
    const { employeeId, reason } = body;

    console.log('🔍 employeeId:', employeeId);
    console.log('🔍 reason:', reason);

    if (!employeeId) {
      throw new Error('ID del empleado requerido')
    }

    // Obtener el usuario que está ejecutando la acción
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    console.log('👤 Admin user:', user.email);

    // Verificar que el usuario que ejecuta la acción es admin o owner
    const { data: adminRole, error: adminRoleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminRoleError || !adminRole) {
      throw new Error('No tienes permisos para realizar esta acción')
    }

    if (adminRole.role !== 'admin' && adminRole.role !== 'owner') {
      throw new Error('Solo los administradores pueden eliminar empleados')
    }

    console.log('✅ Admin permissions verified:', adminRole.role);

    // Obtener información del empleado a eliminar
    console.log('🔍 Searching for employee with ID:', employeeId);
    console.log('🔍 Admin company_id:', adminRole.company_id);
    
    // Debug: Listar todos los empleados de la empresa
    const { data: allEmployees, error: listError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('id, user_id, role, company_id')
      .eq('company_id', adminRole.company_id);
    
    console.log('🔍 All employees in company:', allEmployees);
    console.log('🔍 List error:', listError);
    
    // Buscar el empleado por el ID del registro user_company_roles
    const { data: employeeRole, error: employeeRoleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select(`
        *,
        user_profiles (
          full_name,
          email
        )
      `)
      .eq('id', employeeId)
      .single();

    console.log('🔍 Employee role query result:', { employeeRole, error: employeeRoleError });

    if (employeeRoleError || !employeeRole) {
      console.log('❌ Employee not found. Error:', employeeRoleError);
      throw new Error('Empleado no encontrado')
    }

    // Verificar que no se está eliminando a sí mismo
    if (employeeRole.user_id === user.id) {
      throw new Error('No puedes eliminarte a ti mismo')
    }

    // Verificar que no se está eliminando a otro admin o owner
    if (employeeRole.role === 'admin' || employeeRole.role === 'owner') {
      throw new Error('No puedes eliminar a otro administrador o propietario')
    }

    console.log('👤 Employee to delete:', employeeRole.user_profiles?.full_name);

    // Crear registro de eliminación para auditoría
    const { error: auditError } = await supabaseServiceClient
      .from('employee_deletions')
      .insert({
        employee_id: employeeRole.user_id,
        employee_name: employeeRole.user_profiles?.full_name || 'Sin nombre',
        employee_email: employeeRole.user_profiles?.email || 'Sin email',
        deleted_by: user.id,
        deleted_by_name: user.email,
        company_id: adminRole.company_id,
        role: employeeRole.role,
        reason: reason || 'Sin motivo especificado',
        deleted_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('⚠️ Error creating audit log:', auditError);
    }

    // Desactivar el rol del empleado (soft delete)
    const { error: deactivateError } = await supabaseServiceClient
      .from('user_company_roles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id
      })
      .eq('id', employeeId);

    if (deactivateError) {
      console.error('❌ Error deactivating employee role:', deactivateError);
      throw new Error(`Error al desactivar empleado: ${deactivateError.message}`)
    }

    // Eliminar fichajes futuros del empleado
    const { error: timeEntriesError } = await supabaseServiceClient
      .from('time_entries')
      .delete()
      .eq('user_id', employeeRole.user_id)
      .gte('entry_time', new Date().toISOString());

    if (timeEntriesError) {
      console.error('⚠️ Error deleting future time entries:', timeEntriesError);
    }

    // Eliminar solicitudes pendientes del empleado
    const { error: requestsError } = await supabaseServiceClient
      .from('time_entry_edit_requests')
      .delete()
      .eq('user_id', employeeRole.user_id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('⚠️ Error deleting pending requests:', requestsError);
    }

    console.log('✅ Employee deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Empleado eliminado exitosamente',
        employee: {
          id: employeeRole.user_id,
          name: employeeRole.user_profiles?.full_name,
          email: employeeRole.user_profiles?.email,
          role: employeeRole.role
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 