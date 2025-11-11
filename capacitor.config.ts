import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.witar.app',
  appName: 'Witar',
  webDir: 'dist',
  server: {
    // Para desarrollo local, usar:
    // url: 'http://localhost:5173',
    // cleartext: true
    
    // Para producción, usar la URL de producción:
    // url: 'https://witar.es',
    
    // Para producción con Capacitor, normalmente se deja vacío para usar el build local
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    },
    allowMixedContent: false
  },
  ios: {
    scheme: 'Witar'
  }
};

export default config;

