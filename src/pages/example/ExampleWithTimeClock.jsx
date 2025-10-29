import React from 'react';
import TimeClockStatus from '@/components/TimeClockStatus';
import GlobalFloatingTimeClock from '@/components/GlobalFloatingTimeClock';

export default function ExampleWithTimeClock() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Ejemplo con Fichaje Global
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contenido principal */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Contenido de la Página
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Esta es una página de ejemplo que muestra cómo el fichaje persiste 
                al navegar entre diferentes secciones de la aplicación.
              </p>
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  🎯 Características del Fichaje Global:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>✅ Persiste al cambiar de pestaña</li>
                  <li>✅ Persiste al navegar entre páginas</li>
                  <li>✅ Sincronización automática con la base de datos</li>
                  <li>✅ Funciona offline</li>
                  <li>✅ Recuperación automática de sesiones</li>
                </ul>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Instrucciones de Prueba
              </h2>
              <ol className="text-gray-600 dark:text-gray-400 space-y-2">
                <li>1. Haz clic en "Iniciar Jornada" en el panel de fichaje</li>
                <li>2. Navega a otra página (Dashboard, Vacaciones, etc.)</li>
                <li>3. Vuelve a esta página</li>
                <li>4. Verifica que el tiempo continúa contando</li>
                <li>5. Cambia de pestaña del navegador</li>
                <li>6. Vuelve a la pestaña original</li>
                <li>7. El fichaje debe seguir activo</li>
              </ol>
            </div>
          </div>

          {/* Panel de fichaje */}
          <div>
            <TimeClockStatus />
          </div>
        </div>

        {/* Enlaces de navegación de ejemplo */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Navegación de Prueba
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/dashboard" 
              className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <div className="text-blue-600 dark:text-blue-400 font-medium">Dashboard</div>
            </a>
            <a 
              href="/vacations" 
              className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              <div className="text-green-600 dark:text-green-400 font-medium">Vacaciones</div>
            </a>
            <a 
              href="/time-entries" 
              className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-center hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <div className="text-purple-600 dark:text-purple-400 font-medium">Fichajes</div>
            </a>
            <a 
              href="/profile" 
              className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-center hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              <div className="text-orange-600 dark:text-orange-400 font-medium">Perfil</div>
            </a>
          </div>
        </div>
      </div>

      {/* Reloj flotante global */}
      <GlobalFloatingTimeClock />
    </div>
  );
}
