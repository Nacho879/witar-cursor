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
    console.log('Update invitation status function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId, action } = body

    console.log('Received body:', body)
    console.log('InvitationId type:', typeof invitationId, 'Value:', invitationId)
    console.log('Action type:', typeof action, 'Value:', action)

    if (!invitationId || !action) {
      throw new Error('ID de invitación y acción requeridos')
    }

    console.log('Processing invitation:', invitationId, 'Action:', action)

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener la invitación actual
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitación no encontrada')
    }

    console.log('Current invitation status:', invitation.status)

    let newStatus = invitation.status
    let updateData: any = {}

    switch (action) {
      case 'accept':
        if (invitation.status === 'pending' || invitation.status === 'sent') {
          newStatus = 'accepted'
          updateData = {
            status: 'accepted',
            accepted_at: new Date().toISOString()
          }
        }
        break

      case 'expire':
        if (invitation.status === 'pending' || invitation.status === 'sent') {
          newStatus = 'expired'
          updateData = {
            status: 'expired',
            expired_at: new Date().toISOString()
          }
        }
        break

      case 'cancel':
        if (invitation.status !== 'accepted') {
          newStatus = 'cancelled'
          updateData = {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          }
        }
        break

      case 'resend':
        if (invitation.status === 'expired' || invitation.status === 'cancelled') {
          newStatus = 'pending'
          updateData = {
            status: 'pending',
            sent_at: null,
            temp_password: null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
          }
        }
        break

      default:
        throw new Error('Acción no válida')
    }

    if (newStatus !== invitation.status) {
      // Actualizar la invitación
      const { error: updateError } = await supabaseServiceClient
        .from('invitations')
        .update(updateData)
        .eq('id', invitationId)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
        throw new Error(`Error actualizando invitación: ${updateError.message}`)
      }

      console.log('Invitation status updated to:', newStatus)
    }

    const response = {
      success: true,
      message: `Invitación ${newStatus} exitosamente`,
      invitationId: invitationId,
      newStatus: newStatus
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Update invitation status function error:', error)
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