import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Las variables de entorno de Supabase no están configuradas');
  console.error('Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env');
}

// Configurar el cliente de Supabase con opciones adicionales
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configuración adicional para evitar problemas de CORS
    flowType: 'pkce',
    // Manejar errores de refresh token de forma silenciosa
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
  },
  global: {
    headers: {
      'x-client-info': 'witar-web',
    },
  },
});

// Función helper para detectar errores de CORS
export function isCorsError(error) {
  if (!error) return false;
  const message = error.message || error.toString() || '';
  return (
    message.includes('CORS') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ERR_FAILED') ||
    message.includes('Access-Control-Allow-Origin')
  );
}
