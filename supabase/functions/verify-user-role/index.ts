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
    console.log('🔍 Function started - verify-user-role');
    
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

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    console.log('👤 User authenticated:', user.email);

    // Verificar si el usuario tiene un rol activo
    const { data: userRole, error: roleError } = await supabaseServiceClient
      .from('user_company_roles')
      .select('role, company_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    console.log('🔍 Role check result:', { userRole, error: roleError });

    if (userRole && !roleError) {
      console.log('✅ User has active role:', userRole.role);
      return new Response(
        JSON.stringify({
          success: true,
          hasRole: true,
          role: userRole.role,
          company_id: userRole.company_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Si no tiene rol activo, buscar invitaciones pendientes
    console.log('🔍 No active role found, checking for pending invitations');
    const { data: pendingInvitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('*')
      .eq('email', user.email)
      .in('status', ['pending', 'sent'])
      .single();

    console.log('📋 Pending invitation check:', { pendingInvitation, error: invitationError });

    if (pendingInvitation && !invitationError) {
      console.log('✅ Found pending invitation, processing...');
      
      // Crear el perfil del usuario si no existe
      const fullName = pendingInvitation.first_name && pendingInvitation.last_name 
        ? `${pendingInvitation.first_name} ${pendingInvitation.last_name}`
        : `Usuario ${pendingInvitation.role}`;
        
      const { error: profileError } = await supabaseServiceClient
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          avatar_url: null
        }, { onConflict: 'user_id' })

      if (profileError) {
        console.error('⚠️ Error creating profile:', profileError);
      }

      // Crear el rol de usuario
      const { error: roleError } = await supabaseServiceClient
        .from('user_company_roles')
        .upsert({
          user_id: user.id,
          company_id: pendingInvitation.company_id,
          role: pendingInvitation.role,
          department_id: pendingInvitation.department_id,
          supervisor_id: pendingInvitation.supervisor_id,
          is_active: true
        }, { onConflict: 'user_id,company_id' })

      if (roleError) {
        console.error('❌ Error creating role:', roleError);
        throw new Error(`Error al crear rol: ${roleError.message}`)
      }

      // Marcar la invitación como aceptada
      const { error: updateError } = await supabaseServiceClient
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', pendingInvitation.id)

      if (updateError) {
        console.error('⚠️ Error updating invitation:', updateError);
      }

      console.log('✅ Role created successfully from pending invitation');

      return new Response(
        JSON.stringify({
          success: true,
          hasRole: true,
          role: pendingInvitation.role,
          company_id: pendingInvitation.company_id,
          createdFromInvitation: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Si no hay invitación pendiente ni rol activo
    console.log('❌ No active role or pending invitation found');
    return new Response(
      JSON.stringify({
        success: false,
        hasRole: false,
        error: 'Usuario sin rol activo ni invitación pendiente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
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