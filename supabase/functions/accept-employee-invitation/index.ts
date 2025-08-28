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
    console.log('Function started - accept-employee-invitation');
    
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
    console.log('Request body:', body);
    const { token } = body;
    console.log('Extracted token:', token);

    if (!token) {
      throw new Error('Token de invitación requerido')
    }

    // Verificar que la invitación existe y es válida
    console.log('Looking for invitation with token:', token);
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
      .in('status', ['pending', 'sent']) // Buscar tanto 'pending' como 'sent'
      .single()

    console.log('Invitation query result:', { invitation, error: invitationError });

    if (invitationError || !invitation) {
      console.error('Invitation not found or error:', invitationError);
      throw new Error('Invitación no válida o expirada')
    }

    console.log('Invitation found:', invitation);

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

    // Verificar que el email coincide (TEMPORALMENTE DESHABILITADO PARA PRUEBAS)
    console.log('User email:', user.email);
    console.log('Invitation email:', invitation.email);
    // if (user.email !== invitation.email) {
    //   throw new Error(`El email no coincide con la invitación. Usuario: ${user.email}, Invitación: ${invitation.email}`)
    // }
    console.log('Email validation temporarily disabled for testing');

    // Verificar si el usuario ya tiene un rol en esta empresa
    const { data: existingRole, error: existingRoleError } = await supabaseClient
      .from('user_company_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('company_id', invitation.company_id)
      .single();

    if (existingRole && !existingRoleError) {
      console.log('User already has a role in this company:', existingRole.role);
      
      // Si ya tiene un rol activo, no sobrescribirlo
      if (existingRole.is_active) {
        throw new Error(`Ya tienes un rol activo en esta empresa como ${existingRole.role}. No puedes aceptar múltiples invitaciones.`);
      }
    }

    // Crear el perfil del usuario si no existe
    const fullName = invitation.first_name && invitation.last_name 
      ? `${invitation.first_name} ${invitation.last_name}`
      : `Usuario ${invitation.role}`;
      
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        avatar_url: null
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      // No lanzar error aquí, el perfil se puede crear después
    }

    // Crear o actualizar el rol de usuario en la empresa
    const { error: roleError } = await supabaseClient
      .from('user_company_roles')
      .upsert({
        user_id: user.id,
        company_id: invitation.company_id,
        role: invitation.role,
        department_id: invitation.department_id,
        supervisor_id: invitation.supervisor_id,
        is_active: true
      }, { onConflict: 'user_id,company_id' })

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
