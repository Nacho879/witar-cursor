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
    console.log('Function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId } = body

    if (!invitationId) {
      throw new Error('ID de invitación requerido')
    }

    console.log('Looking for invitation:', invitationId)

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

    // Obtener la invitación con información básica usando el cliente de servicio
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('id, email, status, role, company_id, first_name, last_name')
      .eq('id', invitationId)
      .single()

    console.log('Invitation query result:', { invitation, error: invitationError })

    if (invitationError) {
      throw new Error(`Error obteniendo invitación: ${invitationError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitación no encontrada')
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitación no está pendiente. Estado actual: ${invitation.status}`)
    }

    // Obtener información de la empresa
    const { data: company, error: companyError } = await supabaseServiceClient
      .from('companies')
      .select('id, name, slug')
      .eq('id', invitation.company_id)
      .single()

    if (companyError) {
      console.error('Error getting company:', companyError)
    }

    // Generar credenciales temporales
    const tempPassword = generateTempPassword()
    console.log('Generated temp password for:', invitation.email)
    
    // Crear el usuario en Supabase Auth
    const { data: authUser, error: createUserError } = await supabaseServiceClient.auth.admin.createUser({
      email: invitation.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        temp_user: true,
        invitation_id: invitationId,
        role: invitation.role,
        company_id: invitation.company_id
      }
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      throw new Error(`Error creando usuario: ${createUserError.message}`)
    }

    console.log('User created in Auth:', authUser.user?.id)

    // Crear el perfil del usuario
    const fullName = invitation.first_name && invitation.last_name 
      ? `${invitation.first_name} ${invitation.last_name}`
      : `Usuario ${invitation.role}`;
      
    const { error: profileError } = await supabaseServiceClient
      .from('user_profiles')
      .insert({
        user_id: authUser.user!.id,
        full_name: fullName,
        email: invitation.email,
        avatar_url: null
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // No lanzar error aquí, el perfil se puede crear después
    }

    // Crear el rol del usuario en la empresa
    const { error: roleError } = await supabaseServiceClient
      .from('user_company_roles')
      .insert({
        user_id: authUser.user!.id,
        company_id: invitation.company_id,
        role: invitation.role,
        is_active: true
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      throw new Error(`Error creando rol de usuario: ${roleError.message}`)
    }

    // Actualizar la invitación con las credenciales temporales usando el cliente de servicio
    const { error: updateError } = await supabaseServiceClient
      .from('invitations')
      .update({ 
        status: 'accepted',
        sent_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        temp_password: tempPassword
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      throw new Error(`Error actualizando invitación: ${updateError.message}`)
    }

    console.log('Invitation updated successfully')

    const response = {
      success: true,
      message: 'Invitación enviada exitosamente',
      email: invitation.email,
      tempPassword: tempPassword,
      invitationUrl: `${Deno.env.get('FRONTEND_URL') || 'https://witar-cursor.vercel.app'}/login`,
      company: company
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

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
} 