import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/lib/notificationService';
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
  AlertCircle,
  Upload,
  Plus,
  X
} from 'lucide-react';

export default function DocumentsManagement() {
  const [documents, setDocuments] = React.useState([]);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [uploadingDocument, setUploadingDocument] = React.useState(false);
  const [documentForm, setDocumentForm] = React.useState({
    title: '',
    description: '',
    category: 'general',
    file: null
  });
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        await Promise.all([
          loadTeamMembers(userRole.company_id, userRole.id),
          loadDocuments(userRole.company_id, user.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamMembers(companyId, managerId) {
    try {
      // Obtener el departamento del manager
      const { data: managerDepartment } = await supabase
        .from('user_company_roles')
        .select('department_id')
        .eq('id', managerId)
        .single();

      let teamUserIds = [];

      if (managerDepartment?.department_id) {
        // Obtener IDs de todos los empleados del departamento
        const { data: departmentMembers, error: deptError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('department_id', managerDepartment.department_id)
          .eq('is_active', true)
          .eq('role', 'employee'); // Solo empleados

        if (!deptError && departmentMembers) {
          teamUserIds = departmentMembers.map(member => member.user_id);
        }
      }

      if (teamUserIds.length > 0) {
        // Obtener los roles de usuario
        const { data: roles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            departments (
              name
            )
          `)
          .in('user_id', teamUserIds)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('joined_at', { ascending: true });

        if (!rolesError && roles) {
          // Obtener los perfiles de usuario por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', teamUserIds);

          if (!profilesError && profiles) {
            // Combinar los datos
            const membersWithProfiles = roles.map(role => {
              const profile = profiles.find(p => p.user_id === role.user_id);
              return {
                ...role,
                user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null }
              };
            });

            setTeamMembers(membersWithProfiles);
          } else {
            setTeamMembers(roles);
          }
        }
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadDocuments(companyId, managerId) {
    try {
      // Cargar documentos subidos por el manager
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('uploaded_by', managerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
        return;
      }

      if (documents && documents.length > 0) {
        // Obtener los user_ids únicos de los documentos
        const userIds = [...new Set(documents.map(doc => doc.user_id))];
        
        // Cargar los perfiles de usuario por separado
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          // Combinar los datos
          const documentsWithProfiles = documents.map(doc => {
            const profile = profiles.find(p => p.user_id === doc.user_id);
            return {
              ...doc,
              user_profiles: profile || { full_name: 'Usuario sin perfil', avatar_url: null }
            };
          });

          setDocuments(documentsWithProfiles);
        } else {
          // Si no hay perfiles, usar los documentos sin perfiles
          const documentsWithoutProfiles = documents.map(doc => ({
            ...doc,
            user_profiles: { full_name: 'Usuario sin perfil', avatar_url: null }
          }));
          setDocuments(documentsWithoutProfiles);
        }
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  }

  // Función para obtener información de categorías
  function getCategoryInfo(category) {
    const categories = {
      general: { name: 'General', icon: Folder, color: 'text-gray-600 bg-gray-100' },
      contract: { name: 'Contrato', icon: FileText, color: 'text-blue-600 bg-blue-100' },
      policy: { name: 'Política', icon: FileText, color: 'text-green-600 bg-green-100' },
      training: { name: 'Formación', icon: FileText, color: 'text-purple-600 bg-purple-100' },
      report: { name: 'Reporte', icon: FileText, color: 'text-orange-600 bg-orange-100' },
      other: { name: 'Otro', icon: FileText, color: 'text-red-600 bg-red-100' }
    };
    return categories[category] || categories.general;
  }

  // Función para formatear el tamaño del archivo
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Función para obtener el tiempo transcurrido
  function getTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return past.toLocaleDateString('es-ES');
  }

  // Función para abrir modal de subida
  function openUploadModal(employee) {
    setSelectedEmployee(employee);
    setDocumentForm({
      title: '',
      description: '',
      category: 'general',
      file: null
    });
    setShowUploadModal(true);
  }

  // Función para cerrar modal de subida
  function closeUploadModal() {
    setShowUploadModal(false);
    setSelectedEmployee(null);
    setDocumentForm({
      title: '',
      description: '',
      category: 'general',
      file: null
    });
  }

  // Función para manejar la selección de archivo
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      setDocumentForm(prev => ({ ...prev, file }));
    }
  }

  // Función para subir documento
  async function uploadDocument() {
    if (!documentForm.title || !documentForm.file || !selectedEmployee) {
      setMessage('Error: Por favor completa todos los campos');
      return;
    }

    try {
      setUploadingDocument(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Obtener nombre del usuario que sube el documento
      const { data: uploaderProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const uploaderName = uploaderProfile?.full_name || 'Manager';

      // Convertir archivo a Base64
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64Data = e.target.result;
        
        // Insertar documento en la base de datos
        const { data: document, error } = await supabase
          .from('documents')
          .insert({
            title: documentForm.title,
            description: documentForm.description,
            category: documentForm.category,
            file_url: base64Data,
            file_type: documentForm.file.type,
            file_size: documentForm.file.size,
            user_id: selectedEmployee.user_id,
            company_id: userRole.company_id,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error uploading document:', error);
          setMessage('Error al subir el documento');
        } else {
          // Enviar notificación al empleado
          try {
            await NotificationService.notifyDocumentUploadedToUser({
              companyId: userRole.company_id,
              documentTitle: documentForm.title,
              recipientUserId: selectedEmployee.user_id,
              uploaderName: uploaderName,
              documentId: document?.id
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // No fallar la subida si la notificación falla
          }

          setMessage('Documento subido exitosamente');
          closeUploadModal();
          loadData(); // Recargar datos
        }
      };
      reader.readAsDataURL(documentForm.file);
    } catch (error) {
      console.error('Error uploading document:', error);
      setMessage('Error al subir el documento');
    } finally {
      setUploadingDocument(false);
    }
  }

  // Función para descargar documento
  async function downloadDocument(document) {
    try {
      if (document.file_url) {
        // Verificar si es un archivo Base64
        if (document.file_url.startsWith('data:')) {
          // Es un archivo Base64, descargar directamente
          const link = document.createElement('a');
          link.href = document.file_url;
          
          // Extraer el nombre del archivo del título o usar un nombre por defecto
          const fileName = document.title || 'documento';
          
          // Agregar extensión basada en el tipo de archivo
          let extension = '';
          if (document.file_type) {
            if (document.file_type.includes('pdf')) extension = '.pdf';
            else if (document.file_type.includes('word') || document.file_type.includes('document')) extension = '.docx';
            else if (document.file_type.includes('excel') || document.file_type.includes('spreadsheet')) extension = '.xlsx';
            else if (document.file_type.includes('image')) extension = '.jpg';
            else if (document.file_type.includes('text')) extension = '.txt';
          }
          
          link.download = fileName + extension;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Es una URL, abrir en nueva pestaña
          window.open(document.file_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      setMessage('Error al descargar el documento');
    }
  }

  // Función para eliminar documento
  async function deleteDocument(documentId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        setMessage('Error al eliminar el documento');
      } else {
        setMessage('Documento eliminado exitosamente');
        loadData(); // Recargar datos
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setMessage('Error al eliminar el documento');
    }
  }

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Subir y gestionar documentos para tu equipo
          </p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`p-4 rounded-lg ${
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

      {/* Filtros */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            <option value="general">General</option>
            <option value="contract">Contrato</option>
            <option value="policy">Política</option>
            <option value="training">Formación</option>
            <option value="report">Reporte</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Documentos Subidos ({filteredDocuments.length})
            </h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Subir Documento
            </button>
          </div>
        </div>
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay documentos subidos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sube documentos para tus empleados usando el botón de arriba
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => {
                const categoryInfo = getCategoryInfo(doc.category);
                const CategoryIcon = categoryInfo.icon;

                return (
                  <div key={doc.id} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                    <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {doc.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Para: {doc.user_profiles?.full_name || 'Empleado'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(doc.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal para subir documentos */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Subir Documento
              </h3>
              <button
                onClick={closeUploadModal}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Seleccionar empleado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seleccionar Empleado
                </label>
                <select
                  value={selectedEmployee?.user_id || ''}
                  onChange={(e) => {
                    const employee = teamMembers.find(m => m.user_id === e.target.value);
                    setSelectedEmployee(employee);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecciona un empleado</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user_profiles?.full_name || 'Empleado sin nombre'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título del documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título del Documento
                </label>
                <input
                  type="text"
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Contrato de trabajo"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={documentForm.description}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional del documento"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoría
                </label>
                <select
                  value={documentForm.category}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="general">General</option>
                  <option value="contract">Contrato</option>
                  <option value="policy">Política</option>
                  <option value="training">Formación</option>
                  <option value="report">Reporte</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Seleccionar archivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Archivo
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documentForm.file && (
                  <p className="text-sm text-gray-500 mt-1">
                    Archivo seleccionado: {documentForm.file.name} ({formatFileSize(documentForm.file.size)})
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
              <button
                onClick={closeUploadModal}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={uploadDocument}
                disabled={uploadingDocument || !documentForm.title || !documentForm.file || !selectedEmployee}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingDocument ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Documento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 