import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  Calendar, 
  Filter,
  Download,
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  Search,
  Edit,
  ChevronDown
} from 'lucide-react';
import TimeEntryEditRequestModal from '@/components/TimeEntryEditRequestModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MyTimeEntries() {
  const [timeEntries, setTimeEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stats, setStats] = React.useState({
    totalHours: 0,
    totalDays: 0,
    averageHours: 0
  });
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = React.useState(null);
  const [filterType, setFilterType] = React.useState('day'); // 'day', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [exportLoading, setExportLoading] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState(null);
  const [companyInfo, setCompanyInfo] = React.useState(null);
  const [managerInfo, setManagerInfo] = React.useState(null);

  React.useEffect(() => {
    loadTimeEntries();
    loadUserAndCompanyInfo();
    
    // Configurar suscripción en tiempo real para time_entries
    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return null;
        }


        
        const timeEntriesSubscription = supabase
          .channel('time_entries_changes_my_entries')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'time_entries',
              filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
              
              loadTimeEntries();
            }
          )
          .subscribe((status) => {
          });

        return timeEntriesSubscription;
      } catch (error) {
        console.error('❌ Error configurando suscripción:', error);
        return null;
      }
    };

    let subscription = null;
    setupRealtimeSubscription().then(sub => {
      subscription = sub;
    });

    // Intervalo de actualización periódica como respaldo (cada 30 segundos)
    const interval = setInterval(() => {
      loadTimeEntries();
    }, 30000);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      clearInterval(interval);
    };
  }, [selectedDate, filterType, customStartDate, customEndDate]);

  async function loadUserAndCompanyInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar perfil del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Cargar información del rol del usuario en la empresa
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select(`
          *,
          companies (
            id,
            name,
            description,
            address,
            phone,
            email,
            website,
            logo_url
          ),
          departments (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        setCompanyInfo(userRole.companies);

        // Cargar información del manager
        await loadManagerInfo(userRole);
      }
    } catch (error) {
      console.error('Error loading user and company info:', error);
    }
  }

  async function loadManagerInfo(userRole) {
    try {
      let managerId = null;
      
      if (userRole.department_id) {
        const { data: department } = await supabase
          .from('departments')
          .select('manager_id')
          .eq('id', userRole.department_id)
          .maybeSingle();
        
        if (department && department.manager_id) {
          managerId = department.manager_id;
        }
      }
      
      if (!managerId && userRole.supervisor_id) {
        const { data: managerRole } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('id', userRole.supervisor_id)
          .eq('is_active', true)
          .maybeSingle();

        if (managerRole) {
          managerId = managerRole.user_id;
        }
      }

      if (managerId) {
        const { data: managerUserRole } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('id', managerId)
          .eq('is_active', true)
          .maybeSingle();

        if (managerUserRole && managerUserRole.user_id) {
          const { data: managerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', managerUserRole.user_id)
            .maybeSingle();

          if (managerProfile) {
            try {
              const { data: emails } = await supabase.functions.invoke('get-user-emails', {
                body: { userIds: [managerUserRole.user_id] }
              });

              const managerEmail = emails?.emails && emails.emails.length > 0 ? emails.emails[0].email : null;

              setManagerInfo({
                ...managerProfile,
                role_id: managerUserRole.user_id,
                email: managerEmail
              });
            } catch (emailError) {
              setManagerInfo({
                ...managerProfile,
                role_id: managerUserRole.user_id
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading manager info:', error);
    }
  }

  function getDateRange() {
    const baseDate = new Date(selectedDate);
    
    switch (filterType) {
      case 'day':
        const dayStart = new Date(baseDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(baseDate);
        dayEnd.setHours(23, 59, 59, 999);
        return {
          start: dayStart,
          end: dayEnd
        };
      case 'week':
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 1, locale: es });
        const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1, locale: es });
        return {
          start: new Date(weekStart.setHours(0, 0, 0, 0)),
          end: new Date(weekEnd.setHours(23, 59, 59, 999))
        };
      case 'month':
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        return {
          start: new Date(monthStart.setHours(0, 0, 0, 0)),
          end: new Date(monthEnd.setHours(23, 59, 59, 999))
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          const customStart = new Date(customStartDate + 'T00:00:00');
          const customEnd = new Date(customEndDate + 'T23:59:59');
          return {
            start: customStart,
            end: customEnd
          };
        }
        // Fallback a día si no hay fechas personalizadas
        const fallbackStart = new Date(baseDate);
        fallbackStart.setHours(0, 0, 0, 0);
        const fallbackEnd = new Date(baseDate);
        fallbackEnd.setHours(23, 59, 59, 999);
        return {
          start: fallbackStart,
          end: fallbackEnd
        };
      default:
        const defaultStart = new Date(baseDate);
        defaultStart.setHours(0, 0, 0, 0);
        const defaultEnd = new Date(baseDate);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          start: defaultStart,
          end: defaultEnd
        };
    }
  }

  async function loadTimeEntries() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const dateRange = getDateRange();

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_time', dateRange.start.toISOString())
        .lte('entry_time', dateRange.end.toISOString())
        .order('entry_time', { ascending: true });

      if (error) {
        console.error('❌ Error cargando fichajes:', error);
        return;
      }

      if (data) {
        setTimeEntries(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('❌ Error en loadTimeEntries:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(entries) {
    if (entries.length === 0) {
      setStats({ totalHours: 0, totalDays: 0, averageHours: 0 });
      return;
    }

    let totalMinutes = 0;
    let clockInTime = null;
    let breakStartTime = null;
    let totalBreakMinutes = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      if (entry.entry_type === 'clock_in') {
        clockInTime = new Date(entry.entry_time);
      } else if (entry.entry_type === 'clock_out' && clockInTime) {
        const clockOutTime = new Date(entry.entry_time);
        const diffMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        totalMinutes += diffMinutes;
        clockInTime = null;
      } else if (entry.entry_type === 'break_start') {
        breakStartTime = new Date(entry.entry_time);
      } else if (entry.entry_type === 'break_end' && breakStartTime) {
        const breakEndTime = new Date(entry.entry_time);
        const breakMinutes = (breakEndTime - breakStartTime) / (1000 * 60);
        totalBreakMinutes += breakMinutes;
        breakStartTime = null;
      }
    }

    // Restar tiempo de pausas
    totalMinutes -= totalBreakMinutes;

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const totalDays = new Set(entries.map(e => e.entry_time.split('T')[0])).size;
    const averageHours = totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0;

    setStats({ totalHours, totalDays, averageHours });
  }

  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return { text: 'Entrada', icon: LogIn, color: 'text-green-600 bg-green-100' };
      case 'clock_out': return { text: 'Salida', icon: LogOut, color: 'text-red-600 bg-red-100' };
      case 'break_start': return { text: 'Inicio Pausa', icon: Coffee, color: 'text-yellow-600 bg-yellow-100' };
      case 'break_end': return { text: 'Fin Pausa', icon: Coffee, color: 'text-blue-600 bg-blue-100' };
      default: return { text: type, icon: Clock, color: 'text-gray-600 bg-gray-100' };
    }
  }

  function handleEditRequest(timeEntry) {
    setSelectedTimeEntry(timeEntry);
    setEditModalOpen(true);
  }

  function handleEditModalClose() {
    setEditModalOpen(false);
    setSelectedTimeEntry(null);
  }

  function handleEditRequestSubmitted() {
    loadTimeEntries();
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDateForPDF(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function getFilterDisplayText() {
    const dateRange = getDateRange();
    switch (filterType) {
      case 'day':
        return formatDateForPDF(selectedDate);
      case 'week':
        return `Semana del ${formatDateForPDF(dateRange.start)} al ${formatDateForPDF(dateRange.end)}`;
      case 'month':
        return `Mes de ${format(dateRange.start, 'MMMM yyyy', { locale: es })}`;
      case 'custom':
        return `Del ${formatDateForPDF(customStartDate)} al ${formatDateForPDF(customEndDate)}`;
      default:
        return formatDateForPDF(selectedDate);
    }
  }

  async function exportToPDF() {
    setExportLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userProfile || !companyInfo) {
        alert('Error: No se pudo cargar la información necesaria para el PDF');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPosition = 20;

      // Configurar fuentes y colores
      const primaryColor = [59, 130, 246]; // Blue
      const secondaryColor = [107, 114, 128]; // Gray
      const accentColor = [34, 197, 94]; // Green
      const dangerColor = [239, 68, 68]; // Red

      // ===== HEADER CON LOGO Y TÍTULO =====
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE FICHAJES', pageWidth / 2, 25, { align: 'center' });
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${formatDateForPDF(new Date())}`, pageWidth - margin, 15, { align: 'right' });
      
      yPosition = 50;

      // ===== INFORMACIÓN DEL PERÍODO =====
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PERÍODO ANALIZADO', margin + 5, yPosition + 10);
      
      yPosition += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${getFilterDisplayText()}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Total de registros: ${timeEntries.length}`, margin, yPosition);
      yPosition += 15;

      // ===== INFORMACIÓN DE LA EMPRESA =====
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE LA EMPRESA', margin + 5, yPosition + 10);
      
      yPosition += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${companyInfo.name}`, margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (companyInfo.address) {
        doc.text(`Dirección: ${companyInfo.address}`, margin, yPosition);
        yPosition += 5;
      }
      if (companyInfo.phone) {
        doc.text(`Teléfono: ${companyInfo.phone}`, margin, yPosition);
        yPosition += 5;
      }
      if (companyInfo.email) {
        doc.text(`Email: ${companyInfo.email}`, margin, yPosition);
        yPosition += 5;
      }
      if (companyInfo.website) {
        doc.text(`Website: ${companyInfo.website}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // ===== INFORMACIÓN DEL EMPLEADO =====
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL EMPLEADO', margin + 5, yPosition + 10);
      
      yPosition += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${userProfile.full_name}`, margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${user.email}`, margin, yPosition);
      yPosition += 5;
      if (userProfile.position) {
        doc.text(`Cargo: ${userProfile.position}`, margin, yPosition);
        yPosition += 5;
      }
      if (userProfile.phone) {
        doc.text(`Teléfono: ${userProfile.phone}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // ===== ESTADÍSTICAS DEL PERÍODO =====
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADÍSTICAS DEL PERÍODO', margin + 5, yPosition + 10);
      
      yPosition += 20;
      
      // Crear tabla de estadísticas
      const statsData = [
        ['Métrica', 'Valor'],
        ['Horas totales trabajadas', `${stats.totalHours} horas`],
        ['Días trabajados', `${stats.totalDays} días`],
        ['Promedio diario', `${stats.averageHours} horas`],
        ['Total de fichajes', `${timeEntries.length} registros`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: statsData.slice(1), // Excluir el header ya que se define arriba
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          cellPadding: 4
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: 0
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      yPosition = doc.lastAutoTable.finalY + 15;

      // ===== DETALLE DE FICHAJES =====
      if (timeEntries.length > 0) {
        // Verificar si necesitamos una nueva página
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DE FICHAJES', margin + 5, yPosition + 10);
        
        yPosition += 20;

        // Agrupar fichajes por día para mejor organización
        const entriesByDay = {};
        timeEntries.forEach(entry => {
          const dayKey = entry.entry_time.split('T')[0];
          if (!entriesByDay[dayKey]) {
            entriesByDay[dayKey] = [];
          }
          entriesByDay[dayKey].push(entry);
        });

        const sortedDays = Object.keys(entriesByDay).sort();

        sortedDays.forEach(dayKey => {
          const dayEntries = entriesByDay[dayKey];
          const dayDate = new Date(dayKey);
          
          // Verificar si necesitamos una nueva página
          if (yPosition > pageHeight - 80) {
            doc.addPage();
            yPosition = 20;
          }

          // Header del día
          doc.setFillColor(240, 249, 255);
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
          doc.setTextColor(...primaryColor);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${dayDate.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`, margin + 5, yPosition + 8);
          
          yPosition += 15;

          // Tabla de fichajes del día
          const dayTableData = dayEntries.map(entry => {
            const entryInfo = getEntryTypeDisplay(entry.entry_type);
            const entryTime = new Date(entry.entry_time);
            
            return [
              entryTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              entryInfo.text,
              entry.notes || '-',
              entry.location_lat ? 'Sí' : 'No'
            ];
          });

          autoTable(doc, {
            startY: yPosition,
            head: [['Hora', 'Tipo', 'Notas', 'Ubicación']],
            body: dayTableData,
            margin: { left: margin, right: margin },
            styles: {
              fontSize: 9,
              cellPadding: 3
            },
            headStyles: {
              fillColor: secondaryColor,
              textColor: 255,
              fontStyle: 'bold'
            },
            bodyStyles: {
              textColor: 0
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            }
          });

          yPosition = doc.lastAutoTable.finalY + 10;
        });
      }

      // ===== PIE DE PÁGINA =====
      const totalPages = doc.internal.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Línea separadora
        doc.setDrawColor(...secondaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
        
        // Información del pie de página
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i} de ${totalPages}`, margin, pageHeight - 20);
        doc.text(`Reporte generado por Witar - Sistema de Control de Asistencia`, pageWidth / 2, pageHeight - 20, { align: 'center' });
        doc.text(`Total de registros: ${timeEntries.length} | Período: ${getFilterDisplayText()}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
      }

      // Guardar el PDF
      const fileName = `Reporte_Fichajes_${userProfile.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setExportLoading(false);
    }
  }

  function handleFilterTypeChange(newFilterType) {
    setFilterType(newFilterType);
    
    // Inicializar fechas personalizadas si es necesario
    if (newFilterType === 'custom') {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      
      setCustomStartDate(lastWeek.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    if (searchTerm) {
      const entryType = getEntryTypeDisplay(entry.entry_type).text.toLowerCase();
      return entryType.includes(searchTerm.toLowerCase());
    }
    return true;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Fichajes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y visualiza tu historial de fichajes
          </p>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Horas Trabajadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              {filterType === 'day' ? 'Hoy' : 
               filterType === 'week' ? 'Esta semana' :
               filterType === 'month' ? 'Este mes' : 'Período personalizado'}
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Promedio Diario</p>
              <p className="text-3xl font-bold text-foreground">{stats.averageHours}h</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Últimos {stats.totalDays} días
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fichajes</p>
              <p className="text-3xl font-bold text-foreground">{timeEntries.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Registros
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Filtros de Búsqueda</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona el período de tiempo que deseas consultar
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Tipo de filtro */}
          <div>
            <label className="block text-sm font-medium mb-2">Período</label>
            <select
              value={filterType}
              onChange={(e) => handleFilterTypeChange(e.target.value)}
              className="input w-full"
            >
              <option value="day">Día específico</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </div>

          {/* Fecha base */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {filterType === 'custom' ? 'Fecha de inicio' : 'Fecha'}
            </label>
            <input
              type="date"
              value={filterType === 'custom' ? customStartDate : selectedDate}
              onChange={(e) => {
                if (filterType === 'custom') {
                  setCustomStartDate(e.target.value);
                } else {
                  setSelectedDate(e.target.value);
                }
              }}
              className="input w-full"
            />
          </div>

          {/* Fecha final para personalizado */}
          {filterType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">Fecha final</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input w-full"
                min={customStartDate}
              />
            </div>
          )}

          {/* Buscar por tipo */}
          <div>
            <label className="block text-sm font-medium mb-2">Buscar por tipo</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Entrada, Salida, Pausa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <button
              onClick={loadTimeEntries}
              className="btn btn-primary flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar Fichajes
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('day');
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="btn btn-outline"
            >
              Limpiar Filtros
            </button>
          </div>
          
          <button
            onClick={exportToPDF}
            disabled={exportLoading || timeEntries.length === 0}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>

        {/* Información del filtro activo */}
        {filterType === 'custom' && customStartDate && customEndDate && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Calendar className="w-4 h-4" />
              <span>
                Mostrando fichajes del <strong>{new Date(customStartDate).toLocaleDateString('es-ES')}</strong> 
                al <strong>{new Date(customEndDate).toLocaleDateString('es-ES')}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Time Entries Calendar View */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Fichajes - {getFilterDisplayText()}
            </h3>
            <div className="text-sm text-muted-foreground">
              {timeEntries.length} registros
            </div>
          </div>
        </div>
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay fichajes registrados para este período
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vista de calendario por días */}
              {(() => {
                // Agrupar fichajes por día
                const entriesByDay = {};
                filteredEntries.forEach(entry => {
                  const dayKey = entry.entry_time.split('T')[0];
                  if (!entriesByDay[dayKey]) {
                    entriesByDay[dayKey] = [];
                  }
                  entriesByDay[dayKey].push(entry);
                });

                // Ordenar días
                const sortedDays = Object.keys(entriesByDay).sort();

                return sortedDays.map(dayKey => {
                  const dayEntries = entriesByDay[dayKey];
                  const dayDate = new Date(dayKey);
                  const isToday = dayKey === new Date().toISOString().split('T')[0];
                  
                  // Calcular estadísticas del día
                  let dayHours = 0;
                  let dayMinutes = 0;
                  let clockInTime = null;
                  let breakStartTime = null;
                  let totalBreakMinutes = 0;

                  for (let i = 0; i < dayEntries.length; i++) {
                    const entry = dayEntries[i];
                    
                    if (entry.entry_type === 'clock_in') {
                      clockInTime = new Date(entry.entry_time);
                    } else if (entry.entry_type === 'clock_out' && clockInTime) {
                      const clockOutTime = new Date(entry.entry_time);
                      const diffMinutes = (clockOutTime - clockInTime) / (1000 * 60);
                      dayMinutes += diffMinutes;
                      clockInTime = null;
                    } else if (entry.entry_type === 'break_start') {
                      breakStartTime = new Date(entry.entry_time);
                    } else if (entry.entry_type === 'break_end' && breakStartTime) {
                      const breakEndTime = new Date(entry.entry_time);
                      const breakMinutes = (breakEndTime - breakStartTime) / (1000 * 60);
                      totalBreakMinutes += breakMinutes;
                      breakStartTime = null;
                    }
                  }

                  // Restar tiempo de pausas
                  dayMinutes -= totalBreakMinutes;
                  dayHours = Math.round((dayMinutes / 60) * 100) / 100;

                  return (
                    <div key={dayKey} className={`border rounded-xl overflow-hidden ${isToday ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}>
                      {/* Header del día */}
                      <div className={`px-4 py-3 ${isToday ? 'bg-blue-100' : 'bg-gray-50'} border-b border-gray-200`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              <span className="text-sm font-semibold">
                                {dayDate.getDate()}
                              </span>
                            </div>
                            <div>
                              <h4 className={`font-semibold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                                {dayDate.toLocaleDateString('es-ES', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h4>
                              <p className={`text-sm ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                                {dayEntries.length} fichajes • {dayHours}h trabajadas
                              </p>
                            </div>
                          </div>
                          {isToday && (
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                              Hoy
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timeline de fichajes */}
                      <div className="p-4">
                        <div className="space-y-3">
                          {dayEntries.map((entry, index) => {
                            const entryInfo = getEntryTypeDisplay(entry.entry_type);
                            const EntryIcon = entryInfo.icon;
                            const entryTime = new Date(entry.entry_time);
                            
                            return (
                              <div key={entry.id} className="flex items-start gap-4 relative">
                                {/* Línea de tiempo */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${entryInfo.color.replace('text-', '').replace('bg-', 'bg-')} border-2 border-white shadow-sm`}></div>
                                  {index < dayEntries.length - 1 && (
                                    <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                                  )}
                                </div>

                                {/* Contenido del fichaje */}
                                <div className="flex-1 min-w-0">
                                  <div className={`p-3 rounded-lg border ${entryInfo.color.replace('text-', '').replace('bg-', 'bg-')} bg-opacity-10 border-opacity-20`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entryInfo.color.replace('text-', '').replace('bg-', 'bg-')} bg-opacity-20`}>
                                          <EntryIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {entryInfo.text}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {entryTime.toLocaleTimeString('es-ES', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {entry.location_lat && (
                                          <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin className="w-3 h-3" />
                                            <span>Ubicación</span>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => handleEditRequest(entry)}
                                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                          title="Solicitar edición"
                                        >
                                          <Edit className="w-3 h-3" />
                                          Editar
                                        </button>
                                      </div>
                                    </div>
                                    {entry.notes && (
                                      <p className="text-sm text-gray-600 mt-2 pl-11">
                                        💬 {entry.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Resumen del día */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Total trabajado:</span>
                                <span className="font-semibold text-gray-900">{dayHours}h</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Fichajes:</span>
                                <span className="font-semibold text-gray-900">{dayEntries.length}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {dayDate.toLocaleDateString('es-ES', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Edit Request Modal */}
      <TimeEntryEditRequestModal
        isOpen={editModalOpen}
        onClose={handleEditModalClose}
        timeEntry={selectedTimeEntry}
        onRequestSubmitted={handleEditRequestSubmitted}
      />
    </div>
  );
}
