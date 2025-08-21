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
    console.log('Starting stripe-checkout function')
    
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )
    
    // Verificar que el usuario está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }
    
    console.log('User authenticated:', user.id)

    const body = await req.json()
    console.log('Received body:', body)
    
    const { companyId, employeeCount } = body
    console.log('Extracted parameters:', { companyId, employeeCount })

    if (!companyId) {
      throw new Error('Missing required parameter: companyId')
    }
    
    if (employeeCount === undefined || employeeCount === null || employeeCount < 0) {
      throw new Error('Missing or invalid required parameter: employeeCount (must be >= 0)')
    }

    // Verificar que la empresa existe
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error('Company not found')
    }

    console.log('Company found:', company.name)

    // Usar un billing employee count mínimo de 1
    const billingEmployeeCount = Math.max(employeeCount, 1)
    console.log('Billing employee count:', billingEmployeeCount)

    // Buscar o crear el producto Witar
    let product
    try {
      const products = await stripe.products.list({ limit: 100 })
      product = products.data.find(p => p.name === 'Plan Witar')
      
      if (!product) {
        console.log('Creating new Witar product')
        product = await stripe.products.create({
          name: 'Plan Witar',
          description: 'Plan de gestión de recursos humanos',
        })
      } else {
        console.log('Using existing Witar product:', product.id)
      }
    } catch (error) {
      console.error('Error with product:', error)
      throw new Error('Error creating/finding product')
    }

    // Buscar o crear el precio
    let price
    try {
      const prices = await stripe.prices.list({ 
        product: product.id,
        limit: 100 
      })
      price = prices.data.find(p => 
        p.unit_amount === 150 && 
        p.currency === 'eur' && 
        p.recurring?.interval === 'month'
      )
      
      if (!price) {
        console.log('Creating new price for Witar product')
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 150, // 1.50€ en centavos
          currency: 'eur',
          recurring: {
            interval: 'month',
          },
        })
      } else {
        console.log('Using existing price:', price.id)
      }
    } catch (error) {
      console.error('Error with price:', error)
      throw new Error('Error creating/finding price')
    }

    console.log('Creating checkout session...')
    
    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: billingEmployeeCount,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/owner/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/owner/billing?canceled=true`,
      metadata: {
        companyId,
        employeeCount: employeeCount.toString(),
        billingEmployeeCount: billingEmployeeCount.toString(),
      },
      subscription_data: {
        metadata: {
          companyId,
          employeeCount: employeeCount.toString(),
          billingEmployeeCount: billingEmployeeCount.toString(),
        },
      },
    })

    console.log('Checkout session created:', session.id)

    // Actualizar la empresa con el ID de la sesión
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        stripe_session_id: session.id,
        subscription_status: 'pending'
      })
      .eq('id', companyId)

    if (updateError) {
      console.error('Error updating company:', updateError)
      // No lanzamos error aquí porque la sesión ya se creó
    }

    console.log('Company updated successfully')

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in stripe-checkout:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
