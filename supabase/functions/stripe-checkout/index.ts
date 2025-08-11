import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { companyId, employeeCount } = await req.json()

    if (!companyId || !employeeCount) {
      throw new Error('Missing required parameters')
    }

    // Calcular precio (1,50€ por empleado)
    const unitPrice = 150 // 1.50€ en centavos
    const totalPrice = employeeCount * unitPrice

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Plan Witar - ${employeeCount} empleados`,
              description: `Plan de gestión de recursos humanos para ${employeeCount} empleados`,
            },
            unit_amount: unitPrice,
          },
          quantity: employeeCount,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/owner/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/owner/billing?canceled=true`,
      metadata: {
        companyId,
        employeeCount: employeeCount.toString(),
      },
      subscription_data: {
        metadata: {
          companyId,
          employeeCount: employeeCount.toString(),
        },
      },
    })

    // Actualizar la empresa con el ID de la sesión
    await supabase
      .from('companies')
      .update({ 
        stripe_session_id: session.id,
        subscription_status: 'pending'
      })
      .eq('id', companyId)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
