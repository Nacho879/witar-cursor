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

    const { companyId } = await req.json()

    if (!companyId) {
      throw new Error('Missing required parameter: companyId')
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

    // Solo owners y admins pueden acceder al portal
    if (!['owner', 'admin'].includes(userRole.role)) {
      throw new Error('Only owners and admins can access billing portal')
    }

    // Obtener información de la empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error('Company not found')
    }

    if (!company.stripe_customer_id) {
      throw new Error('No Stripe customer found')
    }

    // Crear sesión del portal de facturación
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${Deno.env.get('FRONTEND_URL') || 'https://www.witar.es'}/owner/billing`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in stripe-portal:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
