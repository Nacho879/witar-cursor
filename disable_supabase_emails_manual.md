# Desactivar Emails Automáticos de Supabase

## Pasos Manuales:

### 1. Ir al Dashboard de Supabase
- Ve a https://supabase.com/dashboard
- Selecciona tu proyecto

### 2. Configuración de Authentication
- Ve a **Authentication** → **Settings**
- Busca la sección **Email Templates**

### 3. Desactivar Confirmación de Email
- En **Confirm signup** → Desactiva la opción
- O cambia el template para que no envíe emails

### 4. Configuración de Signup
- En **Auth Settings** → **Enable email confirmations**
- Desactiva esta opción

### 5. Verificar Configuración
- Asegúrate de que **"Enable email confirmations"** esté en **OFF**
- Guarda los cambios

## Alternativa: Usar Variables de Entorno

Si las opciones anteriores no funcionan, puedes configurar estas variables de entorno en tu proyecto:

```bash
SUPABASE_AUTH_ENABLE_SIGNUP=false
SUPABASE_AUTH_ENABLE_CONFIRMATIONS=false
```

## Verificar Cambios

Después de hacer los cambios:
1. Registra un nuevo owner
2. Verifica que NO llegue email de Supabase
3. Solo debe llegar el email de Resend 