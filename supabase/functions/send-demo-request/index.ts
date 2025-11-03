import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Demo request function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { nombre, empresa, email, telefono, empleados, interes, mensaje } = body

    if (!nombre || !empresa || !email) {
      console.warn('Validation error: missing fields', { nombre, empresa, email })
      return new Response(
        JSON.stringify({ success: false, error: 'Nombre, empresa y email son requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('Sending demo request email to ilopez@witar.es')

    const emailResult = await sendDemoRequestWithResend({
      nombre,
      empresa,
      email,
      telefono: telefono || 'No proporcionado',
      empleados: empleados || 'No especificado',
      interes: interes || 'No especificado',
      mensaje: mensaje || 'Sin mensaje adicional'
    })
    
    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error)
      return new Response(
        JSON.stringify({ success: false, error: emailResult.error || 'Fallo enviando email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const response = {
      success: true,
      message: 'Solicitud de demo enviada exitosamente',
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
      JSON.stringify({ success: false, error: error.message || 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})

// Función para enviar email de solicitud de demo con Resend
async function sendDemoRequestWithResend(data: {
  nombre: string,
  empresa: string,
  email: string,
  telefono: string,
  empleados: string,
  interes: string,
  mensaje: string
}): Promise<{success: boolean, error?: string, emailId?: string}> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    console.log('🔍 Debug - Starting demo request email send process');
    console.log('🔍 Debug - Data:', data);
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY no está configurada');
      return { success: false, error: 'RESEND_API_KEY no configurada' };
    }

    console.log('🔍 Debug - API Key found (length):', resendApiKey.length);

    const htmlContent = createDemoRequestEmailTemplate(data);

    // TEMPORAL: Resend solo permite enviar a tu email registrado (ignaseblopez@gmail.com) en modo prueba
    // Para enviar a ilopez@witar.es, necesitas verificar un dominio en Resend (resend.com/domains)
    // Una vez verificado, cambia el destinatario a ['ilopez@witar.es'] y el from a tu dominio verificado
    const emailData = {
      from: 'Witar <onboarding@resend.dev>', // Dominio de desarrollo de Resend (no requiere verificación)
      to: ['ignaseblopez@gmail.com'], // TEMPORAL: Cambiar a ['ilopez@witar.es'] cuando verifiques el dominio
      subject: `Nueva solicitud de demo - ${data.empresa}`,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'demo_request' },
        { name: 'company', value: data.empresa },
        { name: 'employees', value: data.empleados }
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
      console.error('❌ Error sending demo request email via Resend:', errorText);
      console.error('❌ Response status:', resendResponse.status);
      return { success: false, error: `Resend API error: ${resendResponse.status} - ${errorText}` };
    }

    const resendData = await resendResponse.json();
    console.log('✅ Demo request email sent successfully via Resend:', resendData.id);
    
    return { success: true, emailId: resendData.id };
    
  } catch (error) {
    console.error('❌ Error sending demo request email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { success: false, error: error.message };
  }
}

// Función para crear el template del email de solicitud de demo
function createDemoRequestEmailTemplate(data: {
  nombre: string,
  empresa: string,
  email: string,
  telefono: string,
  empleados: string,
  interes: string,
  mensaje: string
}): string {
  const interesLabels: Record<string, string> = {
    'control-horario': 'Control horario',
    'vacaciones': 'Gestión de vacaciones',
    'documentos': 'Documentos laborales',
    'reportes': 'Reportes y analytics',
    'equipo': 'Gestión de equipos',
    'general': 'Funcionalidades generales'
  };

  const interesDisplay = interesLabels[data.interes] || data.interes;

  // Paleta (copiada de src/styles/globals.css - modo claro)
  const colors = {
    background: 'hsl(210 60% 99%)',
    foreground: 'hsl(210 31% 20%)',
    card: '#ffffff',
    primary: 'hsl(213 27% 36%)',
    primaryDark: 'hsl(215 28% 26%)',
    primaryFg: 'hsl(0 0% 100%)',
    cta: 'hsl(12 100% 67%)',
    ctaFg: 'hsl(0 0% 100%)',
    muted: 'hsl(214 67% 95%)',
    mutedFg: 'hsl(216 16% 44%)',
    success: 'hsl(165 100% 39%)',
    successFg: 'hsl(0 0% 100%)',
    border: 'hsl(215 33% 90%)'
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Solicitud de Demo - Witar</title>
  <style>
    /* Reset básico */
    body { margin: 0; padding: 0; background: ${colors.background}; color: ${colors.foreground}; }
    table { border-collapse: collapse; }
    a { color: inherit; }

    /* Layout */
    .container { max-width: 640px; margin: 0 auto; padding: 16px; }
    .card { background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
    .header { text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%); color: ${colors.primaryFg}; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: 0.3px; }
    .title { margin: 8px 0 0 0; font-size: 22px; font-weight: 700; }

    .content { padding: 28px; }
    .section-title { margin: 0 0 12px 0; color: ${colors.primary}; font-size: 16px; font-weight: 700; }
    .info-box { border: 1px solid ${colors.border}; border-radius: 14px; padding: 16px; background: ${colors.card}; }
    .row { display: block; padding: 12px 0; border-bottom: 1px solid ${colors.border}; }
    .row:last-child { border-bottom: none; }
    .label { display:block; color: ${colors.mutedFg}; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .3px; }
    .value { color: ${colors.foreground}; font-size: 15px; }

    .highlight { background: ${colors.muted}; border: 1px solid ${colors.border}; color: ${colors.foreground}; border-radius: 14px; padding: 14px 16px; }

    .next-steps { background: hsl(145 60% 96%); border-left: 4px solid ${colors.success}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 14px 16px; }
    .next-steps h3 { margin: 0 0 8px 0; color: ${colors.success}; font-size: 15px; }
    .next-steps ol { margin: 0; padding-left: 18px; color: ${colors.foreground}; }

    .btn { display: inline-block; background: ${colors.cta}; color: ${colors.ctaFg}; padding: 12px 20px; text-decoration: none; border-radius: 12px; font-weight: 700; }

    .footer { text-align: center; padding: 18px; color: ${colors.mutedFg}; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">⏰ Witar</div>
        <div class="title">Nueva solicitud de demo</div>
      </div>
      <div class="content">
        <div class="highlight" style="margin-bottom: 16px;">
          <strong>🎯 Solicitud enviada desde witar.es/demo</strong>
        </div>

        <div class="section-title">Información de contacto</div>
        <div class="info-box" style="margin-bottom: 16px;">
          <div class="row">
            <span class="label">Nombre completo</span>
            <span class="value">${data.nombre}</span>
          </div>
          <div class="row">
            <span class="label">Empresa</span>
            <span class="value">${data.empresa}</span>
          </div>
          <div class="row">
            <span class="label">Email</span>
            <span class="value"><a href="mailto:${data.email}">${data.email}</a></span>
          </div>
          <div class="row">
            <span class="label">Teléfono</span>
            <span class="value">${data.telefono}</span>
          </div>
          <div class="row">
            <span class="label">Número de empleados</span>
            <span class="value">${data.empleados}</span>
          </div>
          <div class="row">
            <span class="label">Principal interés</span>
            <span class="value"><strong>${interesDisplay}</strong></span>
          </div>
        </div>

        ${data.mensaje && data.mensaje.trim() && data.mensaje !== 'Sin mensaje adicional' ? `
        <div class="section-title">Mensaje adicional</div>
        <div class="info-box" style="margin-bottom: 16px;">
          <div class="value" style="white-space: pre-wrap;">${data.mensaje}</div>
        </div>
        ` : ''}

        <div class="next-steps" style="margin-bottom: 20px;">
          <h3>📞 Próximos pasos</h3>
          <ol>
            <li>Contactar al cliente en las próximas 24 horas</li>
            <li>Responder al email: <a href="mailto:${data.email}">${data.email}</a></li>
            <li>Programar demo personalizada de 30 minutos</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 18px 0 6px;">
          <a class="btn" href="mailto:${data.email}?subject=Demo%20Witar%20-%20${encodeURIComponent(data.empresa)}">📧 Responder al cliente</a>
        </div>
      </div>
      <div class="footer">
        Solicitud recibida el ${new Date().toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}