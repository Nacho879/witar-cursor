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

      // Obtener los perfiles de usuario por separado
      const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
      }

      // Combinar los datos
      const timeEntriesWithProfiles = timeEntries.map(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id);
        return {
          ...entry,
          user_profiles: profile || null
        };
      });

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
          total: timeEntriesWithProfiles?.length || 0,
          totalHours: this.calculateTotalHours(timeEntriesWithProfiles),
          averageHoursPerDay: this.calculateAverageHoursPerDay(timeEntriesWithProfiles),
          byEmployee: this.groupTimeEntriesByEmployee(timeEntriesWithProfiles),
          byDate: this.groupTimeEntriesByDate(timeEntriesWithProfiles)
        },
        requests: {
          total: requests?.length || 0,
          byStatus: this.groupRequestsByStatus(requests),
          byType: this.groupRequestsByType(requests),
          byEmployee: this.groupRequestsByEmployee(requests)
        },
        productivity: {
          averageAttendance: this.calculateAverageAttendance(timeEntriesWithProfiles, employees),
          topPerformers: this.getTopPerformers(timeEntriesWithProfiles, employees),
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
  static async getAttendanceReport(companyId, startDate, endDate, employeeId = null, filters = {}) {
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      // Aplicar filtros
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        query = query.in('user_id', filters.selectedUsers);
      } else if (employeeId) {
        query = query.eq('user_id', employeeId);
      }

      const { data: timeEntries, error } = await query;

      if (error) throw error;

      // Obtener los perfiles de usuario por separado
      const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
      }

      // Combinar los datos
      const timeEntriesWithProfiles = timeEntries.map(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id);
        return {
          ...entry,
          user_profiles: profile || null
        };
      });

      // Filtrar por departamentos y roles si es necesario
      let filteredEntries = timeEntriesWithProfiles;
      
      if (filters && ((filters.selectedDepartments && filters.selectedDepartments.length > 0) || 
          (filters.selectedRoles && filters.selectedRoles.length > 0))) {
        
        // Obtener información de roles y departamentos
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, role, department_id')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (!rolesError && userRoles) {
          filteredEntries = timeEntriesWithProfiles.filter(entry => {
            const userRole = userRoles.find(ur => ur.user_id === entry.user_id);
            if (!userRole) return false;

            // Filtrar por departamentos
            if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
              if (!userRole.department_id || !filters.selectedDepartments.includes(userRole.department_id)) {
                return false;
              }
            }

            // Filtrar por roles
            if (filters.selectedRoles && filters.selectedRoles.length > 0) {
              if (!filters.selectedRoles.includes(userRole.role)) {
                return false;
              }
            }

            return true;
          });
        }
      }

      return {
        timeEntries: filteredEntries || [],
        summary: this.generateAttendanceSummary(filteredEntries),
        dailyStats: this.generateDailyStats(filteredEntries, startDate, endDate),
        employeeStats: this.generateEmployeeStats(filteredEntries)
      };
    } catch (error) {
      console.error('Error getting attendance report:', error);
      throw error;
    }
  }

  // Obtener reporte de solicitudes
  static async getRequestsReport(companyId, startDate, endDate, status = null, type = null, filters = {}) {
    try {
      let query = supabase
        .from('requests')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      // Aplicar filtros de usuarios
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        query = query.in('user_id', filters.selectedUsers);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data: requests, error } = await query;

      if (error) throw error;

      // Filtrar por departamentos y roles si es necesario
      let filteredRequests = requests;
      
      if (filters && ((filters.selectedDepartments && filters.selectedDepartments.length > 0) || 
          (filters.selectedRoles && filters.selectedRoles.length > 0))) {
        
        // Obtener información de roles y departamentos
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, role, department_id')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (!rolesError && userRoles) {
          const filteredUserIds = userRoles.filter(ur => {
            // Filtrar por departamentos
            if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
              if (!ur.department_id || !filters.selectedDepartments.includes(ur.department_id)) {
                return false;
              }
            }

            // Filtrar por roles
            if (filters.selectedRoles && filters.selectedRoles.length > 0) {
              if (!filters.selectedRoles.includes(ur.role)) {
                return false;
              }
            }

            return true;
          }).map(ur => ur.user_id);

          filteredRequests = requests.filter(req => filteredUserIds.includes(req.user_id));
        }
      }

      return {
        requests: filteredRequests || [],
        summary: this.generateRequestsSummary(filteredRequests),
        byStatus: this.groupRequestsByStatus(filteredRequests),
        byType: this.groupRequestsByType(filteredRequests),
        byDepartment: this.groupRequestsByDepartment(filteredRequests),
        approvalTime: this.calculateAverageApprovalTime(filteredRequests)
      };
    } catch (error) {
      console.error('Error getting requests report:', error);
      throw error;
    }
  }

  // Obtener reporte de productividad
  static async getProductivityReport(companyId, startDate, endDate, filters = {}) {
    try {
      // Obtener fichajes
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Aplicar filtros de usuarios
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        query = query.in('user_id', filters.selectedUsers);
      }

      const { data: timeEntries, error: timeEntriesError } = await query;

      if (timeEntriesError) throw timeEntriesError;

      // Obtener los perfiles de usuario por separado
      const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading user profiles:', profilesError);
      }

      // Combinar los datos
      const timeEntriesWithProfiles = timeEntries.map(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id);
        return {
          ...entry,
          user_profiles: profile || null
        };
      });

      // Obtener empleados
      let employeesQuery = supabase
        .from('user_company_roles')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Aplicar filtros de usuarios a empleados
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        employeesQuery = employeesQuery.in('user_id', filters.selectedUsers);
      }

      const { data: employees, error: employeesError } = await employeesQuery;

      if (employeesError) throw employeesError;

      // Filtrar por departamentos y roles si es necesario
      let filteredEmployees = employees;
      let filteredEntries = timeEntriesWithProfiles;
      
      if (filters && ((filters.selectedDepartments && filters.selectedDepartments.length > 0) || 
          (filters.selectedRoles && filters.selectedRoles.length > 0))) {
        
        // Obtener información de roles y departamentos
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, role, department_id')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (!rolesError && userRoles) {
          const filteredUserIds = userRoles.filter(ur => {
            // Filtrar por departamentos
            if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
              if (!ur.department_id || !filters.selectedDepartments.includes(ur.department_id)) {
                return false;
              }
            }

            // Filtrar por roles
            if (filters.selectedRoles && filters.selectedRoles.length > 0) {
              if (!filters.selectedRoles.includes(ur.role)) {
                return false;
              }
            }

            return true;
          }).map(ur => ur.user_id);

          filteredEmployees = employees.filter(emp => filteredUserIds.includes(emp.user_id));
          filteredEntries = timeEntriesWithProfiles.filter(entry => filteredUserIds.includes(entry.user_id));
        }
      }

      return {
        productivity: this.calculateProductivityMetrics(filteredEntries, filteredEmployees),
        topPerformers: this.getTopPerformers(filteredEntries, filteredEmployees),
        departmentProductivity: this.calculateDepartmentProductivity(filteredEntries),
        trends: this.calculateProductivityTrends(filteredEntries, startDate, endDate)
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
        .select('*')
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

  // Obtener reporte de ubicación
  static async getLocationReport(companyId, startDate, endDate, filters = {}) {
    try {
      // Obtener fichajes con información de ubicación
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Aplicar filtros de usuarios
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        query = query.in('user_id', filters.selectedUsers);
      }

      const { data: timeEntries, error: timeEntriesError } = await query;

      if (timeEntriesError) throw timeEntriesError;

      // Obtener empleados activos
      let employeesQuery = supabase
        .from('user_company_roles')
        .select('user_id, department_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .neq('role', 'owner');

      // Aplicar filtros de usuarios a empleados
      if (filters && filters.selectedUsers && filters.selectedUsers.length > 0) {
        employeesQuery = employeesQuery.in('user_id', filters.selectedUsers);
      }

      const { data: employees, error: employeesError } = await employeesQuery;

      if (employeesError) throw employeesError;

      // Obtener perfiles de empleados por separado
      const userIds = employees.map(emp => emp.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Obtener departamentos por separado
      const departmentIds = employees.map(emp => emp.department_id).filter(id => id);
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      if (deptError) {
        console.error('Error loading departments:', deptError);
      }

      // Filtrar por departamentos y roles si es necesario
      let filteredEmployees = employees;
      
      if (filters && ((filters.selectedDepartments && filters.selectedDepartments.length > 0) || 
          (filters.selectedRoles && filters.selectedRoles.length > 0))) {
        
        // Obtener información completa de roles y departamentos
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id, role, department_id')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (!rolesError && userRoles) {
          const filteredUserIds = userRoles.filter(ur => {
            // Filtrar por departamentos
            if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
              if (!ur.department_id || !filters.selectedDepartments.includes(ur.department_id)) {
                return false;
              }
            }

            // Filtrar por roles
            if (filters.selectedRoles && filters.selectedRoles.length > 0) {
              if (!filters.selectedRoles.includes(ur.role)) {
                return false;
              }
            }

            return true;
          }).map(ur => ur.user_id);

          filteredEmployees = employees.filter(emp => filteredUserIds.includes(emp.user_id));
        }
      }

      // Calcular estadísticas de ubicación
      const withLocation = timeEntries.filter(entry => entry.location_lat && entry.location_lng).length;
      const withoutLocation = timeEntries.filter(entry => !entry.location_lat || !entry.location_lng).length;
      const totalEntries = timeEntries.length;
      const complianceRate = totalEntries > 0 ? (withLocation / totalEntries) * 100 : 0;

      // Calcular cumplimiento por empleado
      const employeeCompliance = filteredEmployees.map(employee => {
        const profile = profiles.find(p => p.user_id === employee.user_id);
        const department = departments?.find(d => d.id === employee.department_id);
        const employeeEntries = timeEntries.filter(entry => entry.user_id === employee.user_id);
        const employeeWithLocation = employeeEntries.filter(entry => entry.location_lat && entry.location_lng).length;
        const employeeWithoutLocation = employeeEntries.filter(entry => !entry.location_lat || !entry.location_lng).length;
        const employeeTotal = employeeEntries.length;
        const employeeComplianceRate = employeeTotal > 0 ? (employeeWithLocation / employeeTotal) * 100 : 0;

        return {
          userId: employee.user_id,
          name: profile?.full_name || 'Empleado desconocido',
          avatar_url: profile?.avatar_url || null,
          department: department?.name || 'Sin departamento',
          totalEntries: employeeTotal,
          withLocation: employeeWithLocation,
          withoutLocation: employeeWithoutLocation,
          complianceRate: employeeComplianceRate,
          timeEntries: employeeEntries.slice(0, 10) // Últimos 10 fichajes para el modal
        };
      });

      return {
        summary: {
          totalWithLocation: withLocation,
          totalWithoutLocation: withoutLocation,
          totalEntries: totalEntries,
          complianceRate: complianceRate,
          activeEmployees: filteredEmployees.length
        },
        employeeCompliance: employeeCompliance.sort((a, b) => b.complianceRate - a.complianceRate)
      };
    } catch (error) {
      console.error('Error getting location report:', error);
      throw error;
    }
  }

  // Obtener reporte detallado de ubicación para exportar
  static async getDetailedLocationReport(companyId, startDate, endDate) {
    try {
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return timeEntries.map(entry => ({
        'Fecha': new Date(entry.created_at).toLocaleDateString('es-ES'),
        'Hora': new Date(entry.created_at).toLocaleTimeString('es-ES'),
        'Empleado': entry.user_profiles?.full_name || 'N/A',
        'Departamento': entry.departments?.name || 'N/A',
        'Tipo': entry.type || 'N/A',
        'Ubicación': entry.location ? 'Sí' : 'No',
        'Coordenadas': entry.location ? `${entry.latitude}, ${entry.longitude}` : 'N/A',
        'Dirección': entry.location_address || 'N/A'
      }));
    } catch (error) {
      console.error('Error getting detailed location report:', error);
      throw error;
    }
  }

  // Obtener reporte detallado de asistencia para exportar
  static async getDetailedAttendanceReport(companyId, startDate, endDate) {
    try {
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return timeEntries.map(entry => ({
        'Fecha': new Date(entry.created_at).toLocaleDateString('es-ES'),
        'Hora': new Date(entry.created_at).toLocaleTimeString('es-ES'),
        'Empleado': entry.user_profiles?.full_name || 'N/A',
        'Departamento': entry.departments?.name || 'N/A',
        'Tipo': entry.type || 'N/A',
        'Duración': entry.duration ? `${Math.round(entry.duration / 60)} min` : 'N/A',
        'Ubicación': entry.location ? 'Sí' : 'No'
      }));
    } catch (error) {
      console.error('Error getting detailed attendance report:', error);
      throw error;
    }
  }

  // Obtener reporte detallado de solicitudes para exportar
  static async getDetailedRequestsReport(companyId, startDate, endDate) {
    try {
      const { data: requests, error } = await supabase
        .from('requests')
        .select(`
          *,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return requests.map(request => ({
        'Fecha': new Date(request.created_at).toLocaleDateString('es-ES'),
        'Empleado': request.user_profiles?.full_name || 'N/A',
        'Departamento': request.departments?.name || 'N/A',
        'Tipo': request.type || 'N/A',
        'Estado': request.status || 'N/A',
        'Descripción': request.description || 'N/A',
        'Fecha de Resolución': request.resolved_at ? new Date(request.resolved_at).toLocaleDateString('es-ES') : 'Pendiente'
      }));
    } catch (error) {
      console.error('Error getting detailed requests report:', error);
      throw error;
    }
  }

  // Obtener reporte detallado de productividad para exportar
  static async getDetailedProductivityReport(companyId, startDate, endDate) {
    try {
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Agrupar por empleado
      const employeeStats = {};
      timeEntries.forEach(entry => {
        const employeeId = entry.user_id;
        if (!employeeStats[employeeId]) {
          employeeStats[employeeId] = {
            name: entry.user_profiles?.full_name || 'N/A',
            department: entry.departments?.name || 'N/A',
            totalHours: 0,
            totalEntries: 0,
            averageHoursPerDay: 0
          };
        }
        employeeStats[employeeId].totalHours += entry.duration || 0;
        employeeStats[employeeId].totalEntries += 1;
      });

      // Calcular promedios
      Object.values(employeeStats).forEach(employee => {
        employee.totalHours = Math.round(employee.totalHours / 60 * 100) / 100; // Convertir a horas
        employee.averageHoursPerDay = employee.totalEntries > 0 ? 
          Math.round((employee.totalHours / employee.totalEntries) * 100) / 100 : 0;
      });

      return Object.values(employeeStats).map(employee => ({
        'Empleado': employee.name,
        'Departamento': employee.department,
        'Total Horas': `${employee.totalHours}h`,
        'Total Fichajes': employee.totalEntries,
        'Promedio por Día': `${employee.averageHoursPerDay}h`
      }));
    } catch (error) {
      console.error('Error getting detailed productivity report:', error);
      throw error;
    }
  }

  // Obtener reporte detallado de departamentos para exportar
  static async getDetailedDepartmentReport(companyId) {
    try {
      const { data: employees, error } = await supabase
        .from('user_company_roles')
        .select(`
          *,
          user_profiles (
            full_name
          ),
          departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return employees.map(employee => ({
        'Empleado': employee.user_profiles?.full_name || 'N/A',
        'Departamento': employee.departments?.name || 'Sin departamento',
        'Rol': employee.role || 'N/A',
        'Fecha de Ingreso': new Date(employee.joined_at).toLocaleDateString('es-ES'),
        'Estado': employee.is_active ? 'Activo' : 'Inactivo',
        'Supervisor': employee.supervisor_id ? 'Sí' : 'No'
      }));
    } catch (error) {
      console.error('Error getting detailed department report:', error);
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
      // Usar el nombre real del usuario si está disponible, sino usar el ID
      const employeeName = entry.user_profiles?.full_name || `Empleado ${entry.user_id}`;
      const employeeAvatar = entry.user_profiles?.avatar_url || null;
      const employeeId = entry.user_id;
      
      if (!employeeHours[employeeId]) {
        employeeHours[employeeId] = {
          id: employeeId,
          name: employeeName,
          avatar_url: employeeAvatar,
          hours: 0
        };
      }
      
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        employeeHours[employeeId].hours += duration / (1000 * 60 * 60);
      }
    });
    
    return Object.values(employeeHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }

  static async getDepartmentStats(companyId, startDate = null) {
    try {
      let query = supabase
        .from('departments')
        .select('*')
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
        employeeCount: 0, // Por ahora no contamos empleados por departamento
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
      // Usar el nombre real del usuario si está disponible, sino usar el ID
      const employeeName = entry.user_profiles?.full_name || `Empleado ${entry.user_id}`;
      const employeeAvatar = entry.user_profiles?.avatar_url || null;
      const employeeId = entry.user_id;
      
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          id: employeeId,
          name: employeeName,
          avatar_url: employeeAvatar,
          entries: 0,
          totalHours: 0,
          averageHours: 0
        };
      }
      
      employeeStats[employeeId].entries++;
      
      if (entry.clock_out && entry.clock_in) {
        const duration = new Date(entry.clock_out) - new Date(entry.clock_in);
        employeeStats[employeeId].totalHours += duration / (1000 * 60 * 60);
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
      const deptName = 'Sin departamento';
      
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