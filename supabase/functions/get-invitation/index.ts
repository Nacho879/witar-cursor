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
    console.log('get-invitation function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { token } = body

    if (!token) {
      throw new Error('Token de invitación requerido')
    }

    console.log('Looking for invitation with token:', token)

    // Cliente de servicio para operaciones de base de datos
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener la invitación usando el cliente de servicio
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    console.log('Invitation query result:', { invitation, error: invitationError })

    if (invitationError) {
      console.error('Error getting invitation:', invitationError)
      throw new Error(`Error obteniendo invitación: ${invitationError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitación no encontrada')
    }

    // Verificar que el status sea válido para aceptar
    if (invitation.status !== 'pending' && invitation.status !== 'sent') {
      throw new Error(`Invitación no está disponible para aceptar. Estado actual: ${invitation.status}`)
    }

    // Verificar que no ha expirado
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('La invitación ha expirado')
    }

    // Obtener información de la empresa
    const { data: company, error: companyError } = await supabaseServiceClient
      .from('companies')
      .select('id, name, slug, description')
      .eq('id', invitation.company_id)
      .single()

    if (companyError) {
      console.error('Error getting company:', companyError)
    }

    // Combinar los datos
    const fullInvitation = {
      ...invitation,
      companies: company || { name: 'Empresa no encontrada' }
    }

    console.log('Returning invitation:', fullInvitation)

    return new Response(
      JSON.stringify({
        success: true,
        invitation: fullInvitation
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
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