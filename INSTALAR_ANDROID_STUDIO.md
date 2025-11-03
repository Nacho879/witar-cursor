# 📱 Instalar Android Studio en Mac para Generar APK

## Pasos Rápidos

### 1. Descargar Android Studio

1. Ve a: https://developer.android.com/studio
2. Descarga la versión para Mac (Apple Silicon o Intel según tu Mac)
3. Abre el archivo `.dmg` descargado

### 2. Instalar

1. Arrastra **Android Studio** a la carpeta **Aplicaciones**
2. Abre Android Studio desde Aplicaciones
3. En el primer inicio:
   - Selecciona **"Standard"** installation
   - Acepta los términos y condiciones
   - Espera a que descargue e instale los componentes necesarios

### 3. Configurar el SDK

1. Cuando Android Studio termine de instalarse, ve a:
   - **More Actions** → **SDK Manager** (si está en la pantalla de bienvenida)
   - O **Tools** → **SDK Manager** (si ya tienes un proyecto abierto)

2. En **SDK Platforms**, asegúrate de tener instalado:
   - ✅ **Android 14.0 (API 34)** o superior
   - ✅ **Android 13.0 (API 33)** (opcional pero recomendado)

3. En **SDK Tools**, verifica que estén instalados:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator (opcional, solo si quieres probar en emulador)

4. Haz clic en **Apply** y espera la instalación

### 4. Verificar Instalación

Abre una terminal y verifica:

```bash
# Verificar que el SDK está instalado
ls ~/Library/Android/sdk

# Si no existe, el SDK estará en:
# ~/Library/Android/Sdk (con S mayúscula)
```

### 5. Generar el APK

Una vez instalado Android Studio y el SDK, ejecuta:

```bash
# Desde el directorio del proyecto
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"

# Crear archivo local.properties si no existe
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# O si el SDK está con S mayúscula:
# echo "sdk.dir=$HOME/Library/Android/Sdk" > android/local.properties

# Generar APK
npm run build:apk:debug
```

## Método Alternativo: Abrir en Android Studio

Si prefieres usar la interfaz gráfica:

```bash
# 1. Construir y sincronizar
npm run build
npm run cap:sync

# 2. Abrir en Android Studio
npm run cap:open:android

# 3. En Android Studio:
#    - Build → Build Bundle(s) / APK(s) → Build APK(s)
#    - El APK estará en: android/app/build/outputs/apk/debug/
```

## Ubicación del APK Generado

El APK estará en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Solución de Problemas

### Error: "SDK location not found"

1. Verifica la ubicación del SDK:
```bash
ls -la ~/Library/Android/
```

2. Crea el archivo `android/local.properties`:
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

O si está con S mayúscula:
```bash
echo "sdk.dir=$HOME/Library/Android/Sdk" > android/local.properties
```

### Error: "Java not found"

Ya está instalado con Homebrew. Asegúrate de tener Java en el PATH:

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

Para hacerlo permanente, agrégalo a `~/.zshrc`:
```bash
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
source ~/.zshrc
```

### El APK no se genera

1. Verifica que Android Studio esté completamente instalado
2. Asegúrate de que el SDK esté instalado (SDK Manager)
3. Intenta abrir el proyecto en Android Studio primero:
   ```bash
   npm run cap:open:android
   ```
   Esto ayudará a descargar cualquier dependencia faltante.

## Siguiente Paso

Una vez que tengas Android Studio instalado, consulta **GENERAR_APK.md** para instrucciones detalladas sobre cómo generar y compartir el APK.

