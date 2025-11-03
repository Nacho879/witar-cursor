# Witar — SaaS RR.HH. (Vite + React + Tailwind + Supabase + Stripe)
Actualizado: 2025-08-10

## Arranque rápido
```bash
npm i
npm run dev
```
Abrí http://localhost:5173

## Variables de entorno
Copia `env.example` a `.env` y completa las variables:

```bash
cp env.example .env
```

Variables necesarias:
- `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `VITE_STRIPE_PUBLISHABLE_KEY`: Clave pública de Stripe

## Despliegue

### 1. Desplegar en Supabase

1. Instala Supabase CLI:
```bash
npm install -g supabase
```

2. Inicia sesión en Supabase:
```bash
supabase login
```

3. Vincula tu proyecto:
```bash
supabase link --project-ref tu-project-ref
```

4. Ejecuta las migraciones:
```bash
supabase db push
```

5. Despliega las funciones Edge:
```bash
supabase functions deploy
```

### 2. Desplegar en Vercel

1. Instala Vercel CLI:
```bash
npm install -g vercel
```

2. Inicia sesión en Vercel:
```bash
vercel login
```

3. Despliega el proyecto:
```bash
vercel --prod
```

4. Configura las variables de entorno en el dashboard de Vercel:
   - Ve a tu proyecto en Vercel
   - Settings → Environment Variables
   - Agrega las mismas variables del archivo `.env`

### 3. Configuración automática con GitHub

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Cada push a `main` se desplegará automáticamente

## PWA y Aplicaciones Móviles

Witar está configurado como Progressive Web App (PWA) y puede empaquetarse como aplicación nativa para Android e iOS usando Capacitor.

### Instalación como PWA

Los usuarios pueden instalar Witar directamente desde el navegador:
- **Chrome/Edge**: El navegador mostrará un banner para "Instalar app"
- **Safari (iOS)**: Usa el botón "Compartir" → "Añadir a pantalla de inicio"

### Generar Íconos

Si necesitas regenerar los íconos de la aplicación:

```bash
npm run generate-icons
```

### Aplicaciones Nativas (Play Store / App Store)

Para publicar en las tiendas de aplicaciones, consulta la guía completa:
**[MOBILE_APP_SETUP.md](./MOBILE_APP_SETUP.md)**

Comandos rápidos:

```bash
# Construir y sincronizar
npm run build
npm run cap:sync

# Abrir proyectos nativos
npm run cap:open:android  # Android Studio
npm run cap:open:ios      # Xcode
```

## Estructura del proyecto

```
├── src/
│   ├── app/           # Configuración de rutas
│   ├── components/    # Componentes reutilizables
│   ├── pages/         # Páginas de la aplicación
│   └── lib/           # Configuración de clientes
├── supabase/
│   ├── functions/     # Funciones Edge
│   └── migrations/    # Migraciones de base de datos
├── public/
│   ├── icons/         # Íconos de la aplicación (PWA)
│   └── manifest.json  # Manifest de PWA
├── android/           # Proyecto nativo Android (Capacitor)
├── ios/               # Proyecto nativo iOS (Capacitor)
└── capacitor.config.ts # Configuración de Capacitor
```
