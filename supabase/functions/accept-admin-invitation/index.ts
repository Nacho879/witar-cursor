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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { token } = await req.json()

    if (!token) {
      throw new Error('Token de invitación requerido')
    }

    // Verificar que la invitación existe y es válida
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select(`
        *,
        companies (
          id,
          name,
          slug
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitación no válida o expirada')
    }

    // Verificar que no ha expirado
    if (new Date(invitation.expires_at) < new Date()) {
      // Marcar como expirada
      await supabaseClient
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      throw new Error('La invitación ha expirado')
    }

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Verificar que el email coincide
    if (user.email !== invitation.email) {
      throw new Error('El email no coincide con la invitación')
    }

    // Crear el rol de usuario en la empresa
    const { error: roleError } = await supabaseClient
      .from('user_company_roles')
      .insert({
        user_id: user.id,
        company_id: invitation.company_id,
        role: invitation.role,
        department_id: invitation.department_id,
        supervisor_id: invitation.supervisor_id,
        is_active: true
      })

    if (roleError) {
      throw new Error(`Error al asignar rol: ${roleError.message}`)
    }

    // Marcar la invitación como aceptada
    const { error: updateError } = await supabaseClient
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitación aceptada exitosamente',
        company: invitation.companies,
        role: invitation.role
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
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
