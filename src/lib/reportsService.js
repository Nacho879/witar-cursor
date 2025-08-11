import { supabase } from './supabaseClient';

export class ReportsService {
  // Obtener estadísticas generales de la empresa
  static async getCompanyStats(companyId, dateRange = 'month') {
    try {
      const startDate = this.getStartDate(dateRange);
      
      // Estadísticas de empleados
      const { data: employees, error: employeesError } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      // Estadísticas de fichajes
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString());

      if (timeEntriesError) throw timeEntriesError;

      // Estadísticas de solicitudes
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString());

      if (requestsError) throw requestsError;

      // Calcular estadísticas
      const stats = {
        employees: {
          total: employees?.length || 0,
          byRole: this.groupByRole(employees),
          byDepartment: await this.getEmployeesByDepartment(companyId)
        },
        timeEntries: {
          total: timeEntries?.length || 0,
          totalHours: this.calculateTotalHours(timeEntries),
          averageHoursPerDay: this.calculateAverageHoursPerDay(timeEntries),
          byEmployee: this.groupTimeEntriesByEmployee(timeEntries),
          byDate: this.groupTimeEntriesByDate(timeEntries)
        },
        requests: {
          total: requests?.length || 0,
          byStatus: this.groupRequestsByStatus(requests),
          byType: this.groupRequestsByType(requests),
          byEmployee: this.groupRequestsByEmployee(requests)
        },
        productivity: {
          averageAttendance: this.calculateAverageAttendance(timeEntries, employees),
          topPerformers: this.getTopPerformers(timeEntries, employees),
          departmentStats: await this.getDepartmentStats(companyId, startDate)
        }
      };

