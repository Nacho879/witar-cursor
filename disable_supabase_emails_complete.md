# Desactivar Completamente los Emails de Supabase

## 🚨 IMPORTANTE: Pasos para desactivar emails automáticos de Supabase

### 1. **Dashboard de Supabase**
- Ve a: https://supabase.com/dashboard/project/kywzvqzcdwyrajxmtqus
- Navega a **Authentication** → **Settings**

### 2. **Desactivar Email Confirmations**
- En la sección **Email Auth**
- **Desactiva** "Enable email confirmations"
- **Guarda** los cambios

### 3. **Desactivar Email Templates**
- Ve a **Authentication** → **Email Templates**
- **Desactiva** todos los templates:
  - Confirm signup
  - Reset password
  - Magic Link
  - Change email address
  - Invite user

### 4. **Verificar Configuración**
- Asegúrate de que **NO** haya emails automáticos activados
- Solo debe funcionar Resend para los emails personalizados

### 5. **Probar Registro**
- Registra una nueva empresa
- Debe llegar **SOLO** el email de Resend
- **NO** debe llegar email de Supabase

## ✅ Resultado Esperado
- ✅ Solo email de Resend (bienvenida personalizada)
- ❌ NO email de Supabase (confirmación automática)
- ✅ URL correcta: https://www.witar.es/login
