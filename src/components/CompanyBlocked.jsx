import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, CreditCard, Clock, AlertTriangle } from 'lucide-react';

export default function CompanyBlocked({ companyName, daysSinceCreation }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 text-white p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Empresa Bloqueada</h1>
            <p className="text-red-100">
              Tu período de prueba de 14 días ha expirado
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {companyName}
              </h2>
              <p className="text-gray-600 mb-6">
                Para continuar usando Witar y acceder a todas las funcionalidades, 
                necesitas activar una suscripción.
              </p>
            </div>

            {/* Features blocked */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Funcionalidades Bloqueadas
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Control horario de empleados
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Gestión de solicitudes
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Subida de documentos
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Reportes y analytics
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Invitaciones a nuevos empleados
                </li>
              </ul>
            </div>

            {/* Pricing info */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Planes de Suscripción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Plan Básico</h4>
                  <p className="text-2xl font-bold text-blue-600 mb-2">€1.50</p>
                  <p className="text-sm text-gray-600">por empleado/mes</p>
                  <p className="text-xs text-gray-500 mt-2">Hasta 25 empleados</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Plan Profesional</h4>
                  <p className="text-2xl font-bold text-blue-600 mb-2">Personalizado</p>
                  <p className="text-sm text-gray-600">Empleados ilimitados</p>
                  <p className="text-xs text-gray-500 mt-2">Soporte prioritario</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/owner/billing"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                Activar Suscripción
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="w-5 h-5" />
                Verificar Estado
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                ¿Necesitas ayuda? Contacta con nuestro soporte en{' '}
                <a href="mailto:soporte@witar.es" className="text-blue-600 hover:underline">
                  soporte@witar.es
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
