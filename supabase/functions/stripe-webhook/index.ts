import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, supabase)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, supabase)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, supabase)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleCheckoutSessionCompleted(session: any, supabase: any) {
  console.log('Processing checkout.session.completed:', session.id)
  const companyId = session.metadata?.companyId
  const customerId = session.customer
  const employeeCount = parseInt(session.metadata?.employeeCount || '0')
  const billingEmployeeCount = parseInt(session.metadata?.billingEmployeeCount || '1')

  console.log('Session metadata:', { companyId, customerId, employeeCount, billingEmployeeCount })

  if (companyId && customerId) {
    const { error } = await supabase
      .from('companies')
      .update({
        stripe_customer_id: customerId,
        subscription_status: 'active',
        stripe_session_id: null,
        employee_limit: Math.max(employeeCount, 25), // Mínimo 25 empleados para el plan
        // Reactivar la empresa automáticamente cuando se completa el pago
        status: 'active',
        blocked_at: null,
        blocked_reason: null
      })
      .eq('id', companyId)

    if (error) {
      console.error('Error updating company:', error)
    } else {
      console.log('Company updated and reactivated successfully:', companyId)
    }
  } else {
    console.error('Missing companyId or customerId in session metadata')
  }
}

async function handleSubscriptionCreated(subscription: any, supabase: any) {
  console.log('Processing customer.subscription.created:', subscription.id)
  const companyId = subscription.metadata?.companyId
  const employeeCount = parseInt(subscription.metadata?.employeeCount || '0')
  const billingEmployeeCount = parseInt(subscription.metadata?.billingEmployeeCount || '1')

  console.log('Subscription metadata:', { companyId, employeeCount, billingEmployeeCount })

  if (companyId) {
    // Preparar actualización base
    const updateData: any = {
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      employee_limit: Math.max(employeeCount, 25), // Mínimo 25 empleados para el plan
      subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    }

    // Si la suscripción está activa, reactivar la empresa
    if (subscription.status === 'active') {
      updateData.status = 'active'
      updateData.blocked_at = null
      updateData.blocked_reason = null
    }

    const { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)

    if (error) {
      console.error('Error updating company subscription:', error)
    } else {
      console.log('Company subscription updated successfully:', companyId)
    }

    // Crear factura
    await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        stripe_invoice_id: subscription.latest_invoice,
        amount: subscription.items.data[0].price.unit_amount * subscription.items.data[0].quantity,
        currency: subscription.currency,
        status: 'paid',
        description: `Suscripción mensual - ${employeeCount} empleados`,
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  const companyId = subscription.metadata?.companyId
  const employeeCount = parseInt(subscription.metadata?.employeeCount || '0')

  if (companyId) {
    // Preparar actualización base
    const updateData: any = {
      subscription_status: subscription.status,
      employee_limit: employeeCount,
      subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    }

    // Si la suscripción está activa, reactivar la empresa
    if (subscription.status === 'active') {
      updateData.status = 'active'
      updateData.blocked_at = null
      updateData.blocked_reason = null
    }

    await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const companyId = subscription.metadata?.companyId

  if (companyId) {
    await supabase
      .from('companies')
      .update({
        subscription_status: 'canceled',
        stripe_subscription_id: null
      })
      .eq('id', companyId)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any, supabase: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const companyId = subscription.metadata?.companyId

  if (companyId) {
    // Reactivar la empresa cuando se paga una factura (por si acaso no se activó antes)
    await supabase
      .from('companies')
      .update({
        status: 'active',
        blocked_at: null,
        blocked_reason: null,
        subscription_status: 'active'
      })
      .eq('id', companyId)

    // Crear factura
    await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        description: `Factura mensual - ${invoice.lines.data[0].quantity} empleados`,
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString()
      })
  }
}

async function handleInvoicePaymentFailed(invoice: any, supabase: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const companyId = subscription.metadata?.companyId

  if (companyId) {
    await supabase
      .from('companies')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', companyId)
  }
}
