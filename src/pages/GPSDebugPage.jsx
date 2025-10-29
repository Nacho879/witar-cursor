import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GPSDebugger from '@/components/GPSDebugger';

const GPSDebugPage = () => {
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('Usuario no autenticado');
          setLoading(false);
          return;
        }

        // Obtener el company_id del usuario
        const { data: userRole, error } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error obteniendo company_id:', error);
          setLoading(false);
          return;
        }

        setCompanyId(userRole.company_id);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    getCompanyId();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">No se pudo obtener el ID de la empresa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Diagnóstico de GPS</h1>
          <p className="text-gray-600">Herramienta para diagnosticar problemas con la funcionalidad GPS</p>
          <p className="text-sm text-gray-500 mt-2">Company ID: {companyId}</p>
        </div>
        
        <GPSDebugger companyId={companyId} />
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 Instrucciones de Uso:</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1">
            <li>Haz clic en "Probar GPS" para verificar si la geolocalización funciona</li>
            <li>Si el GPS funciona, haz clic en "Probar Inserción en BD" para verificar que se guarda en la base de datos</li>
            <li>Usa "Ver Entradas Recientes" para comprobar registros anteriores con GPS</li>
            <li>Revisa la consola del navegador (F12) para ver logs detallados</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GPSDebugPage;
