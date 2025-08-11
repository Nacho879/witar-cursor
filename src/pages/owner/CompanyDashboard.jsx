import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  MapPin,
  Phone,
  Mail,
  Globe,
  Target,
  Award,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function CompanyDashboard() {
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [stats, setStats] = React.useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    totalHours: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    attendanceRate: 0,
    productivityScore: 0
  });
  const [departments, setDepartments] = React.useState([]);
  const [recentHires, setRecentHires] = React.useState([]);
  const [topPerformers, setTopPerformers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [companyId, setCompanyId] = React.useState(null);

  React.useEffect(() => {
    loadCompanyDashboard();
  }, []);

  async function loadCompanyDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyId(userRole.company_id);
          await Promise.all([
            loadCompanyInfo(userRole.company_id),
            loadCompanyStats(userRole.company_id),
            loadDepartments(userRole.company_id),
            loadRecentHires(userRole.company_id),
            loadTopPerformers(userRole.company_id)
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading company dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyInfo(companyId) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (!error && data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  }

  async function loadCompanyStats(companyId) {
    try {
      // Total empleados
      const { count: totalEmployees } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Empleados activos
      const { count: activeEmployees } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Departamentos
      const { count: departments } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');

      // Solicitudes pendientes
      const { count: pendingRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending');

      // Solicitudes aprobadas
      const { count: approvedRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'approved');

      // Métricas simuladas para demostración
      const totalHours = Math.floor(Math.random() * 1000) + 2000;
      const attendanceRate = Math.floor(Math.random() * 20) + 80; // 80-100%
      const productivityScore = Math.floor(Math.random() * 30) + 70; // 70-100%

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        departments: departments || 0,
        totalHours,
        pendingRequests: pendingRequests || 0,
        approvedRequests: approvedRequests || 0,
        attendanceRate,
        productivityScore
      });
    } catch (error) {
      console.error('Error loading company stats:', error);
    }
  }

  async function loadDepartments(companyId) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          user_company_roles (
            id
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!error && data) {
        // Contar empleados por departamento
        const departmentsWithCount = data.map(dept => ({
          ...dept,
          employeeCount: dept.user_company_roles?.length || 0
        }));
        setDepartments(departmentsWithCount);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function loadRecentHires(companyId) {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          joined_at,
          role,
          user_profiles (
            full_name,
            avatar_url
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentHires(data);
      }
    } catch (error) {
      console.error('Error loading recent hires:', error);
    }
  }

  async function loadTopPerformers(companyId) {
    try {
      // Simular top performers basado en horas trabajadas
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          role,
          user_profiles (
            full_name,
            avatar_url
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(5);

      if (!error && data) {
        // Agregar métricas simuladas
        const performersWithMetrics = data.map((performer, index) => ({
          ...performer,
          hoursWorked: Math.floor(Math.random() * 20) + 35, // 35-55 horas
          productivity: Math.floor(Math.random() * 20) + 80, // 80-100%
          rank: index + 1
        }));
        setTopPerformers(performersWithMetrics);
      }
    } catch (error) {
      console.error('Error loading top performers:', error);
    }
  }

  function getProductivityColor(score) {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  function getAttendanceColor(rate) {
    if (rate >= 95) return 'text-green-600 bg-green-100';
    if (rate >= 85) return 'text-blue-600 bg-blue-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
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

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {companyInfo?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {companyInfo?.industry} • {companyInfo?.size} empleados
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estado</p>
            <span className="badge bg-green-100 text-green-800">
              Activa
            </span>
          </div>
        </div>

        {/* Company Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {companyInfo?.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{companyInfo.email}</span>
            </div>
          )}
          {companyInfo?.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{companyInfo.phone}</span>
            </div>
          )}
          {companyInfo?.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span>{companyInfo.website}</span>
            </div>
          )}
          {companyInfo?.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{companyInfo.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              {stats.activeEmployees} activos
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departamentos</p>
              <p className="text-3xl font-bold text-foreground">{stats.departments}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Organizados
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">
              Este mes
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solicitudes</p>
              <p className="text-3xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Pendientes
            </span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Métricas de Rendimiento</h3>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Asistencia</span>
              <span className={`badge ${getAttendanceColor(stats.attendanceRate)}`}>
                {stats.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Productividad</span>
              <span className={`badge ${getProductivityColor(stats.productivityScore)}`}>
                {stats.productivityScore}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Solicitudes Aprobadas</span>
              <span className="badge bg-green-100 text-green-800">
                {stats.approvedRequests}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Departamentos</h3>
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay departamentos configurados</p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">{dept.description}</p>
                  </div>
                  <span className="badge">
                    {dept.employeeCount} empleados
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hires */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Contrataciones Recientes</h3>
          </div>
          <div className="p-6">
            {recentHires.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay contrataciones recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHires.map((hire) => (
                  <div key={hire.joined_at} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {hire.user_profiles?.avatar_url ? (
                        <img 
                          src={hire.user_profiles.avatar_url} 
                          alt={hire.user_profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {hire.user_profiles?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{hire.user_profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {hire.departments?.name || 'Sin departamento'} • {hire.role}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(hire.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Top Performers</h3>
          </div>
          <div className="p-6">
            {topPerformers.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay datos de rendimiento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((performer) => (
                  <div key={performer.rank} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">#{performer.rank}</span>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {performer.user_profiles?.avatar_url ? (
                        <img 
                          src={performer.user_profiles.avatar_url} 
                          alt={performer.user_profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {performer.user_profiles?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{performer.user_profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {performer.departments?.name || 'Sin departamento'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-foreground">{performer.hoursWorked}h</p>
                      <p className="text-xs text-muted-foreground">{performer.productivity}% prod.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Gestión de Empresa</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/owner/employees'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Gestionar Empleados</p>
                <p className="text-sm text-muted-foreground">Ver y editar equipo</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/owner/departments'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Departamentos</p>
                <p className="text-sm text-muted-foreground">Organizar estructura</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/owner/settings'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Configuración</p>
                <p className="text-sm text-muted-foreground">Ajustes de empresa</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/owner/billing'}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Facturación</p>
                <p className="text-sm text-muted-foreground">Planes y pagos</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 