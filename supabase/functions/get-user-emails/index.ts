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
    console.log('Get user emails function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('userIds array requerido')
    }

    console.log('Looking for emails for users:', userIds)

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener los emails de los usuarios usando user_profiles
    const { data: profiles, error } = await supabaseServiceClient
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)

    if (error) {
      console.error('Error getting profiles:', error)
      throw new Error(`Error obteniendo perfiles: ${error.message}`)
    }

    // Para obtener los emails, necesitamos usar la API de admin
    // pero de forma más segura
    let userEmails = [];
    
    try {
      const { data: users, error: usersError } = await supabaseServiceClient.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error getting users from auth:', usersError)
        // Si falla, devolver solo los perfiles sin emails
        userEmails = profiles.map(profile => ({
          user_id: profile.user_id,
          email: 'Email no disponible'
        }))
      } else {
        // Filtrar solo los usuarios solicitados
        const requestedUsers = users.users.filter(user => userIds.includes(user.id))
        userEmails = requestedUsers.map(user => ({
          user_id: user.id,
          email: user.email || 'Email no disponible'
        }))
      }
    } catch (authError) {
      console.error('Error accessing auth.users:', authError)
      // Si falla el acceso a auth.users, devolver perfiles sin emails
      userEmails = profiles.map(profile => ({
        user_id: profile.user_id,
        email: 'Email no disponible'
      }))
    }

    console.log('Found emails for users:', userEmails.length)

    const response = {
      success: true,
      emails: userEmails
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Get user emails function error:', error)
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