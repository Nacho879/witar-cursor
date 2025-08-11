#!/usr/bin/env node

// Script para configurar Stripe
console.log('🔧 Configurando Stripe para Witar...\n');

const stripeConfig = {
  publishableKey: 'pk_test_51RdYTKPt3hfZSkyT5hhrBEXgAb9rNbQ72jOfCDTMorMPzAsA6PZA0vMiPiktIfGdy8rSQQwJvq5hekt0c0TqflQR00aq1N0bDE',
  secretKey: 'sk_test_51RdYTKPt3hfZSkyTNajUcL4TNWlw2KOIxQsYYhNWYKWTcoCtoeZCwFueJmerl54AI8kvnm5xvSKjPMexKXm3kyle0023W7Wf17',
  webhookUrl: 'https://kywzvqzcdwyrajxmtqus.supabase.co/functions/v1/stripe-webhook'
};

console.log('📋 CONFIGURACIÓN REQUERIDA:\n');

console.log('1️⃣ SUPABASE DASHBOARD:');
console.log('   Ve a: https://supabase.com/dashboard/project/kywzvqzcdwyrajxmtqus/settings/functions');
console.log('   Agrega esta variable de entorno:');
console.log(`   STRIPE_SECRET_KEY=${stripeConfig.secretKey}\n`);

console.log('2️⃣ VERCEL DASHBOARD:');
console.log('   Ve a: https://vercel.com/dashboard/project/witar-cursor/settings/environment-variables');
console.log('   Agrega esta variable de entorno:');
console.log(`   VITE_STRIPE_PUBLISHABLE_KEY=${stripeConfig.publishableKey}\n`);

console.log('3️⃣ STRIPE DASHBOARD:');
console.log('   Ve a: https://dashboard.stripe.com/webhooks');
console.log('   Crea un nuevo webhook con esta URL:');
console.log(`   ${stripeConfig.webhookUrl}`);
console.log('   Eventos a escuchar:');
console.log('   - checkout.session.completed');
console.log('   - customer.subscription.created');
console.log('   - customer.subscription.updated');
console.log('   - customer.subscription.deleted');
console.log('   - invoice.payment_succeeded');
console.log('   - invoice.payment_failed\n');

console.log('4️⃣ TARJETAS DE PRUEBA:');
console.log('   Número: 4242 4242 4242 4242');
console.log('   Fecha: Cualquier fecha futura');
console.log('   CVC: Cualquier 3 dígitos');
console.log('   Código postal: Cualquier código\n');

console.log('✅ Una vez configurado, el sistema de pagos estará completamente funcional!');
console.log('🌐 URL de producción: https://witar-cursor-l548ro27s-nachos-projects-9e724aa3.vercel.app'); 