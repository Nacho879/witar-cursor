import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const GPSDebugger = ({ companyId }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [dbTestResults, setDbTestResults] = useState([]);

  const testGPS = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults([]);
    
    const results = [];
    
    // Test 1: Verificar si geolocalización está disponible
    results.push({
      test: 'Geolocalización disponible',
      status: navigator.geolocation ? '✅ Sí' : '❌ No',
      details: navigator.geolocation ? 'API de geolocalización disponible' : 'API no disponible'
    });

    if (navigator.geolocation) {
      // Test 2: Intentar obtener ubicación con configuración básica
      try {
        results.push({
          test: 'Solicitando ubicación...',
          status: '⏳ En progreso',
          details: 'Esperando respuesta del GPS...'
        });
        setTestResults([...results]);

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 0
          });
        });

        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        };

        setLocation(locationData);
        
        results.push({
          test: 'Ubicación obtenida',
          status: '✅ Éxito',
          details: `Lat: ${locationData.lat}, Lng: ${locationData.lng}, Precisión: ${locationData.accuracy}m`
        });

        // Test 3: Verificar formato de datos para base de datos
        const dbFormat = {
          location_lat: locationData.lat,
          location_lng: locationData.lng
        };

        results.push({
          test: 'Formato para BD',
          status: '✅ Correcto',
          details: `location_lat: ${dbFormat.location_lat}, location_lng: ${dbFormat.location_lng}`
        });

      } catch (error) {
        results.push({
          test: 'Error obteniendo ubicación',
          status: '❌ Error',
          details: error.message
        });
        setError(error.message);
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testDatabaseInsert = async () => {
    if (!location) {
      setDbTestResults([{ test: 'Sin ubicación', status: '❌ Error', details: 'Primero obtén la ubicación GPS' }]);
      return;
    }

    setIsLoading(true);
    const results = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        results.push({
          test: 'Usuario autenticado',
          status: '❌ Error',
          details: 'Usuario no autenticado'
        });
        setDbTestResults(results);
        setIsLoading(false);
        return;
      }

      results.push({
        test: 'Usuario autenticado',
        status: '✅ Sí',
        details: `ID: ${user.id}`
      });

      // Test de inserción en base de datos
      const testEntry = {
        user_id: user.id,
        company_id: companyId,
        entry_type: 'clock_in',
        entry_time: new Date().toISOString(),
        location_lat: location.lat,
        location_lng: location.lng
      };

      results.push({
        test: 'Datos preparados',
        status: '✅ Listo',
        details: JSON.stringify(testEntry, null, 2)
      });

      const { data, error } = await supabase
        .from('time_entries')
        .insert(testEntry)
        .select()
        .single();

      if (error) {
        results.push({
          test: 'Inserción en BD',
          status: '❌ Error',
          details: error.message
        });
      } else {
        results.push({
          test: 'Inserción en BD',
          status: '✅ Éxito',
          details: `ID: ${data.id}, Ubicación guardada: ${data.location_lat}, ${data.location_lng}`
        });
      }

    } catch (error) {
      results.push({
        test: 'Error general',
        status: '❌ Error',
        details: error.message
      });
    }

    setDbTestResults(results);
    setIsLoading(false);
  };

  const checkRecentEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, entry_time, location_lat, location_lng')
        .eq('company_id', companyId)
        .not('location_lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error consultando entradas:', error);
        return;
      }

      console.log('📊 Últimas 5 entradas con GPS:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    checkRecentEntries();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Diagnóstico de GPS</h2>
      
      {/* Información actual */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">📍 Ubicación Actual</h3>
        {location ? (
          <div className="bg-green-50 p-4 rounded-lg">
            <p><strong>Latitud:</strong> {location.lat}</p>
            <p><strong>Longitud:</strong> {location.lng}</p>
            <p><strong>Precisión:</strong> {location.accuracy}m</p>
            <p><strong>Timestamp:</strong> {location.timestamp.toLocaleString()}</p>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>No se ha obtenido ubicación GPS</p>
          </div>
        )}
      </div>

      {/* Botones de prueba */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={testGPS}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Probar GPS'}
        </button>
        
        <button
          onClick={testDatabaseInsert}
          disabled={isLoading || !location}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Probar Inserción en BD
        </button>
        
        <button
          onClick={checkRecentEntries}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Ver Entradas Recientes
        </button>
      </div>

      {/* Resultados de pruebas GPS */}
      {testResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🧪 Resultados de Pruebas GPS</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{result.test}</span>
                  <p className="text-sm text-gray-600">{result.details}</p>
                </div>
                <span className="text-lg">{result.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de pruebas de base de datos */}
      {dbTestResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">💾 Resultados de Pruebas de Base de Datos</h3>
          <div className="space-y-2">
            {dbTestResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{result.test}</span>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.details}</p>
                </div>
                <span className="text-lg">{result.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h4 className="font-semibold text-red-800">❌ Error:</h4>
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default GPSDebugger;
