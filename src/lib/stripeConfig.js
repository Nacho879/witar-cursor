import { loadStripe } from '@stripe/stripe-js';

// Variable para almacenar la instancia de Stripe (lazy loading)
let stripePromise = null;

// Función para cargar Stripe solo cuando sea necesario
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe('pk_live_51RdYTBLF7mZnvxIRlS2yzeYnvI7JFoJaTpbx8bWSagkq0WjKWlnSJcp4UjVG0Pw7WbfvrgToccOPmJGTihYyYto200IbQQ7qZX');
  }
  return stripePromise;
}

// Configuración de Stripe
export const stripeConfig = {
  // Configuración del plan
  plan: {
    pricePerEmployee: 1.50, // €1.50 por empleado
    employeeLimit: 25, // Límite del plan básico
    currency: 'eur',
  },

  // Configuración de checkout
  checkout: {
    mode: 'subscription',
    paymentMethodTypes: ['card'],
    successUrl: `${window.location.origin}/owner/billing?success=true`,
    cancelUrl: `${window.location.origin}/owner/billing?canceled=true`,
  },

  // Configuración del portal
  portal: {
    returnUrl: `${window.location.origin}/owner/billing`,
  },
};

// Función para formatear precios de Stripe (centavos a euros)
export function formatStripePrice(amountInCents) {
  return (amountInCents / 100).toFixed(2);
}

// Función para convertir euros a centavos para Stripe
export function convertToStripeAmount(amountInEuros) {
  return Math.round(amountInEuros * 100);
}

// Función para obtener el estado de la suscripción
export function getSubscriptionStatus(status) {
  switch (status) {
    case 'active':
      return { label: 'Activa', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'canceled':
      return { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'past_due':
      return { label: 'Pago pendiente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'incomplete':
      return { label: 'Incompleta', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    case 'incomplete_expired':
      return { label: 'Expirada', color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'trialing':
      return { label: 'En prueba', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'unpaid':
      return { label: 'Sin pagar', color: 'text-red-600', bgColor: 'bg-red-100' };
    default:
      return { label: 'Desconocido', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
} 