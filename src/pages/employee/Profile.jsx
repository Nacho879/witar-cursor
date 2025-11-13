import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building, 
  Users, 
  Edit, 
  Save, 
  X, 
  Camera,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Lock,
  FileDown,
  FileSpreadsheet,
  Bell,
  TrendingUp,
  Activity
} from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Profile() {
  const [userProfile, setUserProfile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [managerInfo, setManagerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [stats, setStats] = useState({
    daysWorked: 0,
    totalHours: 0,
    requestsCount: 0,
    documentsCount: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (companyInfo?.company?.id) {
      loadStats();
      loadRecentData();
      loadNotifications();
    }
  }, [companyInfo]);

  useEffect(() => {
    let statsInterval = null;
    let timeEntriesSubscription = null;
    const loadStatsTimeoutRef = { current: null };
    
    const setup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Suscripción en tiempo real a cambios de fichajes del usuario
        // IMPORTANTE: Usar debounce para evitar interferir con FloatingTimeClock durante fichajes
        timeEntriesSubscription = supabase
          .channel('employee_time_entries_stats')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'time_entries',
            filter: `user_id=eq.${user.id}`
          }, () => {
            // PROTECCIÓN: Si hay sesión activa en localStorage, esperar más tiempo antes de recargar
            // Esto previene interferencias con FloatingTimeClock durante el proceso de fichaje
            const hasActiveSession = localStorage.getItem('witar_active_session') === 'true';
            const delay = hasActiveSession ? 3000 : 1000; // 3 segundos si hay fichaje activo, 1 segundo si no
            
            // Cancelar timeout anterior si existe
            if (loadStatsTimeoutRef.current) {
              clearTimeout(loadStatsTimeoutRef.current);
            }
            
            // Ejecutar loadStats después del delay
            loadStatsTimeoutRef.current = setTimeout(() => {
              loadStats();
              loadStatsTimeoutRef.current = null;
            }, delay);
          })
          .subscribe();

        // Refresco periódico (cada 2 minutos) para contar sesión activa en curso
        // IMPORTANTE: No ejecutar si hay un fichaje activo o si la página está oculta
        statsInterval = setInterval(() => {
          // Solo recargar si no hay fichaje activo y la página está visible
          const hasActiveSession = localStorage.getItem('witar_active_session') === 'true';
          if (!hasActiveSession && !document.hidden) {
            loadStats();
          }
        }, 120000); // 2 minutos (aumentado de 60s para reducir consumo)
      } catch (e) {
        console.error('Error configurando actualización de estadísticas:', e);
      }
    };
    setup();

    // Pausar actualizaciones cuando la página no está visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Página visible: recargar stats
        loadStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (statsInterval) clearInterval(statsInterval);
      if (loadStatsTimeoutRef.current) clearTimeout(loadStatsTimeoutRef.current);
      if (timeEntriesSubscription) supabase.removeChannel(timeEntriesSubscription);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // loadStats es estable, no necesita estar en dependencias

  async function loadProfileData() {
    try {
      console.log('🔍 Loading profile data...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No user found');
        setLoading(false);
        return;
      }

      console.log('👤 User found:', user.email);

      // Asegurar que el perfil esté completo
      try {
        console.log('🔍 Ensuring user profile...');
        await supabase.functions.invoke('ensure-user-profile');
        console.log('✅ User profile ensured');
      } catch (error) {
        console.error('❌ Error ensuring user profile:', error);
      }

      // Cargar perfil del usuario - solo campos necesarios
      console.log('🔍 Loading user profile from database...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url, email, phone, position, created_at, updated_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw profileError;
      }

      console.log('✅ Profile loaded:', profile);
      
      // Combinar datos del perfil con el email del usuario autenticado
      const profileWithEmail = {
        ...profile,
        email: user.email // Usar el email del usuario autenticado
      };
      
      setUserProfile(profileWithEmail);
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        avatar_url: profile.avatar_url || ''
      });

      // Cargar información de la empresa
      console.log('🔍 Loading company info...');
      const { data: userRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select(`
          company_id,
          role,
          departments (
            name
          ),
          companies (
            id,
            name,
            address,
            phone,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (roleError) {
        console.error('❌ Role error:', roleError);
        console.error('❌ Error details:', JSON.stringify(roleError, null, 2));
      } else if (userRole) {
        console.log('✅ User role loaded:', {
          company_id: userRole.company_id,
          role: userRole.role,
          hasCompanies: !!userRole.companies,
          companies: userRole.companies,
          hasDepartments: !!userRole.departments
        });
        
        // Si el JOIN con companies falló, intentar obtener la empresa directamente
        let companyInfo = userRole.companies;
        
        if (!companyInfo) {
          console.warn('⚠️ Company info no disponible en JOIN');
          console.warn('⚠️ Company ID:', userRole.company_id);
          
          if (userRole.company_id) {
            console.log('🔄 Intentando consulta directa a companies...');
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('id, name, address, phone, email')
              .eq('id', userRole.company_id)
              .maybeSingle();
            
            console.log('📊 Consulta directa resultado:', {
              hasData: !!companyData,
              data: companyData,
              error: companyError
            });
            
            if (!companyError && companyData) {
              companyInfo = companyData;
              console.log('✅ Company info recuperada mediante consulta directa:', companyInfo);
            } else {
              console.error('❌ No se pudo obtener información de la empresa');
              console.error('❌ Error:', companyError);
              console.error('❌ Error code:', companyError?.code);
              console.error('❌ Error message:', companyError?.message);
            }
          } else {
            console.error('❌ No hay company_id disponible');
          }
        } else {
          console.log('✅ Company info obtenida del JOIN:', companyInfo);
        }
        
        const finalCompanyInfo = {
          company: companyInfo,
          department: userRole.departments,
          role: userRole.role
        };
        
        console.log('📦 Final company info structure:', finalCompanyInfo);
        setCompanyInfo(finalCompanyInfo);
      } else {
        console.warn('⚠️ No se encontró rol activo para el usuario');
        console.warn('⚠️ User ID:', user.id);
      }

      console.log('✅ Profile data loading completed');
    } catch (error) {
      console.error('❌ Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determinar company_id activo para cumplir RLS
      let activeCompanyId = companyInfo?.company?.id || companyInfo?.company_id;
      if (!activeCompanyId) {
        const { data: roleData } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        activeCompanyId = roleData?.company_id || null;
      }
      if (!activeCompanyId) {
        // Si no hay companyId aún, no intentamos cargar para evitar errores de RLS
        return;
      }

      // Actualizar companyInfo si no estaba disponible
      if (!companyInfo?.company?.id && activeCompanyId) {
        const { data: roleData } = await supabase
          .from('user_company_roles')
          .select(`
            company_id,
            companies (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (roleData) {
          setCompanyInfo(prev => ({
            ...prev,
            company: roleData.companies,
            company_id: activeCompanyId
          }));
        }
      }

      // Obtener estadísticas de fichajes - limitar a últimos 90 días para optimizar consumo
      const now = new Date();
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0);

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('entry_time, entry_type')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId)
        .gte('entry_time', ninetyDaysAgo.toISOString());

      // Obtener estadísticas de solicitudes
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId);

      // Obtener estadísticas de documentos
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId);

      if (!timeError && !requestsError && !documentsError) {
        // Calcular días trabajados (días únicos con fichajes)
        const uniqueDays = new Set();
        if (timeEntries) {
          timeEntries.forEach(entry => {
            const date = new Date(entry.entry_time).toDateString();
            uniqueDays.add(date);
          });
        }

        // Calcular horas totales (aproximado)
        let totalHours = 0;
        if (timeEntries && timeEntries.length > 0) {
          // Ordenar por tiempo
          const sorted = [...timeEntries].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

          // Sumar pares entrada/salida por día
          const entriesByDay = {};
          for (const entry of sorted) {
            const dateKey = new Date(entry.entry_time).toDateString();
            if (!entriesByDay[dateKey]) entriesByDay[dateKey] = [];
            entriesByDay[dateKey].push(entry);
          }

          Object.values(entriesByDay).forEach(dayEntries => {
            const daySorted = dayEntries.sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
            for (let i = 0; i < daySorted.length - 1; i++) {
              const a = daySorted[i];
              const b = daySorted[i + 1];
              if (a.entry_type === 'clock_in' && (b.entry_type === 'clock_out' || b.entry_type === 'break_start')) {
                const start = new Date(a.entry_time).getTime();
                const end = new Date(b.entry_time).getTime();
                if (end > start) totalHours += (end - start) / (1000 * 60 * 60);
              }
              // En caso de break_end seguido de clock_out, el tramo de trabajo se suma más abajo
            }
          });

          // Incluir sesión activa en curso (último clock_in sin clock_out posterior)
          const lastClockIn = [...sorted].reverse().find(e => e.entry_type === 'clock_in');
          if (lastClockIn) {
            const afterLastClockIn = sorted.filter(e => new Date(e.entry_time) > new Date(lastClockIn.entry_time));
            const hasClockOutAfter = afterLastClockIn.some(e => e.entry_type === 'clock_out');
            if (!hasClockOutAfter) {
              const now = Date.now();
              const start = new Date(lastClockIn.entry_time).getTime();
              if (now > start) {
                totalHours += (now - start) / (1000 * 60 * 60);
              }
            }
          }
        }

        setStats({
          daysWorked: uniqueDays.size,
          totalHours: Math.round(totalHours * 10) / 10,
          requestsCount: requests?.length || 0,
          documentsCount: documents?.length || 0
        });
      }

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadRecentData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let activeCompanyId = companyInfo?.company?.id || companyInfo?.company_id;
      if (!activeCompanyId) {
        const { data: roleData } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        activeCompanyId = roleData?.company_id || null;
      }
      if (!activeCompanyId) return;

      // Cargar solicitudes recientes - solo campos necesarios
      const { data: requests } = await supabase
        .from('requests')
        .select('id, user_id, company_id, request_type, status, start_date, end_date, reason, created_at')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requests) setRecentRequests(requests);

      // Cargar fichajes recientes - solo campos necesarios
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, user_id, company_id, entry_type, entry_time, notes, created_at')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId)
        .order('entry_time', { ascending: false })
        .limit(5);

      if (timeEntries) setRecentTimeEntries(timeEntries);

      // Cargar documentos recientes (sin file_url para optimizar ancho de banda)
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, description, category, file_type, file_size, user_id, company_id, uploaded_by, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (documents) setRecentDocuments(documents);
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  }

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyInfo?.company?.id) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('id, company_id, recipient_id, sender_id, type, title, message, read_at, created_at, data')
        .eq('company_id', companyInfo.company.id)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadNotificationsCount((data || []).filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return date.toLocaleDateString('es-ES');
  }

  function getRequestStatusColor(status) {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  }

  function getRequestTypeLabel(type) {
    switch (type) {
      case 'vacation': return 'Vacaciones';
      case 'sick_leave': return 'Baja médica';
      case 'personal_leave': return 'Día personal';
      case 'permission': return 'Permiso';
      default: return type || 'Solicitud';
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage('Error: Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Error: El archivo es demasiado grande (máximo 5MB)');
      return;
    }

    setUploadingAvatar(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado o ID no válido');
      }

      // Convertir imagen a base64 para almacenamiento temporal
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Image = e.target.result;
          
          // Actualizar perfil con imagen en base64
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ avatar_url: base64Image })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Update error:', updateError);
            throw new Error(`Error al actualizar perfil: ${updateError.message}`);
          }

          // Actualizar estado local
          setUserProfile(prev => ({ ...prev, avatar_url: base64Image }));
          setEditForm(prev => ({ ...prev, avatar_url: base64Image }));
          setMessage('Avatar actualizado correctamente');

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => setMessage(''), 3000);

        } catch (error) {
          console.error('Error processing avatar:', error);
          setMessage(`Error al procesar el avatar: ${error.message}`);
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        setMessage('Error al leer el archivo de imagen');
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage(`Error al subir el avatar: ${error.message}`);
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('user_profiles')
        .update(editForm)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserProfile(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
      setMessage('Perfil actualizado correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditForm({
      full_name: userProfile?.full_name || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || '',
      avatar_url: userProfile?.avatar_url || ''
    });
    setEditMode(false);
    setMessage('');
  }

  function handleQuickAction(action) {
    switch (action) {
      case 'time-entries':
        window.location.href = '/employee/my-time-entries';
        break;
      case 'requests':
        window.location.href = '/employee/my-requests';
        break;
      case 'documents':
        window.location.href = '/employee/my-documents';
        break;
      case 'download':
        setShowDownloadModal(true);
        break;
      default:
        break;
    }
  }

  async function downloadPersonalData(format) {
    setDownloadLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      // Cargar todos los datos del usuario
      const [profileData, timeEntriesData, requestsData, documentsData] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('entry_time', { ascending: false })
          .limit(100),
        supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('documents')
          .select('id, title, description, category, file_type, file_size, user_id, company_id, uploaded_by, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (format === 'pdf') {
        await generatePDFReport(user, profileData.data, timeEntriesData.data, requestsData.data, documentsData.data);
      } else if (format === 'excel') {
        await generateExcelReport(user, profileData.data, timeEntriesData.data, requestsData.data, documentsData.data);
      }

      setMessage('Datos descargados correctamente');
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error descargando datos:', error);
      setMessage('Error al descargar los datos');
    } finally {
      setDownloadLoading(false);
    }
  }

  async function generatePDFReport(user, profile, timeEntries, requests, documents) {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Reporte de Datos Personales', 20, 20);
    doc.setFontSize(12);
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 20, 30);
    
    let yPosition = 50;

    // Información Personal
    doc.setFontSize(16);
    doc.text('Información Personal', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.text(`Nombre: ${profile?.full_name || 'No especificado'}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Teléfono: ${profile?.phone || 'No especificado'}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Dirección: ${profile?.address || 'No especificado'}`, 20, yPosition);
    yPosition += 15;

    // Estadísticas
    doc.setFontSize(16);
    doc.text('Estadísticas', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.text(`Días trabajados: ${stats.daysWorked}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Horas totales: ${stats.totalHours}h`, 20, yPosition);
    yPosition += 7;
    doc.text(`Solicitudes: ${stats.requestsCount}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Documentos: ${stats.documentsCount}`, 20, yPosition);
    yPosition += 15;

    // Últimos fichajes
    if (timeEntries && timeEntries.length > 0) {
      doc.setFontSize(16);
      doc.text('Últimos Fichajes', 20, yPosition);
      yPosition += 10;

      const tableData = timeEntries.slice(0, 10).map(entry => [
        format(new Date(entry.entry_time), 'dd/MM/yyyy', { locale: es }),
        format(new Date(entry.entry_time), 'HH:mm', { locale: es }),
        getEntryTypeDisplay(entry.entry_type).text,
        entry.notes || '-'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Hora', 'Tipo', 'Notas']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    // Guardar PDF
    doc.save(`datos_personales_${user.email}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  async function generateExcelReport(user, profile, timeEntries, requests, documents) {
    // Crear contenido CSV (simulado Excel)
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Información Personal
    csvContent += 'INFORMACIÓN PERSONAL\n';
    csvContent += 'Campo,Valor\n';
    csvContent += `Nombre,${profile?.full_name || 'No especificado'}\n`;
    csvContent += `Email,${user.email}\n`;
    csvContent += `Teléfono,${profile?.phone || 'No especificado'}\n`;
    csvContent += `Dirección,${profile?.address || 'No especificado'}\n`;
    csvContent += `Fecha de registro,${profile?.created_at ? format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: es }) : 'No especificado'}\n`;
    csvContent += '\n';

    // Estadísticas
    csvContent += 'ESTADÍSTICAS\n';
    csvContent += 'Métrica,Valor\n';
    csvContent += `Días trabajados,${stats.daysWorked}\n`;
    csvContent += `Horas totales,${stats.totalHours}\n`;
    csvContent += `Solicitudes,${stats.requestsCount}\n`;
    csvContent += `Documentos,${stats.documentsCount}\n`;
    csvContent += '\n';

    // Fichajes
    if (timeEntries && timeEntries.length > 0) {
      csvContent += 'FICHAJES\n';
      csvContent += 'Fecha,Hora,Tipo,Notas\n';
      timeEntries.forEach(entry => {
        csvContent += `${format(new Date(entry.entry_time), 'dd/MM/yyyy', { locale: es })},`;
        csvContent += `${format(new Date(entry.entry_time), 'HH:mm', { locale: es })},`;
        csvContent += `${getEntryTypeDisplay(entry.entry_type).text},`;
        csvContent += `${entry.notes || ''}\n`;
      });
      csvContent += '\n';
    }

    // Solicitudes
    if (requests && requests.length > 0) {
      csvContent += 'SOLICITUDES\n';
      csvContent += 'Fecha,Tipo,Estado,Descripción\n';
      requests.forEach(request => {
        csvContent += `${format(new Date(request.created_at), 'dd/MM/yyyy', { locale: es })},`;
        csvContent += `${request.type || 'N/A'},`;
        csvContent += `${request.status || 'N/A'},`;
        csvContent += `${request.description || ''}\n`;
      });
      csvContent += '\n';
    }

    // Documentos
    if (documents && documents.length > 0) {
      csvContent += 'DOCUMENTOS\n';
      csvContent += 'Fecha,Nombre,Tipo,Tamaño\n';
      documents.forEach(doc => {
        csvContent += `${format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: es })},`;
        csvContent += `${doc.name || 'N/A'},`;
        csvContent += `${doc.type || 'N/A'},`;
        csvContent += `${doc.size || 'N/A'}\n`;
      });
    }

    // Descargar archivo
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `datos_personales_${user.email}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getEntryTypeDisplay(type) {
    switch (type) {
      case 'clock_in': return { text: 'Entrada', icon: '🟢' };
      case 'clock_out': return { text: 'Salida', icon: '🔴' };
      case 'break_start': return { text: 'Inicio Pausa', icon: '🟡' };
      case 'break_end': return { text: 'Fin Pausa', icon: '🔵' };
      default: return { text: type, icon: '⚪' };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:px-6 lg:pt-6 lg:pb-[350px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Mi Perfil
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestiona tu información personal y profesional
          </p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('Error') 
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.includes('Error') ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <span className={`text-sm font-medium ${
              message.includes('Error') 
                ? 'text-red-800 dark:text-red-200' 
                : 'text-green-800 dark:text-green-200'
            }`}>
              {message}
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Días Trabajados</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.daysWorked}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Horas Totales</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalHours}h</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Solicitudes</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.requestsCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Documentos</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.documentsCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Información Personal */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Perfil Principal */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                  Información Personal
                </h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1">
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img 
                          src={userProfile.avatar_url} 
                          alt="Avatar" 
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    {editMode && (
                      <div className="absolute bottom-0 right-0">
                        <label className="cursor-pointer">
                          <div className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors">
                            {uploadingAvatar ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Nombre Completo
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        />
                      ) : (
                        <p className="text-foreground font-medium">
                          {userProfile?.full_name || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Email
                      </label>
                      <p className="text-foreground font-medium">
                        {userProfile?.email || 'No especificado'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email con el que aceptaste la invitación
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Teléfono
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        />
                      ) : (
                        <p className="text-foreground font-medium">
                          {userProfile?.phone || 'No especificado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Dirección
                      </label>
                      {editMode ? (
                        <textarea
                          value={editForm.address}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground resize-none"
                        />
                      ) : (
                        <p className="text-foreground font-medium">
                          {userProfile?.address || 'No especificado'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                Información Laboral
              </h2>
            </div>
            
            <div className="p-4 sm:p-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Empresa</p>
                      <p className="font-medium text-foreground">
                        {companyInfo?.company?.name || 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Departamento</p>
                      <p className="font-medium text-foreground">
                        {companyInfo?.department?.name || 'Sin departamento'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cargo</p>
                      <p className="font-medium text-foreground capitalize">
                        {companyInfo?.role || 'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                      <p className="font-medium text-foreground">
                        {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('es-ES') : 'No especificado'}
                      </p>
                    </div>
                  </div>

                  {managerInfo && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Manager Asignado</p>
                        <p className="font-medium text-foreground">
                          {managerInfo.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {userProfile?.email || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  )}

                  {companyInfo?.company && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dirección de la Empresa</p>
                        <p className="font-medium text-foreground">
                          {companyInfo.company.address || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Acciones Rápidas */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Acciones Rápidas
              </h3>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 space-y-3">
              <button 
                onClick={() => handleQuickAction('time-entries')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary rounded-lg transition-colors"
              >
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-foreground">Ver mis fichajes</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('requests')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-foreground">Mis solicitudes</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('documents')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-foreground">Mis documentos</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('download')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary rounded-lg transition-colors"
              >
                <Download className="w-5 h-5 text-orange-600" />
                <span className="text-foreground">Descargar datos</span>
              </button>
              
              <button 
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary rounded-lg transition-colors"
              >
                <Lock className="w-5 h-5 text-red-600" />
                <span className="text-foreground">Cambiar contraseña</span>
              </button>
            </div>
          </div>

          {/* Solicitudes Recientes */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Solicitudes Recientes
                </h3>
                {recentRequests.length > 0 && (
                  <button
                    onClick={() => handleQuickAction('requests')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {recentRequests.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay solicitudes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div key={request.id} className="p-3 rounded-lg border border-border hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {getRequestTypeLabel(request.request_type)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(request.created_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRequestStatusColor(request.status)}`}>
                          {request.status === 'pending' ? 'Pendiente' : request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fichajes Recientes */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Fichajes Recientes
                </h3>
                {recentTimeEntries.length > 0 && (
                  <button
                    onClick={() => handleQuickAction('time-entries')}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {recentTimeEntries.length === 0 ? (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay fichajes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTimeEntries.map((entry) => {
                    const entryDisplay = getEntryTypeDisplay(entry.entry_type);
                    return (
                      <div key={entry.id} className="p-3 rounded-lg border border-border hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {entryDisplay.text}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(entry.entry_time), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                          <span className="text-2xl">{entryDisplay.icon}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notificaciones */}
          <div className="card w-full flex flex-col">
            <div className="border-b border-border flex-shrink-0 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    Notificaciones
                  </h3>
                </div>
                {unreadNotificationsCount > 0 && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">{unreadNotificationsCount}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-4">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay notificaciones</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer ${
                        !notification.read_at ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''
                      }`}
                      onClick={() => !notification.read_at && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        {!notification.read_at && (
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download Data Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Descargar Datos Personales
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Selecciona el formato de descarga
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                disabled={downloadLoading}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">Se incluirán los siguientes datos:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Información personal</li>
                  <li>• Estadísticas de trabajo</li>
                  <li>• Últimos 100 fichajes</li>
                  <li>• Últimas 50 solicitudes</li>
                  <li>• Últimos 50 documentos</li>
                </ul>
              </div>

              {/* Download Options */}
              <div className="space-y-3">
                <button
                  onClick={() => downloadPersonalData('pdf')}
                  disabled={downloadLoading}
                  className="w-full flex items-center justify-center gap-3 p-4 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-5 h-5 text-red-600" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">Descargar PDF</div>
                    <div className="text-sm text-muted-foreground">Reporte formateado</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadPersonalData('excel')}
                  disabled={downloadLoading}
                  className="w-full flex items-center justify-center gap-3 p-4 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">Descargar Excel (CSV)</div>
                    <div className="text-sm text-muted-foreground">Datos en formato tabla</div>
                  </div>
                </button>
              </div>

              {downloadLoading && (
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Generando archivo...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
} 