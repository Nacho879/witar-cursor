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
    console.log('Delete invitation function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId } = body

    if (!invitationId) {
      throw new Error('ID de invitación requerido')
    }

    console.log('Looking for invitation to delete:', invitationId)

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

    // Cliente de servicio para operaciones de base de datos
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

    // Verificar que la invitación existe y pertenece a la empresa del usuario
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('id, company_id, email')
      .eq('id', invitationId)
      .single()

    if (invitationError) {
      console.error('Error getting invitation:', invitationError)
      throw new Error(`Error obteniendo invitación: ${invitationError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitación no encontrada')
    }

    console.log('Invitation found:', invitation)

    // Verificar que el usuario tiene permisos para eliminar esta invitación
    const { data: userRole, error: roleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', invitation.company_id)
      .eq('is_active', true)
      .single()

    if (roleError || !userRole) {
      console.error('Error getting user role:', roleError)
      throw new Error('No tienes permisos para eliminar esta invitación')
    }

    console.log('User role:', userRole.role)

    // Solo owners y admins pueden eliminar invitaciones
    if (!['owner', 'admin'].includes(userRole.role)) {
      throw new Error('Solo administradores pueden eliminar invitaciones')
    }

    console.log('Deleting invitation:', invitationId)

    // Eliminar la invitación usando el cliente de servicio
    const { error: deleteError } = await supabaseServiceClient
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      throw new Error(`Error eliminando invitación: ${deleteError.message}`)
    }

    console.log('Invitation deleted successfully')

    const response = {
      success: true,
      message: 'Invitación eliminada exitosamente',
      invitationId: invitationId
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Delete invitation function error:', error)
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