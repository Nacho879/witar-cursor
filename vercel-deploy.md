# 🚀 **DEPLOY EN VERCEL - Pasos para Actualizar**

## 🔄 **Forzar Nuevo Deploy**

### **Opción 1: Desde Vercel Dashboard**
1. Ve a **vercel.com/dashboard**
2. Selecciona tu proyecto **witar**
3. Ve a **Deployments**
4. Haz clic en **"Redeploy"** en el último deployment
5. O crea un **nuevo deployment** desde GitHub

### **Opción 2: Desde Terminal**
```bash
# En tu directorio local
git add .
git commit -m "Fix timeclock state persistence"
git push origin main
```

### **Opción 3: Deploy Manual**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy manual
vercel --prod
```

## 🧹 **Limpiar Caché**

### **1. Limpiar Caché de Vercel**
- En el dashboard de Vercel
- Ve a **Settings** → **Functions**
- Haz clic en **"Clear Cache"**

### **2. Limpiar Caché del Navegador**
- **Ctrl + Shift + R** (Windows/Linux)
- **Cmd + Shift + R** (Mac)
- O abre en **modo incógnito**

### **3. Verificar Variables de Entorno**
- En Vercel Dashboard → **Settings** → **Environment Variables**
- Verifica que todas las variables estén configuradas

## 🔍 **Verificar Deploy**

### **1. Verificar Build Logs**
- En Vercel Dashboard → **Deployments**
- Revisa los **build logs** para errores
- Verifica que el build sea exitoso

### **2. Verificar Archivos**
- Verifica que los archivos nuevos estén en el deploy
- Revisa que `src/contexts/TimeClockContext.jsx` esté actualizado
- Verifica que `src/components/GlobalFloatingTimeClock.jsx` esté actualizado

### **3. Verificar en Producción**
- Abre **witar.es** en modo incógnito
- Abre **DevTools** (F12)
- Ve a **Console** y busca errores
- Verifica que el componente de debug aparezca

## 🐛 **Debug en Producción**

### **1. Verificar Código**
```javascript
// En la consola del navegador
console.log('TimeClockContext loaded:', window.TimeClockContext);
console.log('GlobalFloatingTimeClock loaded:', window.GlobalFloatingTimeClock);
```

### **2. Verificar localStorage**
```javascript
// En la consola del navegador
console.log('localStorage:', localStorage.getItem('witar_active_session'));
console.log('localStorage keys:', Object.keys(localStorage));
```

### **3. Verificar Network**
- En DevTools → **Network**
- Verifica que los archivos JS se carguen correctamente
- Busca errores 404 o 500

## 📱 **URLs para Probar**

### **URLs de Producción:**
- **Principal:** `witar.es`
- **Dashboard:** `witar.es/employee` (o `/owner`, `/manager`)
- **Vacaciones:** `witar.es/employee/my-requests`
- **Perfil:** `witar.es/employee/profile`
- **Time Entries:** `witar.es/employee/my-time-entries`
- **Página de prueba:** `witar.es/employee/timeclock-test`

## ⚡ **Solución Rápida**

### **Si el problema persiste:**
1. **Haz un commit vacío** para forzar nuevo deploy:
```bash
git commit --allow-empty -m "Force redeploy"
git push origin main
```

2. **Espera 2-3 minutos** para que Vercel procese el deploy

3. **Limpia caché del navegador** y prueba en modo incógnito

4. **Verifica en la consola** que no haya errores de JavaScript

## 🎯 **Verificación Final**

### **Pasos para confirmar que funciona:**
1. **Abre witar.es** en modo incógnito
2. **Logueate** con tu cuenta
3. **Busca el reloj flotante** en la esquina inferior derecha
4. **Inicia un fichaje** y navega entre páginas
5. **Verifica que el estado persiste** sin cambios automáticos

Si el problema persiste, puede ser que Vercel esté sirviendo una versión en caché o que haya un problema con el build.
