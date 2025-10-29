import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Clock, CreditCard, XCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionStatus({ companyId, onStatusChange }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyStatus, setCompanyStatus] = useState('active');

  useEffect(() => {
    if (companyId) {
      checkSubscriptionStatus();
    }
  }, [companyId]);

  async function checkSubscriptionStatus() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('check-subscription-status', {
        body: { companyId }
      });

      if (error) {
        console.error('Error checking subscription status:', error);
        return;
      }

      if (data.success) {
        setSubscriptionStatus(data);
        setCompanyStatus(data.companyStatus);
        
        if (onStatusChange) {
          onStatusChange(data);
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!subscriptionStatus) {
    return null;
  }

  // Empresa bloqueada
  if (subscriptionStatus.isBlocked) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Empresa Bloqueada
            </h3>
            <p className="text-red-700 mb-3">
              Tu período de prueba de 14 días ha expirado. Para continuar usando Witar, 
              necesitas activar una suscripción.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/owner/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Activar Suscripción
              </Link>
              <button
                onClick={checkSubscriptionStatus}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Verificar Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Período de prueba
  if (subscriptionStatus.companyStatus === 'trial') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Período de Prueba
            </h3>
            <p className="text-yellow-700 mb-3">
              Te quedan <strong>{subscriptionStatus.daysRemaining} días</strong> de prueba gratuita. 
              Después de este período, necesitarás una suscripción para continuar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/owner/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Activar Suscripción Ahora
              </Link>
              <button
                onClick={checkSubscriptionStatus}
                className="inline-flex items-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Verificar Estado
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suscripción activa
  if (subscriptionStatus.hasActiveSubscription) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Suscripción Activa
            </h3>
            <p className="text-green-700 mb-3">
              Tu suscripción está activa. Disfruta de todas las funcionalidades de Witar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/owner/billing"
                className="inline-flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Gestionar Suscripción
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
