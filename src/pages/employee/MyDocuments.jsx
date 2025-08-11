import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, 
  Upload, 
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
  Edit
} from 'lucide-react';
import UploadDocumentModal from '@/components/UploadDocumentModal';

export default function MyDocuments() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [departmentFilter, setDepartmentFilter] = React.useState('all');
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [stats, setStats] = React.useState({
    total: 0,
    myUploads: 0,
    totalSize: 0,
    categories: 0
  });

  React.useEffect(() => {
    loadDocuments();
  }, []);

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
        let query = supabase
          .from('documents')
          .select(`
            *,
            user_company_roles!documents_uploaded_by_fkey (
              user_profiles (
                full_name,
                email
              )
            ),
            departments (
              name
            )
          `)
          .eq('company_id', userRole.company_id)
          .order('created_at', { ascending: false });

        // Filtrar por visibilidad según el rol del usuario
        if (userRole.role === 'employee') {
          // Empleados ven documentos de su departamento o de toda la empresa
          query = query.or(`visibility.eq.company,visibility.eq.department.and.department_id.eq.${userRole.department_id}`);
        }
        // Managers y admins ven todos los documentos

        const { data, error } = await query;

        if (!error && data) {
          setDocuments(data);
          calculateStats(data, user.id);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(documentsData, userId) {
    const total = documentsData.length;
    const myUploads = documentsData.filter(d => d.uploaded_by === userId).length;
    const totalSize = documentsData.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    const categories = new Set(documentsData.map(d => d.category)).size;

    setStats({ total, myUploads, totalSize, categories });
  }

  function getCategoryInfo(category) {
    switch (category) {
      case 'hr': return { label: 'Recursos Humanos', color: 'bg-blue-100 text-blue-800' };
      case 'finance': return { label: 'Finanzas', color: 'bg-green-100 text-green-800' };
      case 'operations': return { label: 'Operaciones', color: 'bg-purple-100 text-purple-800' };
      case 'marketing': return { label: 'Marketing', color: 'bg-pink-100 text-pink-800' };
      case 'legal': return { label: 'Legal', color: 'bg-red-100 text-red-800' };
      case 'training': return { label: 'Capacitación', color: 'bg-yellow-100 text-yellow-800' };
      case 'other': return { label: 'Otro', color: 'bg-gray-100 text-gray-800' };
      default: return { label: 'General', color: 'bg-gray-100 text-gray-800' };
    }
  }

  function getFileIcon(fileType) {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📄';
    return '📎';
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

    // Filtro por departamento
    if (departmentFilter !== 'all' && document.department_id !== departmentFilter) {
      return false;
    }

    return true;
  });

  function handleDocumentUploaded(newDocument) {
    setDocuments(prev => [newDocument, ...prev]);
    calculateStats([newDocument, ...documents], (await supabase.auth.getUser()).data.user.id);
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
          <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y comparte documentos con tu equipo
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Subir Documento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mis Subidas</p>
              <p className="text-3xl font-bold text-foreground">{stats.myUploads}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tamaño Total</p>
              <p className="text-3xl font-bold text-foreground">{formatFileSize(stats.totalSize)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categorías</p>
              <p className="text-3xl font-bold text-foreground">{stats.categories}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">Todas las categorías</option>
              <option value="general">General</option>
              <option value="hr">Recursos Humanos</option>
              <option value="finance">Finanzas</option>
              <option value="operations">Operaciones</option>
              <option value="marketing">Marketing</option>
              <option value="legal">Legal</option>
              <option value="training">Capacitación</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Departamento</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">Todos los departamentos</option>
              <option value="">Sin departamento</option>
              {/* Aquí podrías cargar los departamentos dinámicamente */}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setDepartmentFilter('all');
              }}
              className="btn btn-ghost w-full"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Documentos Disponibles
          </h3>
        </div>
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || categoryFilter !== 'all' || departmentFilter !== 'all'
                  ? 'No hay documentos que coincidan con los filtros' 
                  : 'No hay documentos disponibles'}
              </p>
              {!searchTerm && categoryFilter === 'all' && departmentFilter === 'all' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn btn-primary mt-4"
                >
                  Subir Primer Documento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document) => {
                const categoryInfo = getCategoryInfo(document.category);
                
                return (
                  <div key={document.id} className="card p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">
                          {getFileIcon(document.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground truncate">
                              {document.title}
                            </h4>
                            <span className={`badge ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                          </div>
                          {document.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {document.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {document.user_company_roles?.user_profiles?.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(document.created_at)}
                            </span>
                            <span>{formatFileSize(document.file_size)}</span>
                            {document.departments?.name && (
                              <span className="flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {document.departments.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              {document.visibility === 'company' ? (
                                <Users className="w-3 h-3" />
                              ) : (
                                <Folder className="w-3 h-3" />
                              )}
                              {document.visibility === 'company' ? 'Empresa' : 'Departamento'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={document.file_url}
                          download={document.file_name}
                          className="btn btn-ghost btn-sm"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </div>
  );
}
