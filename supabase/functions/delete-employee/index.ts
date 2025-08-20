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
    console.log('Delete employee function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { employeeId, companyId } = body

    if (!employeeId || !companyId) {
      throw new Error('ID de empleado y empresa requeridos')
    }

    console.log('Processing employee deletion:', employeeId, 'from company:', companyId)

    // Cliente anónimo para verificar autenticación
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Cliente de servicio para operaciones de base de datos y auth
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    console.log('User authenticated:', user.id)

    // Verificar que el usuario tiene permisos para eliminar empleados
    const { data: userRole, error: roleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (roleError || !userRole) {
      throw new Error('No tienes permisos para eliminar empleados en esta empresa')
    }

    if (!['owner', 'admin'].includes(userRole.role)) {
      throw new Error('Solo los propietarios y administradores pueden eliminar empleados')
    }

    // Obtener información del empleado a eliminar
    const { data: employeeRole, error: employeeError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('*')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .single()

    if (employeeError || !employeeRole) {
      throw new Error('Empleado no encontrado')
    }

    // Verificar que no se está intentando eliminar al owner
    if (employeeRole.role === 'owner') {
      throw new Error('No se puede eliminar al propietario de la empresa')
    }

    console.log('Employee to delete:', employeeRole)

    // Verificar si el usuario está en otras empresas
    const { data: otherCompanies, error: otherCompaniesError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('company_id')
      .eq('user_id', employeeRole.user_id)
      .neq('company_id', companyId)

    if (otherCompaniesError) {
      console.error('Error checking other companies:', otherCompaniesError)
    }

    const hasOtherCompanies = otherCompanies && otherCompanies.length > 0

    // Eliminar el rol del usuario en esta empresa
    const { error: deleteRoleError } = await supabaseServiceClient
      .from('user_company_roles')
      .delete()
      .eq('id', employeeId)

    if (deleteRoleError) {
      console.error('Error deleting user role:', deleteRoleError)
      throw new Error(`Error eliminando rol de empleado: ${deleteRoleError.message}`)
    }

    console.log('User role deleted successfully')

    // Eliminar registros relacionados en otras tablas
    const userId = employeeRole.user_id

    // Eliminar registros de tiempo
    const { error: timeEntriesError } = await supabaseServiceClient
      .from('time_entries')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (timeEntriesError) {
      console.error('Error deleting time entries:', timeEntriesError)
    }

    // Eliminar solicitudes
    const { error: requestsError } = await supabaseServiceClient
      .from('requests')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (requestsError) {
      console.error('Error deleting requests:', requestsError)
    }

    // Eliminar documentos
    const { error: documentsError } = await supabaseServiceClient
      .from('documents')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (documentsError) {
      console.error('Error deleting documents:', documentsError)
    }

    // Eliminar notificaciones
    const { error: notificationsError } = await supabaseServiceClient
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (notificationsError) {
      console.error('Error deleting notifications:', notificationsError)
    }

    // Si el usuario no está en otras empresas, eliminar el perfil y la cuenta de auth
    if (!hasOtherCompanies) {
      // Eliminar perfil de usuario
      const { error: profileError } = await supabaseServiceClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) {
        console.error('Error deleting user profile:', profileError)
      }

      // Eliminar usuario de Supabase Auth
      const { error: authError } = await supabaseServiceClient.auth.admin.deleteUser(userId)

      if (authError) {
        console.error('Error deleting auth user:', authError)
      } else {
        console.log('Auth user deleted successfully')
      }
    } else {
      console.log('User has other companies, keeping profile and auth account')
    }

    const response = {
      success: true,
      message: 'Empleado eliminado exitosamente',
      employeeId: employeeId,
      userId: userId,
      hasOtherCompanies: hasOtherCompanies
    }

    console.log('Employee deletion completed successfully')

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Delete employee function error:', error)
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