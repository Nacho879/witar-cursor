# 🕐 Sistema de Fichaje Global - Guía de Implementación

## ✅ **Problema Solucionado**

El fichaje ahora **persiste completamente** al navegar entre páginas de la aplicación (Dashboard, Vacaciones, etc.) y al cambiar de pestaña del navegador.

## 🏗️ **Arquitectura de la Solución**

### **1. Contexto Global (TimeClockContext.jsx)**
- ✅ **Estado centralizado**: Todo el estado del fichaje se maneja en un contexto global
- ✅ **Persistencia automática**: Se guarda en localStorage cada 10 segundos
- ✅ **Sincronización**: Se sincroniza con la base de datos cada 30 segundos
- ✅ **Recuperación**: Restaura sesiones perdidas automáticamente

### **2. Provider Global (main.jsx)**
- ✅ **Cobertura total**: El provider envuelve toda la aplicación
- ✅ **Disponible en todas las páginas**: Cualquier componente puede acceder al estado

### **3. Componentes Disponibles**

#### **GlobalFloatingTimeClock.jsx**
- Reloj flotante que aparece en todas las páginas
- Incluye notificaciones y menú de usuario
- Posicionado en la esquina inferior derecha

#### **TimeClockStatus.jsx**
- Componente para mostrar en páginas específicas
- Versión compacta del estado de fichaje
- Se puede integrar en cualquier layout

#### **GlobalTimeClock.jsx**
- Componente completo para páginas dedicadas
- Incluye todas las funcionalidades de fichaje

## 🚀 **Cómo Implementar**

### **Paso 1: El Provider ya está configurado**
```jsx
// main.jsx - YA IMPLEMENTADO
import { TimeClockProvider } from './contexts/TimeClockContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TimeClockProvider>
      <AppRouter />
    </TimeClockProvider>
  </React.StrictMode>
)
```

### **Paso 2: Agregar el reloj flotante global**
```jsx
// En cualquier layout principal (ej: OwnerLayout.jsx, ManagerLayout.jsx)
import GlobalFloatingTimeClock from '@/components/GlobalFloatingTimeClock';

export default function Layout({ children }) {
  return (
    <div>
      {children}
      <GlobalFloatingTimeClock />
    </div>
  );
}
```

### **Paso 3: Usar en páginas específicas**
```jsx
// En cualquier página (ej: Dashboard.jsx, Vacations.jsx)
import TimeClockStatus from '@/components/TimeClockStatus';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Panel de fichaje */}
      <TimeClockStatus />
      
      {/* Resto del contenido */}
    </div>
  );
}
```

### **Paso 4: Usar el hook en componentes personalizados**
```jsx
import { useTimeClock } from '@/contexts/TimeClockContext';

export default function MyCustomComponent() {
  const {
    isActive,
    elapsedTime,
    formatTime,
    startSession,
    endSession
  } = useTimeClock();

  return (
    <div>
      {isActive ? (
        <p>Trabajando: {formatTime(elapsedTime)}</p>
      ) : (
        <p>Fuera de servicio</p>
      )}
    </div>
  );
}
```

## 🎯 **Funcionalidades Disponibles**

### **Estados del Fichaje**
- ✅ **Inactivo**: Usuario no está fichado
- ✅ **Activo**: Usuario está trabajando
- ✅ **Pausado**: Usuario está en pausa

### **Acciones Disponibles**
- ✅ **Iniciar Jornada**: Comienza el fichaje
- ✅ **Finalizar Jornada**: Termina el fichaje
- ✅ **Pausar**: Pausa temporal del fichaje
- ✅ **Reanudar**: Continúa el fichaje pausado

### **Persistencia y Sincronización**
- ✅ **localStorage**: Guarda el estado localmente
- ✅ **Base de datos**: Sincroniza con Supabase
- ✅ **Offline**: Funciona sin conexión
- ✅ **Recuperación**: Restaura sesiones perdidas

## 🔧 **Configuración Avanzada**

### **Personalizar el Reloj Flotante**
```jsx
// GlobalFloatingTimeClock.jsx
// Modificar la posición, estilos, o funcionalidades
```

### **Personalizar el Panel de Estado**
```jsx
// TimeClockStatus.jsx
// Ajustar el diseño y funcionalidades
```

### **Acceder al Estado en Cualquier Componente**
```jsx
const {
  isActive,           // boolean - si está fichado
  elapsedTime,        // number - tiempo transcurrido en ms
  isPaused,           // boolean - si está pausado
  location,           // object - ubicación GPS
  isOnline,           // boolean - estado de conexión
  lastSyncTime,       // number - última sincronización
  loading,            // boolean - si está cargando
  startSession,       // function - iniciar fichaje
  endSession,         // function - finalizar fichaje
  pauseSession,       // function - pausar fichaje
  resumeSession,      // function - reanudar fichaje
  getCurrentLocation, // function - obtener ubicación
  syncWithDatabase,   // function - sincronizar manualmente
  formatTime,         // function - formatear tiempo
  saveToLocalStorage, // function - guardar manualmente
  clearLocalStorage   // function - limpiar almacenamiento
} = useTimeClock();
```

## 🧪 **Pruebas**

### **Prueba 1: Navegación entre páginas**
1. Inicia un fichaje
2. Navega a Dashboard → Vacaciones → Perfil
3. Verifica que el tiempo continúa contando

### **Prueba 2: Cambio de pestaña**
1. Inicia un fichaje
2. Cambia a otra pestaña del navegador
3. Vuelve a la pestaña original
4. Verifica que el fichaje sigue activo

### **Prueba 3: Recarga de página**
1. Inicia un fichaje
2. Recarga la página (F5)
3. Verifica que el fichaje se restaura automáticamente

### **Prueba 4: Sin conexión**
1. Inicia un fichaje
2. Desconecta internet
3. Navega entre páginas
4. Reconecta internet
5. Verifica que se sincroniza automáticamente

## 📱 **Componentes de Ejemplo**

### **Página de Ejemplo**
```jsx
// src/pages/example/ExampleWithTimeClock.jsx
// Muestra cómo implementar el fichaje en una página
```

### **Página de Prueba**
```html
<!-- test_persistence.html -->
<!-- Página HTML para probar la persistencia -->
```

## 🎉 **Resultado Final**

- ✅ **Persistencia Total**: El fichaje nunca se pierde
- ✅ **Navegación Libre**: Funciona en todas las páginas
- ✅ **Sincronización Automática**: Se mantiene actualizado
- ✅ **Experiencia Fluida**: Sin interrupciones para el usuario
- ✅ **Robusto**: Maneja errores y reconexiones automáticamente

El sistema ahora es completamente funcional y el fichaje **persiste en toda la aplicación** sin importar dónde navegue el usuario.
