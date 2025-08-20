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
    console.log('Test function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId } = body

    if (!invitationId) {
      throw new Error('ID de invitación requerido')
    }

    console.log('Looking for invitation:', invitationId)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Solo verificar que la invitación existe
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select('id, email, status')
      .eq('id', invitationId)
      .single()

    console.log('Invitation query result:', { invitation, error: invitationError })

    if (invitationError) {
      throw new Error(`Error obteniendo invitación: ${invitationError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitación no encontrada')
    }

    const response = {
      success: true,
      message: 'Invitación encontrada',
      invitation: invitation
    }

    console.log('Returning success response:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Test function error:', error)
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