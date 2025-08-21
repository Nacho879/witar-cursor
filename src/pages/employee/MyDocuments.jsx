import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Folder,
  Users,
  MoreHorizontal,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function MyDocuments() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [stats, setStats] = React.useState({
    total: 0,
    totalSize: 0,
    categories: 0,
    recentUploads: 0
  });
  const [userProfile, setUserProfile] = React.useState(null);
  const [companyInfo, setCompanyInfo] = React.useState(null);

  React.useEffect(() => {
    loadDocuments();
    loadUserAndCompanyInfo();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading user and company info:', error);
    }
  }

  async function loadDocuments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id, department_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        // Obtener documentos que le han subido al empleado
        const { data: documents, error } = await supabase
          .from('documents')
          .select('*')
          .eq('company_id', userRole.company_id)
          .eq('user_id', user.id) // Solo documentos destinados al empleado
          .order('created_at', { ascending: false });

        if (!error && documents) {
          // Obtener los uploaded_by user_ids únicos
          const uploaderIds = [...new Set(documents.map(doc => doc.uploaded_by))];
          
          // Cargar los perfiles de los uploaders por separado
          const { data: uploaderProfiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', uploaderIds);

          if (!profilesError && uploaderProfiles) {
            // Combinar los datos
            const documentsWithUploaders = documents.map(doc => {
              const uploader = uploaderProfiles.find(p => p.user_id === doc.uploaded_by);
              return {
                ...doc,
                user_company_roles: {
                  user_profiles: uploader || { full_name: 'Usuario sin perfil' }
                }
              };
            });

            setDocuments(documentsWithUploaders);
            calculateStats(documentsWithUploaders);
          } else {
            // Si no hay perfiles, usar los documentos sin perfiles
            const documentsWithoutProfiles = documents.map(doc => ({
              ...doc,
              user_company_roles: {
                user_profiles: { full_name: 'Usuario sin perfil' }
              }
            }));
            setDocuments(documentsWithoutProfiles);
            calculateStats(documentsWithoutProfiles);
          }
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(documentsData) {
    const total = documentsData.length;
    const totalSize = documentsData.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    const categories = new Set(documentsData.map(d => d.category)).size;
    
    // Documentos subidos en los últimos 7 días
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentUploads = documentsData.filter(d => new Date(d.created_at) > lastWeek).length;

    setStats({ total, totalSize, categories, recentUploads });
  }

  function getCategoryInfo(category) {
    switch (category) {
      case 'contract': return { label: 'Contrato', color: 'bg-blue-100 text-blue-800', icon: '📋' };
      case 'id': return { label: 'Identificación', color: 'bg-green-100 text-green-800', icon: '🆔' };
      case 'certificate': return { label: 'Certificado', color: 'bg-purple-100 text-purple-800', icon: '🏆' };
      case 'hr': return { label: 'Recursos Humanos', color: 'bg-pink-100 text-pink-800', icon: '👥' };
      case 'finance': return { label: 'Finanzas', color: 'bg-yellow-100 text-yellow-800', icon: '💰' };
      case 'training': return { label: 'Capacitación', color: 'bg-indigo-100 text-indigo-800', icon: '📚' };
      case 'other': return { label: 'Otro', color: 'bg-gray-100 text-gray-800', icon: '📎' };
      default: return { label: 'General', color: 'bg-gray-100 text-gray-800', icon: '📄' };
    }
  }

  function getFileIcon(fileType) {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('text')) return '📄';
    return '📎';
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `Hace ${diffInWeeks} semanas`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Hace ${diffInMonths} meses`;
  }

  const filteredDocuments = documents.filter(document => {
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const title = document.title?.toLowerCase() || '';
      const description = document.description?.toLowerCase() || '';
      const uploaderName = document.user_company_roles?.user_profiles?.full_name?.toLowerCase() || '';
      
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             uploaderName.includes(searchLower);
    }

    // Filtro por categoría
    if (categoryFilter !== 'all' && document.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  async function handleDownload(doc) {
    try {
      if (doc.file_url) {
        // Verificar si es un archivo Base64
        if (doc.file_url.startsWith('data:')) {
          // Es un archivo Base64, descargar directamente
          const link = document.createElement('a');
          link.href = doc.file_url;
          
          // Extraer el nombre del archivo del título o usar un nombre por defecto
          const fileName = doc.title || 'documento';
          
          // Agregar extensión basada en el tipo de archivo
          let extension = '';
          if (doc.file_type) {
            if (doc.file_type.includes('pdf')) extension = '.pdf';
            else if (doc.file_type.includes('word') || doc.file_type.includes('document')) extension = '.docx';
            else if (doc.file_type.includes('excel') || doc.file_type.includes('spreadsheet')) extension = '.xlsx';
            else if (doc.file_type.includes('image')) extension = '.jpg';
            else if (doc.file_type.includes('text')) extension = '.txt';
          }
          
          link.download = fileName + extension;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Es una URL, abrir en nueva pestaña
          window.open(doc.file_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error al descargar el documento. Por favor, inténtalo de nuevo.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Documentos compartidos conmigo por mi manager y administradores
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Documentos</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              Compartidos conmigo
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Espacio Total</p>
              <p className="text-3xl font-bold text-foreground">{formatFileSize(stats.totalSize)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Almacenamiento
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categorías</p>
              <p className="text-3xl font-bold text-foreground">{stats.categories}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-purple-600">
              Tipos diferentes
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.recentUploads}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-orange-600">
              Últimos 7 días
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título, descripción o subido por..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
            >
              <option value="all">Todas las categorías</option>
              <option value="contract">Contrato</option>
              <option value="id">Identificación</option>
              <option value="certificate">Certificado</option>
              <option value="hr">Recursos Humanos</option>
              <option value="finance">Finanzas</option>
              <option value="training">Capacitación</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Documentos Compartidos ({filteredDocuments.length})
            </h3>
          </div>
        </div>
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay documentos compartidos
              </h3>
              <p className="text-muted-foreground">
                Los documentos que te compartan tu manager o administradores aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document) => {
                const categoryInfo = getCategoryInfo(document.category);
                const uploaderName = document.user_company_roles?.user_profiles?.full_name || 'Usuario';
                
                return (
                  <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{getFileIcon(document.file_type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground truncate">
                              {document.title}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                              {categoryInfo.icon} {categoryInfo.label}
                            </span>
                          </div>
                          {document.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {document.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>Subido por: {uploaderName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{getTimeAgo(document.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{formatFileSize(document.file_size)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(document)}
                          className="btn btn-ghost btn-sm flex items-center gap-2"
                          title="Descargar documento"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
