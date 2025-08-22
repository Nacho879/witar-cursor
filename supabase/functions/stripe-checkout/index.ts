import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
})

// Configuración de CORS más segura
const allowedOrigins = [
  'https://www.witar.es',
  'https://witar.es',
  'https://witar-cursor.vercel.app',
  'http://localhost:5173', // Para desarrollo local
  'http://localhost:3000'  // Para desarrollo local
];

function getCorsHeaders(origin: string | null) {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  try {
    console.log('Starting stripe-checkout function')
    
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
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
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
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
    
    if (employeeCount === undefined || employeeCount === null ||
        employeeCount < 0 || employeeCount > 1000) {
      throw new Error('Invalid employeeCount parameter')
    }

    // Verificar que el usuario pertenece a la empresa
    const { data: userRole, error: roleError } = await supabase
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (roleError || !userRole) {
      throw new Error('User not authorized for this company')
    }

    // Solo owners y admins pueden crear suscripciones
    if (!['owner', 'admin'].includes(userRole.role)) {
      throw new Error('Only owners and admins can create subscriptions')
    }

    // Calcular precio basado en número de empleados
    const pricePerEmployee = 1.50; // €1.50 por empleado
    const totalPrice = employeeCount * pricePerEmployee * 100; // Convertir a centavos

    // Buscar o crear producto en Stripe
    let product;
    const { data: products } = await stripe.products.list({ limit: 100 })
    product = products.data.find(p => p.name === 'Witar Plan')

    if (!product) {
      product = await stripe.products.create({
        name: 'Witar Plan',
        description: 'Plan de gestión de recursos humanos por empleado',
      })
    }

    // Buscar o crear precio en Stripe
    let price;
    const { data: prices } = await stripe.prices.list({
      product: product.id,
      active: true,
    })

    price = prices.find(p => p.unit_amount === totalPrice && p.currency === 'eur')

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: totalPrice,
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
      })
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('FRONTEND_URL') || 'https://www.witar.es'}/owner/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL') || 'https://www.witar.es'}/owner/billing?canceled=true`,
      metadata: {
        companyId,
        employeeCount: employeeCount.toString(),
        billingEmployeeCount: employeeCount.toString(),
      },
    })

    // Actualizar empresa con session ID
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        stripe_session_id: session.id,
        employee_limit: Math.max(employeeCount, 25), // Mínimo 25 empleados
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)

    if (updateError) {
      console.error('Error updating company:', updateError)
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in stripe-checkout:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
