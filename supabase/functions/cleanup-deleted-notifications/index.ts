// Edge Function para limpiar notificaciones borradas mayores a 15 días
// Se puede ejecutar manualmente o configurar como cron job

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ejecutar función de limpieza
    const { data, error } = await supabaseAdmin.rpc('cleanup_old_deleted_notifications')

    if (error) {
      console.error('Error cleaning up deleted notifications:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          deleted_count: 0
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const deletedCount = data || 0

    console.log(`✅ Cleaned up ${deletedCount} deleted notifications older than 15 days`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: deletedCount,
        message: `Se eliminaron ${deletedCount} notificaciones del historial`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        deleted_count: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

