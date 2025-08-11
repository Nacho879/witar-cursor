import { supabase } from './supabaseClient';

export class BillingService {
  // Calcular precio mensual basado en número de empleados
  static calculateMonthlyPrice(employeeCount) {
    if (employeeCount <= 25) {
      return employeeCount * 1.50;
    }
    return 25 * 1.50; // Máximo para el plan actual
  }

  // Verificar si la empresa excede el límite del plan
  static isPlanLimitExceeded(employeeCount) {
    return employeeCount > 25;
  }

  // Obtener información del plan actual
  static getPlanInfo(employeeCount) {
    const isExceeded = this.isPlanLimitExceeded(employeeCount);
    const monthlyPrice = this.calculateMonthlyPrice(employeeCount);

    return {
      name: 'Plan Witar',
      type: 'per_employee',
      pricePerEmployee: 1.50,
      employeeLimit: 25,
      currentEmployees: employeeCount,
      monthlyPrice,
      isLimitExceeded: isExceeded,
      status: isExceeded ? 'limit_exceeded' : 'active',
      features: [
        'Control horario completo',
        'Gestión de empleados',
        'Sistema de solicitudes',
        'Gestión de documentos',
        'Notificaciones en tiempo real',
        'Configuración de empresa'
      ]
    };
  }

  // Obtener datos de facturación de la empresa
  static async getBillingData(companyId) {
    try {
      // Obtener empleados activos
      const { data: employees, error: employeesError } = await supabase
        .from('user_company_roles')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      // Obtener suscripción activa
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      // Obtener facturas recientes
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesError) throw invoicesError;

      const employeeCount = employees?.length || 0;
      const planInfo = this.getPlanInfo(employeeCount);

      return {
        employees: employees || [],
        subscription: subscription || null,
        invoices: invoices || [],
        planInfo,
        employeeCount
      };
    } catch (error) {
      console.error('Error getting billing data:', error);
      throw error;
    }
  }

  // Crear una nueva factura
  static async createInvoice({
    companyId,
    amount,
    employeeCount,
    period,
    status = 'pending'
  }) {
    try {
      const invoiceNumber = await this.generateInvoiceNumber(companyId);
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          invoice_number: invoiceNumber,
          amount,
          employee_count: employeeCount,
          period,
          status,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Generar número de factura único
  static async generateInvoiceNumber(companyId) {
    try {
      const { data: lastInvoice, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      
      if (!lastInvoice) {
        return `WIT-${currentYear}${currentMonth}-001`;
      }

      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
      const newNumber = String(lastNumber + 1).padStart(3, '0');
      
      return `WIT-${currentYear}${currentMonth}-${newNumber}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      throw error;
    }
  }

  // Actualizar estado de factura
  static async updateInvoiceStatus(invoiceId, status) {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return invoice;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  // Crear o actualizar suscripción
  static async createOrUpdateSubscription({
    companyId,
    employeeCount,
    status = 'active'
  }) {
    try {
      const planInfo = this.getPlanInfo(employeeCount);
      
      const { data: existingSubscription, error: checkError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSubscription) {
        // Actualizar suscripción existente
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .update({
            employee_count: employeeCount,
            monthly_price: planInfo.monthlyPrice,
            plan_type: planInfo.type,
            status: planInfo.isLimitExceeded ? 'limit_exceeded' : status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (error) throw error;
        return subscription;
      } else {
        // Crear nueva suscripción
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .insert({
            company_id: companyId,
            employee_count: employeeCount,
            monthly_price: planInfo.monthlyPrice,
            plan_type: planInfo.type,
            status: planInfo.isLimitExceeded ? 'limit_exceeded' : status,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return subscription;
      }
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
      throw error;
    }
  }

  // Obtener historial de facturas
  static async getInvoiceHistory(companyId, limit = 50) {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return invoices || [];
    } catch (error) {
      console.error('Error getting invoice history:', error);
      throw error;
    }
  }

  // Obtener estadísticas de facturación
  static async getBillingStats(companyId) {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status, created_at')
        .eq('company_id', companyId);

      if (error) throw error;

      const stats = {
        totalInvoices: invoices?.length || 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        averageMonthlyAmount: 0
      };

      if (invoices && invoices.length > 0) {
        invoices.forEach(invoice => {
          stats.totalAmount += invoice.amount || 0;
          
          if (invoice.status === 'paid') {
            stats.paidAmount += invoice.amount || 0;
          } else if (invoice.status === 'pending') {
            stats.pendingAmount += invoice.amount || 0;
          }
        });

        // Calcular promedio mensual (últimos 12 meses)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        const recentInvoices = invoices.filter(invoice => 
          new Date(invoice.created_at) >= twelveMonthsAgo
        );

        if (recentInvoices.length > 0) {
          const totalRecent = recentInvoices.reduce((sum, invoice) => 
            sum + (invoice.amount || 0), 0
          );
          stats.averageMonthlyAmount = totalRecent / 12;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting billing stats:', error);
      throw error;
    }
  }

  // Verificar si la empresa puede agregar más empleados
  static async canAddEmployee(companyId) {
    try {
      const billingData = await this.getBillingData(companyId);
      return !billingData.planInfo.isLimitExceeded;
    } catch (error) {
      console.error('Error checking if can add employee:', error);
      return false;
    }
  }

  // Crear sesión de checkout de Stripe
  static async createCheckoutSession(companyId, employeeCount) {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { companyId, employeeCount }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Crear sesión del portal de facturación
  static async createPortalSession(companyId) {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { companyId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  // Verificar estado de la suscripción
  static async checkSubscriptionStatus(companyId) {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('subscription_status, stripe_subscription_id')
        .eq('id', companyId)
        .single();

      return company?.subscription_status || 'inactive';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return 'inactive';
    }
  }

  // Actualizar límite de empleados
  static async updateEmployeeLimit(companyId, newLimit) {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ employee_limit: newLimit })
        .eq('id', companyId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating employee limit:', error);
      return false;
    }
  }

  // Obtener información de contacto para ventas
  static getSalesContactInfo() {
    return {
      email: 'ventas@witar.com',
      phone: '+34 900 123 456',
      hours: 'Lunes a Viernes, 9:00 - 18:00',
      website: 'https://witar.com/contacto'
    };
  }

  // Formatear moneda
  static formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(amount);
  }

  // Formatear fecha
  static formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Obtener estado de factura
  static getInvoiceStatus(status) {
    switch (status) {
      case 'paid':
        return { label: 'Pagada', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' };
      case 'failed':
        return { label: 'Fallida', color: 'bg-red-100 text-red-800' };
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  }
} 