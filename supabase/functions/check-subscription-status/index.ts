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
    const body = await req.json()
    const { companyId } = body

    if (!companyId) {
      throw new Error('ID de empresa requerido')
    }

    // Cliente de servicio para operaciones de base de datos
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener información de la empresa (incluyendo el estado actual)
    const { data: company, error: companyError } = await supabaseServiceClient
      .from('companies')
      .select('id, name, created_at, status, blocked_at, blocked_reason')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error('Empresa no encontrada')
    }

    // IMPORTANTE: Si la empresa ya está activa manualmente, respetar ese estado
    // No bloquear empresas que fueron activadas manualmente
    if (company.status === 'active' && !company.blocked_at) {
      // Verificar si hay suscripción activa para mostrar el estado correcto
      let hasActiveSubscription = false
      try {
        const { data: tableExists } = await supabaseServiceClient
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'subscriptions')
          .maybeSingle()

        if (tableExists) {
          const { data: subscription } = await supabaseServiceClient
            .from('subscriptions')
            .select('id, status')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .maybeSingle()

          hasActiveSubscription = !!subscription
        }
      } catch (error) {
        console.log('Error verificando suscripción:', error.message)
      }

      return new Response(
        JSON.stringify({
          success: true,
          companyStatus: 'active',
          isBlocked: false,
          daysRemaining: 0,
          daysSinceCreation: 0,
          hasActiveSubscription,
          createdAt: company.created_at,
          companyName: company.name
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Calcular días desde la creación
    const createdAt = new Date(company.created_at)
    const now = new Date()
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    // Verificar si hay suscripción activa (solo si la tabla existe)
    let hasActiveSubscription = false
    try {
      // Verificar si la tabla subscriptions existe
      const { data: tableExists } = await supabaseServiceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'subscriptions')
        .maybeSingle()

      if (tableExists) {
        const { data: subscription, error: subscriptionError } = await supabaseServiceClient
          .from('subscriptions')
          .select('id, status, created_at')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .maybeSingle()

        hasActiveSubscription = subscription && !subscriptionError
      } else {
        console.log('Tabla subscriptions no existe, asumiendo período de prueba')
        hasActiveSubscription = false
      }
    } catch (error) {
      // Si hay cualquier error, asumir que no hay suscripción activa
      console.log('Error verificando suscripción, asumiendo período de prueba:', error.message)
      hasActiveSubscription = false
    }

    // Determinar estado de la empresa
    let companyStatus = 'active'
    let daysRemaining = 0
    let isBlocked = false

    if (!hasActiveSubscription) {
      if (daysSinceCreation >= 14) {
        companyStatus = 'blocked'
        isBlocked = true
        daysRemaining = 0
      } else {
        companyStatus = 'trial'
        daysRemaining = 14 - daysSinceCreation
      }
    }

    // Solo actualizar el estado si la empresa NO está activa manualmente
    // Si está activa manualmente, no la bloqueamos automáticamente
    if (isBlocked && company.status !== 'active') {
      await supabaseServiceClient
        .from('companies')
        .update({ 
          status: 'blocked',
          blocked_at: new Date().toISOString(),
          blocked_reason: 'Trial period expired - subscription required'
        })
        .eq('id', companyId)
    }

    const response = {
      success: true,
      companyStatus,
      isBlocked,
      daysRemaining,
      daysSinceCreation,
      hasActiveSubscription,
      createdAt: company.created_at,
      companyName: company.name
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
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
