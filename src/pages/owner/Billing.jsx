import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BillingService } from '@/lib/billingService';
import { 
  CreditCard, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  Calendar,
  Download,
  Receipt,
  Building2,
  DollarSign,
  Shield,
  Zap,
  ExternalLink
} from 'lucide-react';

export default function Billing() {
  const [loading, setLoading] = React.useState(true);
  const [company, setCompany] = React.useState(null);
  const [employees, setEmployees] = React.useState([]);
  const [subscription, setSubscription] = React.useState(null);
  const [invoices, setInvoices] = React.useState([]);
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [processingPayment, setProcessingPayment] = React.useState(false);

  React.useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        // Cargar datos de la empresa
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userRole.company_id)
          .single();

        if (companyData) {
          setCompany(companyData);
        }

        // Cargar empleados activos
        const { data: employeesData } = await supabase
          .from('user_company_roles')
          .select('*')
          .eq('company_id', userRole.company_id)
          .eq('is_active', true)
          .neq('role', 'owner'); // Excluir al owner del conteo

        if (employeesData) {
          setEmployees(employeesData);
        }

        // Cargar suscripción (si existe)
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('company_id', userRole.company_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionData) {
          setSubscription(subscriptionData);
        }

        // Cargar facturas
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('company_id', userRole.company_id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (invoicesData) {
          setInvoices(invoicesData);
        }
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateMonthlyPrice() {
    const activeEmployees = employees.length;
    if (activeEmployees <= 25) {
      return activeEmployees * 1.50;
    }
    return 25 * 1.50; // Máximo para el plan actual
  }

  function getPlanStatus() {
    const activeEmployees = employees.length;
    if (activeEmployees <= 25) {
      return {
        status: 'active',
        message: 'Plan activo',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle
      };
    } else {
      return {
        status: 'limit_exceeded',
        message: 'Límite excedido',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: AlertTriangle
      };
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function getInvoiceStatus(status) {
    switch (status) {
      case 'paid':
        return { label: 'Pagada', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' };
      case 'failed':
        return { label: 'Fallida', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  }

  // Función para iniciar el proceso de pago con Stripe
  async function handleStartSubscription() {
    try {
      setProcessingPayment(true);
      
      const employeeCount = employees.length;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Debes estar autenticado para continuar');
        return;
      }

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) {
        alert('No se encontró la empresa');
        return;
      }

      // Crear sesión de checkout
      const { url } = await BillingService.createCheckoutSession(
        userRole.company_id, 
        employeeCount
      );

      // Redirigir a Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error starting subscription:', error);
      alert('Error al iniciar el proceso de pago. Inténtalo de nuevo.');
    } finally {
      setProcessingPayment(false);
    }
  }

  // Función para abrir el portal de facturación
  async function handleOpenPortal() {
    try {
      setProcessingPayment(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Debes estar autenticado para continuar');
        return;
      }

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) {
        alert('No se encontró la empresa');
        return;
      }

      // Crear sesión del portal
      const { url } = await BillingService.createPortalSession(userRole.company_id);

      // Abrir portal de facturación
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Error al abrir el portal de facturación. Inténtalo de nuevo.');
    } finally {
      setProcessingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const planStatus = getPlanStatus();
  const PlanStatusIcon = planStatus.icon;
  const monthlyPrice = calculateMonthlyPrice();
  const activeEmployees = employees.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu suscripción y facturas
          </p>
        </div>
        {activeEmployees > 25 && (
          <button
            onClick={() => setShowContactModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Contactar Ventas
          </button>
        )}
      </div>

      {/* Plan Overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Plan Witar</h2>
              <p className="text-sm text-muted-foreground">
                Plan por empleado hasta 25 usuarios
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${planStatus.bgColor}`}>
            <PlanStatusIcon className={`w-4 h-4 ${planStatus.color}`} />
            <span className={`text-sm font-medium ${planStatus.color}`}>
              {planStatus.message}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{activeEmployees}</div>
            <div className="text-sm text-muted-foreground">Empleados activos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{formatCurrency(monthlyPrice)}</div>
            <div className="text-sm text-muted-foreground">Precio mensual</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">25</div>
            <div className="text-sm text-muted-foreground">Límite del plan</div>
          </div>
        </div>

        {activeEmployees > 25 && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800">Límite del plan excedido</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Tienes {activeEmployees} empleados activos, pero tu plan solo permite hasta 25. 
                  Contacta con nuestro equipo de ventas para un plan personalizado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Plan Actual</h3>
              <p className="text-sm text-muted-foreground">Plan por empleado</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio por empleado:</span>
              <span className="font-medium">1,50€/mes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Empleados activos:</span>
              <span className="font-medium">{activeEmployees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total mensual:</span>
              <span className="font-bold text-lg">{formatCurrency(monthlyPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Límite del plan:</span>
              <span className="font-medium">25 empleados</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Control horario completo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Gestión de empleados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Sistema de solicitudes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Gestión de documentos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Notificaciones en tiempo real</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-6 space-y-3">
            {!subscription ? (
              <button
                onClick={handleStartSubscription}
                disabled={processingPayment}
                className="w-full btn btn-primary"
              >
                {processingPayment ? 'Procesando...' : 'Iniciar Suscripción'}
              </button>
            ) : (
              <button
                onClick={handleOpenPortal}
                disabled={processingPayment}
                className="w-full btn btn-outline flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {processingPayment ? 'Procesando...' : 'Gestionar Suscripción'}
              </button>
            )}
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="card p-6 border-2 border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Plan Enterprise</h3>
              <p className="text-sm text-muted-foreground">Más de 25 empleados</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio:</span>
              <span className="font-medium">Personalizado</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Empleados:</span>
              <span className="font-medium">Sin límite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Soporte:</span>
              <span className="font-medium">Prioritario</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Todo del plan básico</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>API personalizada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Soporte dedicado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Integraciones personalizadas</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowContactModal(true)}
            className="w-full btn btn-outline mt-6"
          >
            <Mail className="w-4 h-4" />
            Contactar Ventas
          </button>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Facturas Recientes</h3>
            <button className="text-sm text-primary hover:underline">
              Ver todas
            </button>
          </div>
        </div>
        <div className="p-6">
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay facturas disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const status = getInvoiceStatus(invoice.status);
                return (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Factura #{invoice.invoice_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <span className={`badge ${status.color}`}>
                        {status.label}
                      </span>
                      <button className="btn btn-ghost btn-sm">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Contactar Ventas</h3>
                  <p className="text-sm text-muted-foreground">
                    Para planes personalizados
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tu empresa tiene {activeEmployees} empleados activos, lo que excede el límite de 25 del plan actual.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Información de contacto:</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Email:</strong> ventas@witar.com</p>
                    <p><strong>Teléfono:</strong> +34 900 123 456</p>
                    <p><strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Incluye en tu mensaje:</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Nombre de tu empresa</li>
                    <li>• Número actual de empleados</li>
                    <li>• Necesidades específicas</li>
                    <li>• Preferencias de contacto</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cerrar
                </button>
                <a
                  href="mailto:ventas@witar.com?subject=Solicitud de Plan Enterprise&body=Hola,%0D%0A%0D%0AMi empresa tiene X empleados y necesitamos un plan personalizado.%0D%0A%0D%0ASaludos"
                  className="btn btn-primary flex-1"
                >
                  Enviar Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
