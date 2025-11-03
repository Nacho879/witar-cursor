# 📱 Configuración de Aplicación Móvil - Witar

Esta guía explica cómo preparar y publicar Witar como aplicación móvil en Google Play Store y Apple App Store.

## ✅ Configuración Completada

### PWA (Progressive Web App)
- ✅ Manifest.json configurado
- ✅ Service Worker configurado con Vite PWA
- ✅ Íconos generados en múltiples tamaños
- ✅ Meta tags para iOS y Android
- ✅ Funcionalidad offline básica

### Capacitor
- ✅ Capacitor instalado y configurado
- ✅ Plataforma Android agregada
- ✅ Plataforma iOS agregada
- ✅ Plugins configurados (SplashScreen, StatusBar, Keyboard)

## 🚀 Flujo de Trabajo de Desarrollo

### 1. Actualizar la Aplicación Web

Cada vez que hagas cambios en la aplicación web:

```bash
# Construir la aplicación
npm run build

# Sincronizar con las plataformas nativas
npm run cap:sync
```

### 2. Generar Nuevos Íconos

Si cambias el diseño del logo:

```bash
npm run generate-icons
```

## 📱 Android - Google Play Store

### Requisitos Previos

1. **Android Studio** - Descarga desde [developer.android.com](https://developer.android.com/studio)
2. **Java JDK 11 o superior**
3. **Cuenta de Desarrollador de Google Play** ($25 pago único)

### Pasos para Publicar

#### 1. Abrir Proyecto Android

```bash
npm run cap:open:android
```

Esto abrirá el proyecto en Android Studio.

#### 2. Configurar la Aplicación

1. En Android Studio, navega a `android/app/build.gradle`
2. Actualiza la versión de la app:
   - `versionCode`: Número entero que incrementa con cada release
   - `versionName`: Versión visible (ej: "1.0.0")

#### 3. Generar Keystore para Firma

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore witar-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias witar
```

Guarda el keystore de forma segura y configura las variables en `capacitor.config.ts`:

```typescript
android: {
  buildOptions: {
    keystorePath: '../android/app/witar-release-key.jks',
    keystoreAlias: 'witar'
  }
}
```

#### 4. Configurar Variables de Entorno para Keystore

Crea un archivo `android/keystore.properties`:

```properties
storePassword=tu_contraseña_del_keystore
keyPassword=tu_contraseña_del_keystore
keyAlias=witar
storeFile=witar-release-key.jks
```

**IMPORTANTE**: Agrega `keystore.properties` al `.gitignore` para no subirlo al repositorio.

#### 5. Construir APK o AAB

En Android Studio:
- **Build → Generate Signed Bundle / APK**
- Selecciona **Android App Bundle (AAB)** (recomendado para Play Store)
- Selecciona tu keystore y completa los datos
- Genera el bundle

O desde la terminal:

```bash
cd android
./gradlew bundleRelease
```

El archivo AAB estará en: `android/app/build/outputs/bundle/release/app-release.aab`

#### 6. Crear App en Google Play Console

1. Ve a [Google Play Console](https://play.google.com/console)
2. Crea una nueva aplicación
3. Completa la información de la tienda:
   - Descripción
   - Capturas de pantalla (mínimo 2)
   - Ícono de alta resolución (512x512)
   - Clasificación de contenido
   - Política de privacidad

#### 7. Subir y Publicar

1. Ve a **Production** → **Create new release**
2. Sube el archivo AAB generado
3. Agrega notas de la versión
4. Revisa y publica

### Configuración Adicional para Android

#### Permisos

Si tu app necesita permisos especiales (cámara, ubicación, etc.), configúralos en:
- `android/app/src/main/AndroidManifest.xml`

Ejemplo:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

#### Íconos y Splash Screen

Los íconos se generan automáticamente desde `public/icons/`. Para personalizar:
- `android/app/src/main/res/` contiene las carpetas de recursos

## 🍎 iOS - Apple App Store

### Requisitos Previos

1. **macOS** con **Xcode** instalado
2. **Cuenta de Desarrollador de Apple** ($99/año)
3. **CocoaPods** (se instala con: `sudo gem install cocoapods`)

### Pasos para Publicar

#### 1. Instalar CocoaPods (si no está instalado)

```bash
sudo gem install cocoapods
cd ios/App
pod install
```

#### 2. Abrir Proyecto iOS

```bash
npm run cap:open:ios
```

Esto abrirá el proyecto en Xcode.

#### 3. Configurar la Aplicación en Xcode

1. Selecciona el proyecto en el navegador
2. Ve a **Signing & Capabilities**
3. Selecciona tu **Team** (cuenta de desarrollador)
4. Xcode generará automáticamente los certificados y perfiles de aprovisionamiento

#### 4. Configurar Bundle Identifier

En Xcode:
- **General** → **Bundle Identifier**: `com.witar.app`
- **Version**: Versión de la app (ej: 1.0.0)
- **Build**: Número de build que incrementa con cada release

#### 5. Configurar Permisos

Si tu app necesita permisos, agrégalos en `Info.plist` o en Xcode:

- **Privacy - Location When In Use Usage Description**
- **Privacy - Camera Usage Description**
- etc.

#### 6. Construir para Distribución

En Xcode:
1. **Product → Destination → Any iOS Device**
2. **Product → Archive**
3. Esto abrirá el **Organizer**

#### 7. Subir a App Store Connect

1. En **Organizer**, selecciona tu archivo
2. Haz clic en **Distribute App**
3. Selecciona **App Store Connect**
4. Sigue el asistente para subir la app

#### 8. Configurar en App Store Connect

1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Crea una nueva aplicación
3. Completa la información:
   - Nombre de la app
   - Descripción
   - Capturas de pantalla (múltiples tamaños)
   - Íconos
   - Política de privacidad
   - Categoría

#### 9. Enviar para Revisión

1. Una vez subido el build, configúralo para revisión
2. Completa todos los campos requeridos
3. Envía para revisión

### Configuración Adicional para iOS

#### Íconos y Splash Screen

Xcode puede generar automáticamente los íconos desde un asset. Para personalizar:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

#### Configuración de URL Schemes

Ya configurado en `capacitor.config.ts`:
```typescript
ios: {
  scheme: 'Witar'
}
```

## 🔄 Sincronización Continua

Después de cada cambio en el código web:

```bash
# 1. Construir
npm run build

# 2. Sincronizar
npm run cap:sync

# 3. Abrir en IDE nativo
npm run cap:open:android  # o cap:open:ios
```

## 🧪 Pruebas

### Android

```bash
# Conecta un dispositivo Android o inicia un emulador
npm run cap:open:android

# En Android Studio, haz clic en Run
```

### iOS

```bash
# Conecta un dispositivo iOS o usa el simulador
npm run cap:open:ios

# En Xcode, selecciona un dispositivo y haz clic en Run
```

## 📝 Notas Importantes

1. **Seguridad del Keystore**: Nunca subas el keystore al repositorio. Úsalo solo localmente.

2. **Variables de Entorno**: Para producción, configura las variables de entorno correctas en cada plataforma nativa.

3. **Política de Privacidad**: Necesitarás una política de privacidad URL para ambas tiendas.

4. **Capturas de Pantalla**: Prepara capturas en los tamaños requeridos por cada plataforma:
   - **Android**: Mínimo 2, recomendado 8
   - **iOS**: Requiere múltiples tamaños para diferentes dispositivos

5. **Testing**: Prueba la app exhaustivamente en dispositivos reales antes de publicar.

## 🔗 Enlaces Útiles

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Android Developer Guide](https://developer.android.com/distribute)
- [Apple Developer Guide](https://developer.apple.com/app-store/)

## 🐛 Troubleshooting

### Android

**Error: "Gradle sync failed"**
- Asegúrate de tener Android Studio actualizado
- Verifica que la versión de Gradle sea compatible

**Error: "Keystore not found"**
- Verifica la ruta del keystore en `capacitor.config.ts`
- Asegúrate de que el archivo existe y tiene los permisos correctos

### iOS

**Error: "CocoaPods not installed"**
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

**Error: "No signing certificate found"**
- Abre Xcode y configura tu cuenta de desarrollador
- Xcode generará los certificados automáticamente

## ✨ Próximos Pasos

1. ✅ Configurar keystore para Android
2. ✅ Configurar cuenta de desarrollador de Apple
3. ✅ Generar capturas de pantalla
4. ✅ Preparar descripción y metadatos
5. ✅ Configurar política de privacidad
6. ✅ Probar en dispositivos reales
7. ✅ Publicar en las tiendas

