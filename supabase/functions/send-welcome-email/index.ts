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
    console.log('Welcome email function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { email, fullName, companyName } = body

    if (!email || !fullName || !companyName) {
      throw new Error('Email, nombre completo y nombre de empresa son requeridos')
    }

    console.log('Sending welcome email to:', email)

    // Cliente de servicio para operaciones de base de datos
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Enviar email de bienvenida usando Resend
    const emailResult = await sendWelcomeEmailWithResend(email, fullName, companyName)
    
    if (!emailResult.success) {
      throw new Error(`Error enviando email de bienvenida: ${emailResult.error}`)
    }

    const response = {
      success: true,
      message: 'Email de bienvenida enviado exitosamente',
      email: email,
      emailId: emailResult.emailId
    }

    console.log('Returning success response:', response)

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

// Función para enviar email de bienvenida con Resend
async function sendWelcomeEmailWithResend(email: string, fullName: string, companyName: string): Promise<{success: boolean, error?: string, emailId?: string}> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    console.log('🔍 Debug - Starting welcome email send process');
    console.log('🔍 Debug - Email:', email);
    console.log('🔍 Debug - Full Name:', fullName);
    console.log('🔍 Debug - Company:', companyName);
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY no está configurada');
      return { success: false, error: 'RESEND_API_KEY no configurada' };
    }

    console.log('🔍 Debug - API Key found (length):', resendApiKey.length);

    const htmlContent = createWelcomeEmailTemplate(fullName, companyName);

    const emailData = {
      from: 'Witar <noreply@updates.witar.es>',
      to: [email],
      subject: `¡Bienvenido a Witar, ${fullName}!`,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'welcome' },
        { name: 'company', value: companyName },
        { name: 'role', value: 'owner' }
      ]
    };

    console.log('🔍 Debug - Email data prepared:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      tags: emailData.tags
    });

    console.log('🔍 Debug - Sending request to Resend API...');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    console.log('🔍 Debug - Resend response status:', resendResponse.status);
    console.log('🔍 Debug - Resend response headers:', Object.fromEntries(resendResponse.headers.entries()));

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('❌ Error sending welcome email via Resend:', errorText);
      console.error('❌ Response status:', resendResponse.status);
      return { success: false, error: `Resend API error: ${resendResponse.status} - ${errorText}` };
    }

    const resendData = await resendResponse.json();
    console.log('✅ Welcome email sent successfully via Resend:', resendData.id);
    
    return { success: true, emailId: resendData.id };
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { success: false, error: error.message };
  }
}

// Función para crear el template del email de bienvenida
function createWelcomeEmailTemplate(fullName: string, companyName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenido a Witar!</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; background: #e9ecef; border-radius: 0 0 10px 10px; font-size: 12px; color: #6c757d; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">⏰ Witar</div>
                <h1>¡Bienvenido a Witar!</h1>
            </div>
            
            <div class="content">
                <h2>¡Hola ${fullName}!</h2>
                
                <p>¡Felicitaciones! Tu cuenta de empresa <strong>${companyName}</strong> ha sido creada exitosamente en Witar.</p>
                
                <div class="info-box">
                    <h3>🎉 ¡Tu empresa está lista!</h3>
                    <p>Como propietario de la empresa, ahora puedes:</p>
                    <ul>
                        <li>✅ Invitar empleados y managers</li>
                        <li>✅ Configurar horarios de trabajo</li>
                        <li>✅ Gestionar departamentos</li>
                        <li>✅ Ver reportes y estadísticas</li>
                        <li>✅ Configurar notificaciones</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="https://www.witar.es/login" class="button">
                        🚀 Acceder a Witar
                    </a>
                </div>
                
                <div class="info-box">
                    <h3>📋 Próximos pasos recomendados:</h3>
                    <ol>
                        <li><strong>Confirma tu email:</strong> Revisa tu bandeja de entrada y confirma tu dirección de email</li>
                        <li><strong>Configura tu empresa:</strong> Personaliza la configuración de tu empresa</li>
                        <li><strong>Invita a tu equipo:</strong> Comienza invitando a tus primeros empleados</li>
                        <li><strong>Explora las funciones:</strong> Familiarízate con todas las herramientas disponibles</li>
                    </ol>
                </div>
                
                <p>
                    <strong>¿Necesitas ayuda?</strong> Nuestro equipo de soporte está aquí para ayudarte.<br>
                    Puedes contactarnos en cualquier momento.
                </p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático de Witar. No respondas a este mensaje.</p>
                <p>Si tienes alguna pregunta, contacta con nuestro equipo de soporte.</p>
            </div>
        </div>
    </body>
    </html>
  `;
} 