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
  Activity
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

  React.useEffect(() => {
    loadReports();
  }, [dateRange]);

  React.useEffect(() => {
    // Establecer fechas por defecto
    const now = new Date();
    const start = ReportsService.getStartDate(dateRange);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [dateRange]);

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
        // Cargar estadísticas generales
        const stats = await ReportsService.getCompanyStats(userRole.company_id, dateRange);
        setCompanyStats(stats);

        // Cargar reportes específicos si hay fechas seleccionadas
        if (startDate && endDate) {
          const [attendance, requests, productivity, departments] = await Promise.all([
            ReportsService.getAttendanceReport(userRole.company_id, startDate, endDate),
            ReportsService.getRequestsReport(userRole.company_id, startDate, endDate),
            ReportsService.getProductivityReport(userRole.company_id, startDate, endDate),
            ReportsService.getDepartmentReport(userRole.company_id)
          ]);

          setAttendanceReport(attendance);
          setRequestsReport(requests);
          setProductivityReport(productivity);
          setDepartmentReport(departments);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
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
        <button
          onClick={loadReports}
          className="btn btn-outline flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

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
      <div className="flex border-b border-border">
        {[
          { id: 'overview', label: 'Vista General', icon: BarChart3 },
          { id: 'attendance', label: 'Asistencia', icon: Clock },
          { id: 'requests', label: 'Solicitudes', icon: FileText },
          { id: 'productivity', label: 'Productividad', icon: TrendingUp },
          { id: 'departments', label: 'Departamentos', icon: Building2 }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
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
                      <tr key={stat.name}>
                        <td className="td">{stat.name}</td>
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
    </div>
  );
} 