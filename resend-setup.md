# Configuración de Resend con Supabase

## 📧 Configuración de Resend para Witar

### 1. Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta gratuita
3. Verifica tu email

### 2. Obtener API Key

1. En el dashboard de Resend, ve a "API Keys"
2. Crea una nueva API Key
3. Copia la clave (empieza con `re_`)

### 3. Configurar dominio (Opcional pero recomendado)

1. Ve a "Domains" en Resend
2. Agrega tu dominio (ej: `witar.es`)
3. Configura los registros DNS según las instrucciones
4. Espera a que se verifique (puede tomar hasta 24 horas)

### 4. Configurar variables de entorno en Supabase

```bash
# Configurar la API Key de Resend
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui

# Verificar que se configuró correctamente
supabase secrets list
```

### 5. Configurar variables de entorno adicionales

```bash
# URL del frontend
supabase secrets set FRONTEND_URL=https://www.witar.es

# Verificar todas las variables
supabase secrets list
```

### 6. Desplegar las funciones

```bash
# Desplegar todas las funciones
supabase functions deploy

# O desplegar solo la función de email
supabase functions deploy send-invitation-email
```

### 7. Probar la configuración

1. Ve al dashboard de Resend
2. En "Logs" podrás ver los emails enviados
3. En "Analytics" verás estadísticas de entrega

## 🔧 Configuración alternativa para desarrollo

Si no tienes un dominio verificado, puedes usar el dominio de Resend:

```typescript
// En send-invitation-email/index.ts, cambiar esta línea:
from: 'Witar <onboarding@resend.dev>', // Para desarrollo
// Por:
from: 'Witar <noreply@witar.es>', // Para producción
```

## 📊 Monitoreo y logs

### Ver logs de las funciones de Supabase:
```bash
supabase functions logs send-invitation-email --follow
```

### Ver logs de Resend:
- Dashboard de Resend → Logs
- Puedes ver el estado de cada email enviado

## 🚨 Troubleshooting

### Error: "RESEND_API_KEY no configurada"
```bash
# Verificar que la variable está configurada
supabase secrets list | grep RESEND
```

### Error: "Domain not verified"
- Usa `onboarding@resend.dev` para desarrollo
- Verifica tu dominio en Resend para producción

### Error: "Rate limit exceeded"
- Resend tiene límites de 100 emails/día en el plan gratuito
- Considera actualizar a un plan pagado para más volumen

## 📈 Métricas importantes

- **Delivery Rate**: Porcentaje de emails entregados
- **Open Rate**: Porcentaje de emails abiertos
- **Click Rate**: Porcentaje de clicks en enlaces
- **Bounce Rate**: Porcentaje de emails rebotados

## 🔒 Seguridad

- Nunca compartas tu API Key
- Usa variables de entorno para configurar
- Monitorea los logs regularmente
- Configura webhooks para notificaciones de eventos 