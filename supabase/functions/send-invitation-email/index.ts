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
    console.log('Function started')
    
    const body = await req.json()
    console.log('Request body:', body)
    
    const { invitationId } = body

    if (!invitationId) {
      throw new Error('ID de invitación requerido')
    }

    console.log('Looking for invitation:', invitationId)

    // Cliente anónimo para verificar autenticación
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Cliente de servicio para operaciones de base de datos y auth
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    console.log('User authenticated:', user.id)

    // Obtener la invitación con información básica usando el cliente de servicio
    const { data: invitation, error: invitationError } = await supabaseServiceClient
      .from('invitations')
      .select('id, email, status, role, company_id, first_name, last_name, token')
      .eq('id', invitationId)
      .single()

    console.log('Invitation query result:', { invitation, error: invitationError })

    if (invitationError) {
      throw new Error(`Error obteniendo invitación: ${invitationError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitación no encontrada')
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitación no está pendiente. Estado actual: ${invitation.status}`)
    }

    // Obtener información de la empresa
    const { data: company, error: companyError } = await supabaseServiceClient
      .from('companies')
      .select('id, name, slug')
      .eq('id', invitation.company_id)
      .single()

    if (companyError) {
      console.error('Error getting company:', companyError)
    }

    // Generar credenciales temporales
    const tempPassword = generateTempPassword()
    console.log('Generated temp password for:', invitation.email)
    
    // Generar URL de invitación
    console.log('Invitation token for URL:', invitation.token);
    const invitationUrl = `${Deno.env.get('FRONTEND_URL') || 'https://www.witar.es'}/accept-invitation?token=${invitation.token}`
    console.log('Generated invitation URL:', invitationUrl);
    
    // Enviar email usando Resend o similar
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Has sido invitado a unirte a ${company?.name || 'una empresa'}!</h2>
        
        <p>Hola ${invitation.first_name || 'Usuario'},</p>
        
        <p>Has sido invitado a unirte a <strong>${company?.name || 'una empresa'}</strong> en Witar como <strong>${invitation.role}</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Para aceptar la invitación:</h3>
          <ol>
            <li>Haz clic en el botón de abajo</li>
            <li>Regístrate o inicia sesión en Witar</li>
            <li>Confirma que aceptas la invitación</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Aceptar Invitación
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${invitationUrl}">${invitationUrl}</a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Esta invitación expira en 7 días.<br>
          Si tienes alguna pregunta, contacta con el administrador de tu empresa.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Este es un email automático de Witar. No respondas a este mensaje.
        </p>
      </div>
    `

             // Enviar email usando Resend
         try {
           const resendResponse = await fetch('https://api.resend.com/emails', {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({
               from: 'Witar <onboarding@resend.dev>',
               to: ['ignaseblopez@gmail.com'], // Email verificado para pruebas
               subject: `Invitación a unirte a ${company?.name || 'una empresa'} en Witar`,
               html: emailContent,
             }),
           })

           if (!resendResponse.ok) {
             const errorText = await resendResponse.text()
             console.error('Error sending email via Resend:', errorText)
             throw new Error(`Error enviando email: ${resendResponse.status}`)
           }

           const resendData = await resendResponse.json()
           console.log('Email sent successfully via Resend:', resendData.id)
         } catch (emailError) {
           console.error('Error sending email:', emailError)
           // Por ahora, solo logueamos el email (en producción usarías un servicio de email)
           console.log('Email content:', emailContent)
           console.log('Invitation URL:', invitationUrl)
         }

    // Actualizar la invitación con las credenciales temporales usando el cliente de servicio
    const { error: updateError } = await supabaseServiceClient
      .from('invitations')
      .update({ 
        status: 'pending', // Mantener como pendiente hasta que el usuario se registre
        sent_at: new Date().toISOString(),
        temp_password: tempPassword
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      throw new Error(`Error actualizando invitación: ${updateError.message}`)
    }

    console.log('Invitation updated successfully')

    const response = {
      success: true,
      message: 'Invitación enviada exitosamente',
      email: invitation.email,
      tempPassword: tempPassword,
      invitationUrl: `${Deno.env.get('FRONTEND_URL') || 'https://witar-cursor.vercel.app'}/login`,
      company: company
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

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
} 