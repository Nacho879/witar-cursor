import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ReportsService } from '@/lib/reportsService';
import ChartComponent from '@/components/ChartComponent';
import { 
  BarChart3, 
  Users, 
  Clock, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Building2,
  Filter,
  RefreshCw,
  PieChart,
  Activity,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  UserCheck,
  UserX,
  User,
  X
} from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [dateRange, setDateRange] = React.useState('month');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [companyStats, setCompanyStats] = React.useState(null);
  const [attendanceReport, setAttendanceReport] = React.useState(null);
  const [requestsReport, setRequestsReport] = React.useState(null);
  const [productivityReport, setProductivityReport] = React.useState(null);
  const [departmentReport, setDepartmentReport] = React.useState(null);
  const [locationReport, setLocationReport] = React.useState(null);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = React.useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = React.useState({
    selectedUsers: [],
    selectedDepartments: [],
    selectedRoles: []
  });
  const [availableUsers, setAvailableUsers] = React.useState([]);
  const [availableDepartments, setAvailableDepartments] = React.useState([]);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    // Establecer fechas por defecto
    const now = new Date();
    const start = ReportsService.getStartDate(dateRange);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [dateRange]);

  React.useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [dateRange, startDate, endDate]);

  React.useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [filters]);

  async function loadReports() {
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
        // Cargar datos para filtros
        await loadFilterData(userRole.company_id);
        
        // Cargar estadísticas generales
        const stats = await ReportsService.getCompanyStats(userRole.company_id, dateRange);
        setCompanyStats(stats);

        // Cargar reportes específicos si hay fechas seleccionadas
        if (startDate && endDate) {
          // Convertir strings de fecha a objetos Date
          const startDateObj = new Date(startDate + 'T00:00:00');
          const endDateObj = new Date(endDate + 'T23:59:59');
          
          
          
          const [attendance, requests, productivity, departments, location] = await Promise.all([
            ReportsService.getAttendanceReport(userRole.company_id, startDateObj, endDateObj, null, filters),
            ReportsService.getRequestsReport(userRole.company_id, startDateObj, endDateObj, null, null, filters),
            ReportsService.getProductivityReport(userRole.company_id, startDateObj, endDateObj, filters),
            ReportsService.getDepartmentReport(userRole.company_id),
            ReportsService.getLocationReport(userRole.company_id, startDateObj, endDateObj, filters)
          ]);

          setAttendanceReport(attendance);
          setRequestsReport(requests);
          setProductivityReport(productivity);
          setDepartmentReport(departments);
          setLocationReport(location);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterData(companyId) {
    try {
      // Cargar usuarios primero
      const { data: users, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id, role, department_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .neq('role', 'owner');

      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      if (users && users.length > 0) {
        // Obtener los IDs de usuarios
        const userIds = users.map(user => user.user_id);
        const departmentIds = users.map(user => user.department_id).filter(id => id);

        // Cargar perfiles de usuario por separado
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        }

        // Cargar departamentos por separado
        const { data: departments, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('status', 'active');

        if (deptError) {
          console.error('Error loading departments:', deptError);
        }

        // Combinar los datos
        const formattedUsers = users.map(user => {
          const profile = profiles?.find(p => p.user_id === user.user_id);
          const department = departments?.find(d => d.id === user.department_id);
          
          return {
            id: user.user_id,
            name: profile?.full_name || 'Usuario sin nombre',
            avatar_url: profile?.avatar_url,
            role: user.role,
            department: department?.name || 'Sin departamento',
            department_id: user.department_id
          };
        });

        setAvailableUsers(formattedUsers);
        setAvailableDepartments(departments || []);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  }

  function handleUserFilter(userId, checked) {
    setFilters(prev => ({
      ...prev,
      selectedUsers: checked 
        ? [...prev.selectedUsers, userId]
        : prev.selectedUsers.filter(id => id !== userId)
    }));
  }

  function handleDepartmentFilter(departmentId, checked) {
    setFilters(prev => ({
      ...prev,
      selectedDepartments: checked 
        ? [...prev.selectedDepartments, departmentId]
        : prev.selectedDepartments.filter(id => id !== departmentId)
    }));
  }

  function handleRoleFilter(role, checked) {
    setFilters(prev => ({
      ...prev,
      selectedRoles: checked 
        ? [...prev.selectedRoles, role]
        : prev.selectedRoles.filter(r => r !== role)
    }));
  }

  function clearFilters() {
    setFilters({
      selectedUsers: [],
      selectedDepartments: [],
      selectedRoles: []
    });
  }

  function applyFilters() {
    loadReports();
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  }

  function formatHours(hours) {
    return `${formatNumber(Math.round(hours * 100) / 100)}h`;
  }

  function formatPercentage(value) {
    return `${Math.round(value * 100) / 100}%`;
  }

  function exportReport(data, filename) {
    ReportsService.exportToCSV(data, filename);
  }

  async function exportDetailedReport(reportType) {
    try {
      setExportLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      let reportData;
      let filename;

      // Convertir strings de fecha a objetos Date para los reportes que lo necesitan
      const startDateObj = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endDateObj = endDate ? new Date(endDate + 'T23:59:59') : null;

      switch (reportType) {
        case 'attendance':
          if (!startDateObj || !endDateObj) {
            alert('Por favor selecciona un rango de fechas para exportar el reporte de asistencia');
            return;
          }
          reportData = await ReportsService.getDetailedAttendanceReport(userRole.company_id, startDateObj, endDateObj);
          filename = `reporte_asistencia_${startDate}_${endDate}.csv`;
          break;
        case 'requests':
          if (!startDateObj || !endDateObj) {
            alert('Por favor selecciona un rango de fechas para exportar el reporte de solicitudes');
            return;
          }
          reportData = await ReportsService.getDetailedRequestsReport(userRole.company_id, startDateObj, endDateObj);
          filename = `reporte_solicitudes_${startDate}_${endDate}.csv`;
          break;
        case 'productivity':
          if (!startDateObj || !endDateObj) {
            alert('Por favor selecciona un rango de fechas para exportar el reporte de productividad');
            return;
          }
          reportData = await ReportsService.getDetailedProductivityReport(userRole.company_id, startDateObj, endDateObj);
          filename = `reporte_productividad_${startDate}_${endDate}.csv`;
          break;
        case 'location':
          if (!startDateObj || !endDateObj) {
            alert('Por favor selecciona un rango de fechas para exportar el reporte de ubicación');
            return;
          }
          reportData = await ReportsService.getDetailedLocationReport(userRole.company_id, startDateObj, endDateObj);
          filename = `reporte_ubicacion_${startDate}_${endDate}.csv`;
          break;
        case 'departments':
          reportData = await ReportsService.getDetailedDepartmentReport(userRole.company_id);
          filename = `reporte_departamentos_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          return;
      }

      exportReport(reportData, filename);
    } catch (error) {
      console.error('Error exporting detailed report:', error);
    } finally {
      setExportLoading(false);
    }
  }

  function openEmployeeModal(employee) {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  }

  function closeEmployeeModal() {
    setSelectedEmployee(null);
    setShowEmployeeModal(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Análisis detallado de la actividad de tu empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros Avanzados
          </button>
          <button
            onClick={loadReports}
            className="btn btn-outline flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="card p-6 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Filtros Avanzados</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="btn btn-ghost btn-sm"
              >
                Limpiar
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary btn-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Filtro por Usuarios */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Usuarios</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedUsers.includes(user.id)}
                      onChange={(e) => handleUserFilter(user.id, e.target.checked)}
                      className="checkbox"
                    />
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <span className="text-sm">{user.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Departamentos */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Departamentos</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableDepartments.map(dept => (
                  <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedDepartments.includes(dept.id)}
                      onChange={(e) => handleDepartmentFilter(dept.id, e.target.checked)}
                      className="checkbox"
                    />
                    <span className="text-sm">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Roles */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Roles</h4>
              <div className="space-y-2">
                {[
                  { value: 'admin', label: 'Administradores' },
                  { value: 'manager', label: 'Gerentes' },
                  { value: 'employee', label: 'Empleados' }
                ].map(role => (
                  <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedRoles.includes(role.value)}
                      onChange={(e) => handleRoleFilter(role.value, e.target.checked)}
                      className="checkbox"
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen de filtros activos */}
          {(filters.selectedUsers.length > 0 || filters.selectedDepartments.length > 0 || filters.selectedRoles.length > 0) && (
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Filtros activos:</p>
              <div className="flex flex-wrap gap-2">
                {filters.selectedUsers.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {filters.selectedUsers.length} usuario{filters.selectedUsers.length > 1 ? 's' : ''}
                  </span>
                )}
                {filters.selectedDepartments.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {filters.selectedDepartments.length} departamento{filters.selectedDepartments.length > 1 ? 's' : ''}
                  </span>
                )}
                {filters.selectedRoles.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {filters.selectedRoles.length} rol{filters.selectedRoles.length > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
          <span className="text-muted-foreground">a</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {[
          { id: 'overview', label: 'Vista General', icon: BarChart3 },
          { id: 'attendance', label: 'Asistencia', icon: Clock },
          { id: 'requests', label: 'Solicitudes', icon: FileText },
          { id: 'productivity', label: 'Productividad', icon: TrendingUp },
          { id: 'departments', label: 'Departamentos', icon: Building2 },
          { id: 'location', label: 'Ubicación', icon: MapPin }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && companyStats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(companyStats.employees.total)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatHours(companyStats.timeEntries.totalHours)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solicitudes</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(companyStats.requests.total)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asistencia Promedio</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatPercentage(companyStats.productivity.averageAttendance)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employees by Role Chart */}
            <ChartComponent
              data={Object.fromEntries(
                Object.entries(companyStats.employees.byRole).map(([role, count]) => [
                  role === 'owner' ? 'Propietario' : 
                  role === 'admin' ? 'Administrador' :
                  role === 'manager' ? 'Jefe de Equipo' :
                  role === 'employee' ? 'Empleado' : role,
                  count
                ])
              )}
              type="doughnut"
              title="Empleados por Rol"
            />

            {/* Top Performers Chart */}
            <ChartComponent
              data={Object.fromEntries(
                companyStats.productivity.topPerformers.slice(0, 5).map(p => [p.name, p.hours])
              )}
              type="bar"
              title="Top Performers (Horas)"
            />
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employees by Department */}
            <ChartComponent
              data={Object.fromEntries(
                Object.entries(companyStats.employees.byDepartment).map(([dept, count]) => [
                  dept || 'Sin departamento',
                  count
                ])
              )}
              type="bar"
              title="Empleados por Departamento"
            />

            {/* Time Entries by Date */}
            <ChartComponent
              data={Object.fromEntries(
                Object.entries(companyStats.timeEntries.byDate).slice(-7).map(([date, entries]) => [
                  new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
                  entries.length
                ])
              )}
              type="line"
              title="Fichajes por Día (Últimos 7 días)"
            />
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && attendanceReport && (
        <div className="space-y-6">
          {/* Header with Export Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">Reporte de Asistencia</h2>
              {(filters.selectedUsers.length > 0 || filters.selectedDepartments.length > 0 || filters.selectedRoles.length > 0) && (
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Filtros activos
                </span>
              )}
            </div>
            <button
              onClick={() => exportDetailedReport('attendance')}
              disabled={exportLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Fichajes</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(attendanceReport.summary.totalEntries)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(attendanceReport.summary.totalHours)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Promedio por Día</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(attendanceReport.summary.averageHoursPerDay)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Promedio por Empleado</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(attendanceReport.summary.averageHoursPerEmployee)}
              </p>
            </div>
          </div>

          {/* Employee Stats */}
          <div className="card">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Estadísticas por Empleado</h3>
                <button
                  onClick={() => exportReport(
                    attendanceReport.employeeStats.map(stat => ({
                      Empleado: stat.name,
                      Fichajes: stat.entries,
                      'Horas Totales': stat.totalHours,
                      'Promedio por Fichaje': stat.averageHours
                    })),
                    'asistencia_por_empleado.csv'
                  )}
                  className="btn btn-ghost btn-sm"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="th">Empleado</th>
                      <th className="th">Fichajes</th>
                      <th className="th">Horas Totales</th>
                      <th className="th">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.employeeStats.map((stat) => (
                      <tr key={stat.id}>
                        <td className="td">
                          <div className="flex items-center gap-3">
                            {stat.avatar_url ? (
                              <img 
                                src={stat.avatar_url} 
                                alt={stat.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <span>{stat.name}</span>
                          </div>
                        </td>
                        <td className="td">{stat.entries}</td>
                        <td className="td">{formatHours(stat.totalHours)}</td>
                        <td className="td">{formatHours(stat.averageHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && requestsReport && (
        <div className="space-y-6">
          {/* Header with Export Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">Reporte de Solicitudes</h2>
              {(filters.selectedUsers.length > 0 || filters.selectedDepartments.length > 0 || filters.selectedRoles.length > 0) && (
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Filtros activos
                </span>
              )}
            </div>
            <button
              onClick={() => exportDetailedReport('requests')}
              disabled={exportLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Solicitudes</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(requestsReport.summary.total)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Tasa de Aprobación</p>
              <p className="text-3xl font-bold text-foreground">
                {formatPercentage(requestsReport.summary.approvalRate)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Tiempo Promedio Aprobación</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(requestsReport.approvalTime)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(requestsReport.byStatus.pending || 0)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartComponent
              data={Object.fromEntries(
                Object.entries(requestsReport.byType).map(([type, count]) => [
                  type === 'vacation' ? 'Vacaciones' :
                  type === 'permission' ? 'Permiso' :
                  type === 'sick_leave' ? 'Baja por Enfermedad' :
                  type === 'other' ? 'Otro' : type,
                  count
                ])
              )}
              type="doughnut"
              title="Solicitudes por Tipo"
            />

            <ChartComponent
              data={Object.fromEntries(
                Object.entries(requestsReport.byStatus).map(([status, count]) => [
                  status === 'pending' ? 'Pendiente' :
                  status === 'approved' ? 'Aprobada' :
                  status === 'rejected' ? 'Rechazada' : status,
                  count
                ])
              )}
              type="bar"
              title="Solicitudes por Estado"
            />
          </div>
        </div>
      )}

      {/* Productivity Tab */}
      {activeTab === 'productivity' && productivityReport && (
        <div className="space-y-6">
          {/* Header with Export Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">Reporte de Productividad</h2>
              {(filters.selectedUsers.length > 0 || filters.selectedDepartments.length > 0 || filters.selectedRoles.length > 0) && (
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Filtros activos
                </span>
              )}
            </div>
            <button
              onClick={() => exportDetailedReport('productivity')}
              disabled={exportLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(productivityReport.productivity.totalHours)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Promedio por Empleado</p>
              <p className="text-3xl font-bold text-foreground">
                {formatHours(productivityReport.productivity.averageHoursPerEmployee)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Tasa de Asistencia</p>
              <p className="text-3xl font-bold text-foreground">
                {formatPercentage(productivityReport.productivity.attendanceRate)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Eficiencia</p>
              <p className="text-3xl font-bold text-foreground">
                {formatPercentage(productivityReport.productivity.efficiency)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartComponent
              data={Object.fromEntries(
                productivityReport.topPerformers.slice(0, 8).map(p => [p.name, p.hours])
              )}
              type="bar"
              title="Top Performers (Horas)"
            />

            <ChartComponent
              data={Object.fromEntries(
                Object.entries(productivityReport.departmentProductivity).map(([dept, stats]) => [
                  dept || 'Sin departamento',
                  stats.totalHours
                ])
              )}
              type="doughnut"
              title="Productividad por Departamento"
            />
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && departmentReport && (
        <div className="space-y-6">
          {/* Header with Export Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Reporte de Departamentos</h2>
            <button
              onClick={() => exportDetailedReport('departments')}
              disabled={exportLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(departmentReport.summary.totalEmployees)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Departamentos</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(departmentReport.summary.totalDepartments)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-muted-foreground">Promedio por Departamento</p>
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(departmentReport.summary.averageEmployeesPerDepartment)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartComponent
              data={Object.fromEntries(
                departmentReport.summary.departmentBreakdown.map(dept => [
                  dept.name,
                  dept.employeeCount
                ])
              )}
              type="doughnut"
              title="Empleados por Departamento"
            />

            <ChartComponent
              data={Object.fromEntries(
                departmentReport.summary.departmentBreakdown.map(dept => [
                  dept.name,
                  dept.percentage
                ])
              )}
              type="bar"
              title="Distribución por Departamento (%)"
            />
          </div>
        </div>
      )}

      {/* Location Tab */}
      {activeTab === 'location' && locationReport && (
        <div className="space-y-6">
          {/* Header with Export Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">Reporte de Ubicación</h2>
              {(filters.selectedUsers.length > 0 || filters.selectedDepartments.length > 0 || filters.selectedRoles.length > 0) && (
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Filtros activos
                </span>
              )}
            </div>
            <button
              onClick={() => exportDetailedReport('location')}
              disabled={exportLoading}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Fichajes con Ubicación</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(locationReport.summary.totalWithLocation)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sin Ubicación</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(locationReport.summary.totalWithoutLocation)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasa de Cumplimiento</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatPercentage(locationReport.summary.complianceRate)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empleados Activos</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatNumber(locationReport.summary.activeEmployees)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartComponent
              data={{
                'Con Ubicación': locationReport.summary.totalWithLocation,
                'Sin Ubicación': locationReport.summary.totalWithoutLocation
              }}
              type="doughnut"
              title="Fichajes por Ubicación"
            />

            <ChartComponent
              data={Object.fromEntries(
                locationReport.employeeCompliance.map(emp => [
                  emp.name,
                  emp.complianceRate
                ])
              )}
              type="bar"
              title="Cumplimiento por Empleado (%)"
            />
          </div>

          {/* Employee List */}
          <div className="card">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Cumplimiento por Empleado
                </h3>
                <button
                  onClick={() => exportDetailedReport('location')}
                  disabled={exportLoading}
                  className="btn btn-outline btn-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exportLoading ? 'Exportando...' : 'Exportar'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 font-medium">Empleado</th>
                    <th className="text-left p-4 font-medium">Departamento</th>
                    <th className="text-left p-4 font-medium">Total Fichajes</th>
                    <th className="text-left p-4 font-medium">Con Ubicación</th>
                    <th className="text-left p-4 font-medium">Sin Ubicación</th>
                    <th className="text-left p-4 font-medium">Cumplimiento</th>
                    <th className="text-left p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {locationReport.employeeCompliance.map((employee) => (
                    <tr key={employee.userId} className="border-b border-border hover:bg-secondary/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {employee.avatar_url ? (
                            <img 
                              src={employee.avatar_url} 
                              alt={employee.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {employee.department || 'Sin departamento'}
                      </td>
                      <td className="p-4">
                        <span className="font-medium">{employee.totalEntries}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-600 font-medium">{employee.withLocation}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-red-600 font-medium">{employee.withoutLocation}</span>
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${
                          employee.complianceRate >= 80 ? 'text-green-600' :
                          employee.complianceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(employee.complianceRate)}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openEmployeeModal(employee)}
                          className="btn btn-ghost btn-sm flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {selectedEmployee.avatar_url ? (
                  <img 
                    src={selectedEmployee.avatar_url} 
                    alt={selectedEmployee.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Detalles de Ubicación - {selectedEmployee.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Período: {startDate} a {endDate}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEmployeeModal}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Fichajes</p>
                  <p className="text-2xl font-bold text-foreground">{selectedEmployee.totalEntries}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm font-medium text-muted-foreground">Con Ubicación</p>
                  <p className="text-2xl font-bold text-green-600">{selectedEmployee.withLocation}</p>
                </div>
                <div className="card p-4">
                  <p className="text-sm font-medium text-muted-foreground">Sin Ubicación</p>
                  <p className="text-2xl font-bold text-red-600">{selectedEmployee.withoutLocation}</p>
                </div>
              </div>
              
              {selectedEmployee.timeEntries && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Fichajes Recientes</h4>
                  <div className="space-y-2">
                    {selectedEmployee.timeEntries.slice(0, 10).map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {new Date(entry.created_at).toLocaleDateString('es-ES')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleTimeString('es-ES')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.location ? (
                            <span className="text-green-600 text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Con ubicación
                            </span>
                          ) : (
                            <span className="text-red-600 text-sm flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Sin ubicación
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 