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

    // Obtener los usuarios de auth.users
    const { data: users, error } = await supabaseServiceClient.auth.admin.listUsers()

    if (error) {
      console.error('Error getting users:', error)
      throw new Error(`Error obteniendo usuarios: ${error.message}`)
    }

    // Filtrar solo los usuarios solicitados
    const requestedUsers = users.users.filter(user => userIds.includes(user.id))
    const userEmails = requestedUsers.map(user => ({
      user_id: user.id,
      email: user.email
    }))

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