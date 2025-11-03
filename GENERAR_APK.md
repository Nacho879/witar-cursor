# 📱 Generar APK para Instalación Directa

Esta guía te muestra cómo generar un APK que puedas compartir e instalar directamente en dispositivos Android.

## 🚀 Método Rápido (APK de Debug - Sin Firmar)

El método más rápido para generar un APK que puedas instalar directamente:

```bash
# 1. Construir la aplicación web
npm run build

# 2. Sincronizar con Capacitor
npm run cap:sync

# 3. Generar APK de debug (sin firmar)
cd android
./gradlew assembleDebug
```

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

**Ventajas:**
- ✅ No requiere keystore
- ✅ Rápido de generar
- ✅ Perfecto para pruebas

**Desventajas:**
- ⚠️ No se puede actualizar desde Google Play (si lo subes después)
- ⚠️ Algunos dispositivos pueden requerir "Fuentes desconocidas" activadas

## 🔐 Método Recomendado (APK de Release - Firmado)

Para un APK de producción que puedas actualizar en el futuro:

### Opción 1: APK Firmado Manualmente

1. **Generar Keystore** (solo la primera vez):

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore witar-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias witar
```

Guarda la contraseña que ingreses.

2. **Configurar Gradle para usar el keystore**:

Edita `android/app/build.gradle` y agrega dentro de `android {`:

```gradle
signingConfigs {
    release {
        storeFile file('witar-release-key.jks')
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "tu_contraseña_aquí"
        keyAlias "witar"
        keyPassword System.getenv("KEYSTORE_PASSWORD") ?: "tu_contraseña_aquí"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

3. **Generar APK de release**:

```bash
cd android
./gradlew assembleRelease
```

El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

### Opción 2: Usar Script Automatizado

Ejecuta el script proporcionado:

```bash
npm run build:apk
```

## 📦 Instalar el APK

### En un Dispositivo Android:

1. **Habilitar "Fuentes desconocidas"**:
   - Ve a Configuración → Seguridad
   - Activa "Instalar aplicaciones desde fuentes desconocidas"

2. **Transferir el APK**:
   - Envía el archivo `.apk` al dispositivo (email, Google Drive, USB, etc.)

3. **Instalar**:
   - Abre el archivo APK en el dispositivo
   - Toca "Instalar"
   - Sigue las instrucciones

### Usando ADB (si el dispositivo está conectado por USB):

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔄 Actualizar la Aplicación

Cada vez que quieras generar un nuevo APK con cambios:

```bash
# 1. Actualizar código web
npm run build

# 2. Sincronizar
npm run cap:sync

# 3. Generar nuevo APK
cd android
./gradlew assembleDebug  # o assembleRelease si está firmado
```

**Importante**: Si usas un APK firmado, siempre usa el mismo keystore para poder actualizar la app.

## ⚙️ Configurar Versión

Para cambiar la versión del APK, edita `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2  // Incrementa este número para cada nueva versión
    versionName "1.0.1"  // Versión visible para el usuario
}
```

## 🛠️ Troubleshooting

### Error: "Gradle not found" o "./gradlew: Permission denied"

```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

### Error: "SDK location not found"

Abre Android Studio al menos una vez para configurar el SDK:
```bash
npm run cap:open:android
```

### Error al instalar: "Aplicación no instalada"

- Verifica que el dispositivo tenga suficiente espacio
- Asegúrate de que "Fuentes desconocidas" esté habilitado
- Intenta desinstalar una versión previa si existe

### El APK es muy grande

El APK de debug incluye símbolos de depuración. Para reducir el tamaño:
- Usa `assembleRelease` en lugar de `assembleDebug`
- O configura `minifyEnabled true` en `build.gradle` (requiere ProGuard)

## 📝 Notas Importantes

1. **Keystore**: Si generas un keystore, **guárdalo de forma segura**. Si lo pierdes, no podrás actualizar la app.

2. **Firma**: Un APK firmado permite que los usuarios actualicen la app instalando una versión más reciente.

3. **Distribución**: Puedes compartir el APK por:
   - Email
   - Google Drive / Dropbox
   - Servidor web
   - QR Code
   - USB

4. **Seguridad**: Los usuarios deben confiar en ti para instalar un APK fuera de Google Play.

