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

    console.log('🔍 Debug - Service role key length:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length || 0);

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

    // Verificar si el usuario ya existe usando la API de administración
    let existingUser = null;
    try {
      console.log('🔍 Debug - Checking if user exists in Auth:', invitation.email);
      const { data: userList, error: listError } = await supabaseServiceClient.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
      } else {
        existingUser = userList.users.find(u => u.email === invitation.email);
        console.log('🔍 Debug - User search result:', existingUser ? 'Found' : 'Not found');
      }
    } catch (error) {
      console.log('🔍 Debug - Error checking user existence:', error.message);
    }

    if (existingUser) {
      console.log('✅ User already exists in Auth:', existingUser.id);
      
      // Verificar si ya tiene un rol activo en esta empresa
      const { data: existingRole, error: roleCheckError } = await supabaseServiceClient
        .from('user_company_roles')
        .select('role, is_active')
        .eq('user_id', existingUser.id)
        .eq('company_id', invitation.company_id)
        .eq('is_active', true)
        .single();

      console.log('🔍 Debug - Role check result:', { existingRole, error: roleCheckError });

      if (existingRole && !roleCheckError) {
        throw new Error(`El usuario ${invitation.email} ya tiene un rol activo (${existingRole.role}) en esta empresa. No se puede enviar una nueva invitación.`);
      }
    } else {
      console.log('🔍 Debug - User does not exist in Auth, will create new user');
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
    
    // Crear el usuario en Supabase Auth si no existe
    let authUser = existingUser;
    if (!existingUser) {
      console.log('Creating new user in Supabase Auth:', invitation.email);
      const { data: newUser, error: createUserError } = await supabaseServiceClient.auth.admin.createUser({
        email: invitation.email,
        password: tempPassword,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          temp_user: true,
          first_name: invitation.first_name,
          last_name: invitation.last_name
        }
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        throw new Error(`Error creando usuario: ${createUserError.message}`);
      }

      authUser = newUser.user;
      console.log('User created successfully:', authUser.id);
    } else {
      // Si el usuario ya existe, actualizar la contraseña temporal
      console.log('Updating existing user password:', invitation.email);
      const { error: updatePasswordError } = await supabaseServiceClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          user_metadata: {
            temp_user: true,
            first_name: invitation.first_name,
            last_name: invitation.last_name
          }
        }
      );

      if (updatePasswordError) {
        console.error('Error updating user password:', updatePasswordError);
        throw new Error(`Error actualizando contraseña: ${updatePasswordError.message}`);
      }
    }
    
    // Generar URL de invitación
    console.log('Invitation token for URL:', invitation.token);
    const invitationUrl = `${Deno.env.get('FRONTEND_URL') || 'https://www.witar.es'}/accept-invitation?token=${invitation.token}`
    console.log('Generated invitation URL:', invitationUrl);
    
    // Crear contenido HTML mejorado para el email
    const emailContent = createEmailTemplate(invitation, company, invitationUrl)
    
    // Enviar email usando Resend
    const emailResult = await sendEmailWithResend(invitation.email, company, invitation, emailContent)
    
    if (!emailResult.success) {
      throw new Error(`Error enviando email: ${emailResult.error}`)
    }

    // Actualizar la invitación con las credenciales temporales usando el cliente de servicio
    const { error: updateError } = await supabaseServiceClient
      .from('invitations')
      .update({ 
        status: 'sent', // Cambiar a 'sent' cuando se envía el email
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
      invitationUrl: invitationUrl,
      company: company,
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

// Función para crear el template del email
function createEmailTemplate(invitation: any, company: any, invitationUrl: string): string {
  const roleDisplay = invitation.role === 'manager' ? 'Manager' : 
                     invitation.role === 'admin' ? 'Administrador' : 
                     invitation.role === 'employee' ? 'Empleado' : invitation.role;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación a Witar</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; background: #e9ecef; border-radius: 0 0 10px 10px; font-size: 12px; color: #6c757d; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">⏰ Witar</div>
                <h1>¡Has sido invitado!</h1>
            </div>
            
            <div class="content">
                <h2>Hola ${invitation.first_name || 'Usuario'},</h2>
                
                <p>Has sido invitado a unirte a <strong>${company?.name || 'una empresa'}</strong> en Witar como <strong>${roleDisplay}</strong>.</p>
                
                <div class="info-box">
                    <h3>📋 Detalles de la invitación:</h3>
                    <ul>
                        <li><strong>Empresa:</strong> ${company?.name || 'No especificada'}</li>
                        <li><strong>Rol:</strong> ${roleDisplay}</li>
                        <li><strong>Email:</strong> ${invitation.email}</li>
                        <li><strong>Expira:</strong> En 7 días</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${invitationUrl}" class="button">
                        ✅ Aceptar Invitación
                    </a>
                </div>
                
                <div class="info-box">
                    <h3>📝 Pasos para aceptar:</h3>
                    <ol>
                        <li>Haz clic en el botón "Aceptar Invitación"</li>
                        <li>Completa tu registro en Witar</li>
                        <li>Confirma que aceptas la invitación</li>
                        <li>¡Listo! Ya puedes usar el sistema</li>
                    </ol>
                </div>
                
                <p style="color: #6c757d; font-size: 14px;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                    <a href="${invitationUrl}" style="color: #007bff;">${invitationUrl}</a>
                </p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático de Witar. No respondas a este mensaje.</p>
                <p>Si tienes alguna pregunta, contacta con el administrador de tu empresa.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para enviar email con Resend
async function sendEmailWithResend(email: string, company: any, invitation: any, htmlContent: string): Promise<{success: boolean, error?: string, emailId?: string}> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    console.log('🔍 Debug - Starting email send process');
    console.log('🔍 Debug - Email:', email);
    console.log('🔍 Debug - Company:', company?.name);
    console.log('🔍 Debug - Role:', invitation.role);
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY no está configurada');
      return { success: false, error: 'RESEND_API_KEY no configurada' };
    }

    console.log('🔍 Debug - API Key found (length):', resendApiKey.length);

    const roleDisplay = invitation.role === 'manager' ? 'Manager' : 
                       invitation.role === 'admin' ? 'Administrador' : 
                       invitation.role === 'employee' ? 'Empleado' : invitation.role;

    const emailData = {
      from: 'Witar <noreply@updates.witar.es>', // Usar el subdominio verificado
      to: [email],
      subject: `Invitación a unirte a ${company?.name || 'una empresa'} en Witar`,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'invitation' },
        { name: 'company', value: company?.name || 'unknown' },
        { name: 'role', value: invitation.role }
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
      console.error('❌ Error sending email via Resend:', errorText);
      console.error('❌ Response status:', resendResponse.status);
      return { success: false, error: `Resend API error: ${resendResponse.status} - ${errorText}` };
    }

    const resendData = await resendResponse.json();
    console.log('✅ Email sent successfully via Resend:', resendData.id);
    
    return { success: true, emailId: resendData.id };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { success: false, error: error.message };
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
} 