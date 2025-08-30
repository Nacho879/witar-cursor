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
    console.log('🔍 Function started - ensure-user-profile');
    
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

    // Verificar si el usuario tiene un perfil
    const { data: existingProfile, error: profileError } = await supabaseServiceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Profile check result:', { existingProfile, error: profileError });

    // Buscar invitación para obtener nombre y apellido
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('*')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('📧 Invitation check result:', { invitation, error: invitationError });

    let profileData = {
      user_id: user.id,
      full_name: '',
      avatar_url: null
    };

    // Si hay invitación, usar los datos de la invitación
    if (invitation && !invitationError) {
      if (invitation.first_name && invitation.last_name) {
        profileData.full_name = `${invitation.first_name} ${invitation.last_name}`;
      } else if (invitation.first_name) {
        profileData.full_name = invitation.first_name;
      } else if (invitation.last_name) {
        profileData.full_name = invitation.last_name;
      } else {
        profileData.full_name = `Usuario ${invitation.role || 'Empleado'}`;
      }
    } else {
      // Si no hay invitación, buscar en user_metadata o usar el email
      const userMetadata = user.user_metadata;
      if (userMetadata && userMetadata.full_name) {
        profileData.full_name = userMetadata.full_name;
      } else {
        profileData.full_name = user.email?.split('@')[0] || 'Usuario';
      }
    }

    // Si no hay perfil, crearlo
    if (!existingProfile && profileError) {
      console.log('👤 Creating new profile:', profileData);
      
      const { data: newProfile, error: createError } = await supabaseServiceClient
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        throw new Error(`Error creando perfil: ${createError.message}`)
      }

      console.log('✅ Profile created successfully:', newProfile);
      
      return new Response(
        JSON.stringify({
          success: true,
          profile: newProfile,
          action: 'created'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Si hay perfil pero está incompleto, actualizarlo
    if (existingProfile && (!existingProfile.full_name || existingProfile.full_name === '')) {
      console.log('👤 Updating incomplete profile:', profileData);
      
      const { data: updatedProfile, error: updateError } = await supabaseServiceClient
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        throw new Error(`Error actualizando perfil: ${updateError.message}`)
      }

      console.log('✅ Profile updated successfully:', updatedProfile);
      
      return new Response(
        JSON.stringify({
          success: true,
          profile: updatedProfile,
          action: 'updated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Si el perfil ya está completo, retornarlo
    console.log('✅ Profile already exists and is complete:', existingProfile);
    
    return new Response(
      JSON.stringify({
        success: true,
        profile: existingProfile,
        action: 'exists'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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