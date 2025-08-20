import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Edit, AlertCircle } from 'lucide-react';
import TimeEntryEditRequestsTable from '@/components/TimeEntryEditRequestsTable';

export default function TimeEntryEditRequests() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    loadUserRole();
  }, []);

  async function loadUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: role } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (role) {
        setUserRole(role);
        loadStats(role.company_id);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(companyId) {
    try {
      // Obtener estadísticas de solicitudes
      const { data: requests } = await supabase
        .from('time_entry_edit_requests')
        .select('status')
        .eq('company_id', companyId);

      if (requests) {
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        setStats({
          pending,
          approved,
          rejected,
          total: requests.length
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
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

  if (!userRole) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Acceso Denegado
        </h2>
        <p className="text-gray-600">
          No tienes permisos para acceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Solicitudes de Edición de Fichajes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las solicitudes de edición de fichajes de tu equipo
          </p>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Edit className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Solicitudes</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aprobadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rechazadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Solicitudes de Edición
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Revisa y aprueba las solicitudes de edición de fichajes de tu equipo
          </p>
        </div>
        <div className="p-6">
          <TimeEntryEditRequestsTable userRole={userRole} />
        </div>
      </div>
    </div>
  );
} 