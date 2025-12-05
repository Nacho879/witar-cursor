# Solución: Error de CORS con Supabase

## 🔴 Problema

Estás viendo este error en la consola:

```
Access to fetch at 'https://kywzvqzcdwyrajxmtqus.supabase.co/auth/v1/token?grant_type=refresh_token' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Este error indica que Supabase no está permitiendo peticiones desde tu aplicación local.

## ✅ Solución

### Paso 1: Configurar URLs permitidas en Supabase

1. Ve al [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **CORS**, agrega las siguientes URLs:

   **Para desarrollo local:**
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```

   **Para producción (cuando despliegues):**
   ```
   https://tu-dominio.com
   https://www.tu-dominio.com
   ```

5. Haz clic en **Save**

### Paso 2: Verificar variables de entorno

Asegúrate de que tu archivo `.env.local` (o `.env`) tenga las variables correctas:

```env
VITE_SUPABASE_URL=https://kywzvqzcdwyrajxmtqus.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

### Paso 3: Reiniciar el servidor de desarrollo

Después de configurar las URLs en Supabase:

```bash
# Detén el servidor (Ctrl+C)
# Reinicia el servidor
npm run dev
```

### Paso 4: Limpiar el caché del navegador

1. Abre las herramientas de desarrollador (F12)
2. Haz clic derecho en el botón de recargar
3. Selecciona **"Vaciar caché y volver a cargar de forma forzada"**

O simplemente:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) o `Cmd+Shift+R` (Mac)

## 🔍 Verificación

Después de seguir estos pasos:

1. Abre la consola del navegador (F12)
2. Intenta iniciar sesión
3. Los errores de CORS deberían desaparecer

## ⚠️ Nota importante

- El error de CORS es un problema de **configuración del servidor**, no del código
- Las URLs deben coincidir **exactamente** (incluyendo el protocolo `http://` o `https://`)
- Si usas un puerto diferente (no 5173), agrega esa URL también

## 🆘 Si el problema persiste

1. **Verifica que las URLs estén correctamente escritas** en el dashboard de Supabase
2. **Verifica que estés usando la URL correcta** de Supabase en tu `.env`
3. **Revisa la consola del navegador** para ver si hay otros errores
4. **Intenta en modo incógnito** para descartar problemas de caché

## 📝 Cambios realizados en el código

Se han realizado las siguientes mejoras:

1. **Mejorado el cliente de Supabase** (`src/lib/supabaseClient.js`):
   - Agregada validación de variables de entorno
   - Configurado `flowType: 'pkce'` para mejor seguridad
   - Agregadas opciones adicionales de autenticación
   - Creada función helper `isCorsError()` para detectar errores de CORS

2. **Mejorado el manejo de errores en Login** (`src/pages/auth/Login.jsx`):
   - Detección específica de errores de CORS
   - Mensajes de error más claros para el usuario
   - Mejor logging para debugging

3. **Mejorado el manejo de errores en TimeClockContext** (`src/contexts/TimeClockContext.jsx`):
   - Manejo silencioso de errores de CORS durante la inicialización
   - La aplicación no se bloquea cuando hay problemas de CORS
   - Mejor experiencia de usuario mientras se resuelve el problema de configuración

4. **Corregido el problema del CAPTCHA**:
   - Separados los estados de respuesta correcta y respuesta del usuario
   - Mejorada la validación del CAPTCHA

5. **Corregido el estado `loading`**:
   - Ahora se resetea correctamente en todos los casos

6. **Resuelto el warning de React Router**:
   - La future flag `v7_startTransition` ya estaba configurada correctamente