      return stats;
    } catch (error) {
      console.error('Error getting company stats:', error);
      throw error;
    }
  }

  // Obtener reporte de asistencia
  static async getAttendanceReport(companyId, startDate, endDate, employeeId = null) {
    try {
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          user_company_roles!time_entries_user_id_fkey (
            user_profiles (
              full_name,
              email
            ),
            departments (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (employeeId) {
        query = query.eq('user_id', employeeId);
      }

      const { data: timeEntries, error } = await query;

      if (error) throw error;

      return {
        timeEntries: timeEntries || [],
        summary: this.generateAttendanceSummary(timeEntries),
        dailyStats: this.generateDailyStats(timeEntries, startDate, endDate),
        employeeStats: this.generateEmployeeStats(timeEntries)
      };
    } catch (error) {
      console.error('Error getting attendance report:', error);
      throw error;
    }
  }

  // Obtener reporte de solicitudes
  static async getRequestsReport(companyId, startDate, endDate, status = null, type = null) {
    try {
      let query = supabase
        .from('requests')
        .select(`
          *,
          user_company_roles!requests_user_id_fkey (
            user_profiles (
              full_name,
              email
            ),
            departments (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data: requests, error } = await query;

      if (error) throw error;

      return {
        requests: requests || [],
        summary: this.generateRequestsSummary(requests),
        byStatus: this.groupRequestsByStatus(requests),
        byType: this.groupRequestsByType(requests),
        byDepartment: this.groupRequestsByDepartment(requests),
        approvalTime: this.calculateAverageApprovalTime(requests)
      };
    } catch (error) {
      console.error('Error getting requests report:', error);
      throw error;
    }
  }

  // Obtener reporte de productividad
  static async getProductivityReport(companyId, startDate, endDate) {
    try {
      // Obtener fichajes
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_company_roles!time_entries_user_id_fkey (
            user_profiles (
              full_name,
              email
            ),
            departments (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (timeEntriesError) throw timeEntriesError;

      // Obtener empleados
      const { data: employees, error: employeesError } = await supabase
        .from('user_company_roles')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      return {
        productivity: this.calculateProductivityMetrics(timeEntries, employees),
        topPerformers: this.getTopPerformers(timeEntries, employees),
        departmentProductivity: this.calculateDepartmentProductivity(timeEntries),
        trends: this.calculateProductivityTrends(timeEntries, startDate, endDate)
      };
    } catch (error) {
      console.error('Error getting productivity report:', error);
      throw error;
    }
  }

  // Obtener reporte de departamentos
  static async getDepartmentReport(companyId, departmentId = null) {
    try {
      let query = supabase
        .from('user_company_roles')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          ),
          departments (
            name,
            description
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data: employees, error } = await query;

      if (error) throw error;

      // Obtener estadísticas de fichajes por departamento
      const departmentStats = await this.getDepartmentStats(companyId);

      return {
        employees: employees || [],
        departmentStats,
        summary: this.generateDepartmentSummary(employees, departmentStats)
      };
    } catch (error) {
      console.error('Error getting department report:', error);
      throw error;
    }
  }

  // Exportar reporte a CSV
  static exportToCSV(data, filename) {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Convertir datos a formato CSV
  static convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Funciones auxiliares
  static getStartDate(range) {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  static groupByRole(employees) {
    if (!employees) return {};
    return employees.reduce((acc, employee) => {
      acc[employee.role] = (acc[employee.role] || 0) + 1;
      return acc;
    }, {});
  }

  static async getEmployeesByDepartment(companyId) {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(`
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.reduce((acc, employee) => {
        const deptName = employee.departments?.name || 'Sin departamento';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {}) || {};
    } catch (error) {
      console.error('Error getting employees by department:', error);
      return {};
    }
  }

  static calculateTotalHours(timeEntries) {
    if (!timeEntries) return 0;
    
    return timeEntries.reduce((total, entry) => {
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        return total + (duration / (1000 * 60 * 60)); // Convertir a horas
      }
      return total;
    }, 0);
  }

  static calculateAverageHoursPerDay(timeEntries) {
    if (!timeEntries || timeEntries.length === 0) return 0;
    
    const totalHours = this.calculateTotalHours(timeEntries);
    const uniqueDays = new Set(timeEntries.map(entry => 
      new Date(entry.created_at).toDateString()
    )).size;
    
    return uniqueDays > 0 ? totalHours / uniqueDays : 0;
  }

  static groupTimeEntriesByEmployee(timeEntries) {
    if (!timeEntries) return {};
    
    return timeEntries.reduce((acc, entry) => {
      const employeeName = entry.user_company_roles?.user_profiles?.full_name || 'Desconocido';
      if (!acc[employeeName]) {
        acc[employeeName] = [];
      }
      acc[employeeName].push(entry);
      return acc;
    }, {});
  }

  static groupTimeEntriesByDate(timeEntries) {
    if (!timeEntries) return {};
    
    return timeEntries.reduce((acc, entry) => {
      const date = new Date(entry.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {});
  }

  static groupRequestsByStatus(requests) {
    if (!requests) return {};
    
    return requests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
  }

  static groupRequestsByType(requests) {
    if (!requests) return {};
    
    return requests.reduce((acc, request) => {
      acc[request.type] = (acc[request.type] || 0) + 1;
      return acc;
    }, {});
  }

  static groupRequestsByEmployee(requests) {
    if (!requests) return {};
    
    return requests.reduce((acc, request) => {
      const employeeName = request.user_company_roles?.user_profiles?.full_name || 'Desconocido';
      if (!acc[employeeName]) {
        acc[employeeName] = [];
      }
      acc[employeeName].push(request);
      return acc;
    }, {});
  }

  static groupRequestsByDepartment(requests) {
    if (!requests) return {};
    
    return requests.reduce((acc, request) => {
      const deptName = request.user_company_roles?.departments?.name || 'Sin departamento';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {});
  }

  static calculateAverageAttendance(timeEntries, employees) {
    if (!timeEntries || !employees) return 0;
    
    const totalDays = new Set(timeEntries.map(entry => 
      new Date(entry.created_at).toDateString()
    )).size;
    
    const totalPossibleAttendance = employees.length * totalDays;
    const actualAttendance = timeEntries.length;
    
    return totalPossibleAttendance > 0 ? (actualAttendance / totalPossibleAttendance) * 100 : 0;
  }

  static getTopPerformers(timeEntries, employees) {
    if (!timeEntries || !employees) return [];
    
    const employeeHours = {};
    
    timeEntries.forEach(entry => {
      const employeeName = entry.user_company_roles?.user_profiles?.full_name || 'Desconocido';
      if (!employeeHours[employeeName]) {
        employeeHours[employeeName] = 0;
      }
      
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        employeeHours[employeeName] += duration / (1000 * 60 * 60);
      }
    });
    
    return Object.entries(employeeHours)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }

  static async getDepartmentStats(companyId, startDate = null) {
    try {
      let query = supabase
        .from('departments')
        .select(`
          *,
          user_company_roles (
            user_profiles (
              full_name
            )
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (startDate) {
        // Aquí podrías agregar filtros adicionales por fecha
      }

      const { data: departments, error } = await query;

      if (error) throw error;

      return departments?.map(dept => ({
        id: dept.id,
        name: dept.name,
        employeeCount: dept.user_company_roles?.length || 0,
        description: dept.description
      })) || [];
    } catch (error) {
      console.error('Error getting department stats:', error);
      return [];
    }
  }

  static generateAttendanceSummary(timeEntries) {
    if (!timeEntries) return {};

    const totalEntries = timeEntries.length;
    const totalHours = this.calculateTotalHours(timeEntries);
    const averageHoursPerDay = this.calculateAverageHoursPerDay(timeEntries);

    return {
      totalEntries,
      totalHours,
      averageHoursPerDay,
      averageHoursPerEmployee: totalHours / (new Set(timeEntries.map(e => e.user_id)).size)
    };
  }

  static generateDailyStats(timeEntries, startDate, endDate) {
    if (!timeEntries) return [];

    const dailyStats = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toDateString();
      const dayEntries = timeEntries.filter(entry => 
        new Date(entry.created_at).toDateString() === dateStr
      );

      dailyStats.push({
        date: currentDate.toISOString().split('T')[0],
        entries: dayEntries.length,
        hours: this.calculateTotalHours(dayEntries),
        employees: new Set(dayEntries.map(e => e.user_id)).size
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyStats;
  }

  static generateEmployeeStats(timeEntries) {
    if (!timeEntries) return [];

    const employeeStats = {};
    
    timeEntries.forEach(entry => {
      const employeeName = entry.user_company_roles?.user_profiles?.full_name || 'Desconocido';
      
      if (!employeeStats[employeeName]) {
        employeeStats[employeeName] = {
          name: employeeName,
          entries: 0,
          totalHours: 0,
          averageHours: 0
        };
      }
      
      employeeStats[employeeName].entries++;
      
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        employeeStats[employeeName].totalHours += duration / (1000 * 60 * 60);
      }
    });

    // Calcular promedios
    Object.values(employeeStats).forEach(stat => {
      stat.averageHours = stat.entries > 0 ? stat.totalHours / stat.entries : 0;
    });

    return Object.values(employeeStats).sort((a, b) => b.totalHours - a.totalHours);
  }

  static generateRequestsSummary(requests) {
    if (!requests) return {};

    const total = requests.length;
    const byStatus = this.groupRequestsByStatus(requests);
    const byType = this.groupRequestsByType(requests);

    return {
      total,
      byStatus,
      byType,
      approvalRate: byStatus.approved ? (byStatus.approved / total) * 100 : 0
    };
  }

  static calculateAverageApprovalTime(requests) {
    if (!requests) return 0;

    const approvedRequests = requests.filter(req => 
      req.status === 'approved' && req.updated_at && req.created_at
    );

    if (approvedRequests.length === 0) return 0;

    const totalTime = approvedRequests.reduce((total, req) => {
      const approvalTime = new Date(req.updated_at) - new Date(req.created_at);
      return total + approvalTime;
    }, 0);

    return totalTime / approvedRequests.length / (1000 * 60 * 60); // En horas
  }

  static calculateProductivityMetrics(timeEntries, employees) {
    if (!timeEntries || !employees) return {};

    const totalHours = this.calculateTotalHours(timeEntries);
    const averageHoursPerEmployee = totalHours / employees.length;
    const attendanceRate = this.calculateAverageAttendance(timeEntries, employees);

    return {
      totalHours,
      averageHoursPerEmployee,
      attendanceRate,
      efficiency: attendanceRate > 0 ? (totalHours / (employees.length * 8 * 22)) * 100 : 0 // Asumiendo 8h/día, 22 días/mes
    };
  }

  static calculateDepartmentProductivity(timeEntries) {
    if (!timeEntries) return {};

    const deptStats = {};
    
    timeEntries.forEach(entry => {
      const deptName = entry.user_company_roles?.departments?.name || 'Sin departamento';
      
      if (!deptStats[deptName]) {
        deptStats[deptName] = {
          name: deptName,
          totalHours: 0,
          employeeCount: 0,
          averageHours: 0
        };
      }
      
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        deptStats[deptName].totalHours += duration / (1000 * 60 * 60);
      }
    });

    // Calcular promedios
    Object.values(deptStats).forEach(stat => {
      stat.averageHours = stat.employeeCount > 0 ? stat.totalHours / stat.employeeCount : 0;
    });

    return deptStats;
  }

  static calculateProductivityTrends(timeEntries, startDate, endDate) {
    if (!timeEntries) return [];

    const trends = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toDateString();
      const dayEntries = timeEntries.filter(entry => 
        new Date(entry.created_at).toDateString() === dateStr
      );

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        productivity: this.calculateTotalHours(dayEntries),
        employees: new Set(dayEntries.map(e => e.user_id)).size
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  static generateDepartmentSummary(employees, departmentStats) {
    if (!employees) return {};

    const summary = {
      totalEmployees: employees.length,
      totalDepartments: departmentStats.length,
      averageEmployeesPerDepartment: employees.length / Math.max(departmentStats.length, 1),
      departmentBreakdown: departmentStats.map(dept => ({
        name: dept.name,
        employeeCount: dept.employeeCount,
        percentage: (dept.employeeCount / employees.length) * 100
      }))
    };

    return summary;
  }
} 