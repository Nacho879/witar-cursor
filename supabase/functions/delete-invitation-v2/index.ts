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
    console.log('Delete invitation v2 function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId } = body

    if (!invitationId) {
      throw new Error('ID de invitación requerido')
    }

    // Usar directamente el cliente de servicio para evitar problemas de RLS
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el token de autorización del header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autorización requerido')
    }

    // Verificar el usuario usando el token
    const { data: { user }, error: userError } = await supabaseServiceClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    console.log('User authenticated:', user.id)

    // Verificar que la invitación existe
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('id, company_id, email')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitación no encontrada')
    }

    console.log('Invitation found:', invitation)

    // Verificar permisos del usuario
    const { data: userRole, error: roleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', invitation.company_id)
      .eq('is_active', true)
      .single()

    if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
      throw new Error('No tienes permisos para eliminar esta invitación')
    }

    console.log('User has permission, deleting invitation:', invitationId)

    // Eliminar la invitación
    const { error: deleteError } = await supabaseServiceClient
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      throw new Error(`Error eliminando invitación: ${deleteError.message}`)
    }

    console.log('Invitation deleted successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitación eliminada exitosamente',
        invitationId: invitationId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Delete invitation v2 function error:', error)
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