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
    console.log('Resend webhook received')
    
    // Verificar que es un webhook de Resend
    const signature = req.headers.get('resend-signature')
    if (!signature) {
      console.error('No Resend signature found')
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    console.log('Webhook body:', body)

    // Cliente de servicio para operaciones de base de datos
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Procesar diferentes tipos de eventos
    const eventType = body.type
    const emailId = body.data?.id

    console.log('Processing event:', eventType, 'for email:', emailId)

    switch (eventType) {
      case 'email.delivered':
        await handleEmailDelivered(supabaseServiceClient, body.data)
        break
      
      case 'email.opened':
        await handleEmailOpened(supabaseServiceClient, body.data)
        break
      
      case 'email.clicked':
        await handleEmailClicked(supabaseServiceClient, body.data)
        break
      
      case 'email.bounced':
        await handleEmailBounced(supabaseServiceClient, body.data)
        break
      
      case 'email.complained':
        await handleEmailComplained(supabaseServiceClient, body.data)
        break
      
      default:
        console.log('Unhandled event type:', eventType)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
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

// Función para manejar emails entregados
async function handleEmailDelivered(supabase: any, data: any) {
  console.log('Email delivered:', data.id)
  
  // Aquí podrías actualizar una tabla de logs de emails
  // Por ahora solo logueamos el evento
  try {
    await supabase
      .from('email_logs')
      .insert({
        email_id: data.id,
        event_type: 'delivered',
        recipient: data.to,
        timestamp: new Date().toISOString(),
        metadata: data
      })
  } catch (error) {
    console.error('Error logging email delivery:', error)
  }
}

// Función para manejar emails abiertos
async function handleEmailOpened(supabase: any, data: any) {
  console.log('Email opened:', data.id)
  
  try {
    await supabase
      .from('email_logs')
      .insert({
        email_id: data.id,
        event_type: 'opened',
        recipient: data.to,
        timestamp: new Date().toISOString(),
        metadata: data
      })
  } catch (error) {
    console.error('Error logging email open:', error)
  }
}

// Función para manejar clicks en emails
async function handleEmailClicked(supabase: any, data: any) {
  console.log('Email clicked:', data.id)
  
  try {
    await supabase
      .from('email_logs')
      .insert({
        email_id: data.id,
        event_type: 'clicked',
        recipient: data.to,
        timestamp: new Date().toISOString(),
        metadata: data
      })
  } catch (error) {
    console.error('Error logging email click:', error)
  }
}

// Función para manejar emails rebotados
async function handleEmailBounced(supabase: any, data: any) {
  console.log('Email bounced:', data.id)
  
  try {
    await supabase
      .from('email_logs')
      .insert({
        email_id: data.id,
        event_type: 'bounced',
        recipient: data.to,
        timestamp: new Date().toISOString(),
        metadata: data
      })
  } catch (error) {
    console.error('Error logging email bounce:', error)
  }
}

// Función para manejar quejas de spam
async function handleEmailComplained(supabase: any, data: any) {
  console.log('Email complained:', data.id)
  
  try {
    await supabase
      .from('email_logs')
      .insert({
        email_id: data.id,
        event_type: 'complained',
        recipient: data.to,
        timestamp: new Date().toISOString(),
        metadata: data
      })
  } catch (error) {
    console.error('Error logging email complaint:', error)
  }
} 