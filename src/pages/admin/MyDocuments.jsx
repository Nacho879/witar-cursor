import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/lib/notificationService';
import { generateSafeFileName } from '@/lib/securityUtils';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  Users,
  User,
  Building,
  Calendar,
  Eye,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export default function AdminMyDocuments() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedRecipient, setSelectedRecipient] = React.useState('all');
  const [availableUsers, setAvailableUsers] = React.useState([]);
  const [availableDepartments, setAvailableDepartments] = React.useState([]);
  const [viewMode, setViewMode] = React.useState('list'); // 'list' or 'folders'
  const [expandedFolders, setExpandedFolders] = React.useState(new Set());
  const [uploadForm, setUploadForm] = React.useState({
    title: '',
    description: '',
    category: 'other',
    recipientType: 'user', // 'user', 'department', 'all'
    selectedUser: '',
    selectedDepartment: '',
    file: null
  });
  const [stats, setStats] = React.useState({
    totalDocuments: 0,
    documentsByCategory: {},
    documentsByRecipient: {},
    totalUsers: 0
  });

  React.useEffect(() => {
    loadDocuments();
    loadUsersAndDepartments();
  }, []);

  async function loadUsersAndDepartments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

      // Cargar usuarios (empleados y managers) primero
      const { data: users, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id, role, department_id')
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .in('role', ['employee', 'manager']);

      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      if (users && users.length > 0) {
        // Obtener los IDs de usuarios
        const userIds = users.map(user => user.user_id);

        // Cargar perfiles de usuario por separado
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        }

        // Combinar los datos
        const formattedUsers = users.map(user => {
          const profile = profiles?.find(p => p.user_id === user.user_id);
          return {
            id: user.user_id,
            full_name: profile?.full_name || 'Usuario sin nombre',
            avatar_url: profile?.avatar_url,
            role: user.role,
            department_id: user.department_id
          };
        });

        setAvailableUsers(formattedUsers);
      }

      // Cargar departamentos
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', userRole.company_id)
        .eq('status', 'active');

      if (deptError) {
        console.error('Error loading departments:', deptError);
      } else if (departments) {
        setAvailableDepartments(departments);
      }
    } catch (error) {
      console.error('Error loading users and departments:', error);
    }
  }

  async function loadDocuments() {
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

      if (!userRole) return;

      console.log('🔍 Debug - Loading documents for company:', userRole.company_id);

      // Cargar documentos subidos por el admin (sin file_url para optimizar ancho de banda)
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, title, description, category, file_type, file_size, user_id, company_id, uploaded_by, created_at, updated_at')
        .eq('company_id', userRole.company_id)
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('🔍 Debug - Documents found:', documents?.length || 0);
      console.log('🔍 Debug - Documents:', documents);

      // Obtener información de los destinatarios
      const recipientIds = [...new Set(documents.map(doc => doc.user_id))];
      console.log('🔍 Debug - Recipient IDs:', recipientIds);

      const { data: recipients } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', recipientIds);

      console.log('🔍 Debug - Recipients found:', recipients?.length || 0);
      console.log('🔍 Debug - Recipients:', recipients);

      // Combinar datos
      const documentsWithRecipients = documents.map(doc => {
        const recipient = recipients?.find(r => r.user_id === doc.user_id);
        return {
          ...doc,
          recipient_name: recipient?.full_name || 'Usuario desconocido',
          recipient_avatar: recipient?.avatar_url
        };
      });

      console.log('🔍 Debug - Documents with recipients:', documentsWithRecipients);

      setDocuments(documentsWithRecipients);
      calculateStats(documentsWithRecipients);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(docs) {
    const totalDocuments = docs.length;
    const documentsByCategory = {};
    const documentsByRecipient = {};

    docs.forEach(doc => {
      // Por categoría
      documentsByCategory[doc.category] = (documentsByCategory[doc.category] || 0) + 1;
      
      // Por destinatario
      documentsByRecipient[doc.recipient_name] = (documentsByRecipient[doc.recipient_name] || 0) + 1;
    });

    setStats({
      totalDocuments,
      documentsByCategory,
      documentsByRecipient
    });
  }

  async function uploadDocument() {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No hay usuario autenticado');
        return;
      }

      console.log('👤 Usuario autenticado:', user.id, user.email);

      const { data: userRole, error: roleError } = await supabase
        .from('user_company_roles')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (roleError) {
        console.error('❌ Error obteniendo rol:', roleError);
        return;
      }

      if (!userRole) {
        console.error('❌ No se encontró rol de usuario');
        return;
      }

      console.log('✅ Rol de usuario:', userRole);

      if (!uploadForm.file) {
        alert('Por favor selecciona un archivo');
        return;
      }

      // Determinar destinatarios
      let recipients = [];
      
      if (uploadForm.recipientType === 'all') {
        recipients = availableUsers;
      } else if (uploadForm.recipientType === 'department' && uploadForm.selectedDepartment) {
        recipients = availableUsers.filter(u => u.department_id === uploadForm.selectedDepartment);
      } else if (uploadForm.recipientType === 'user' && uploadForm.selectedUser) {
        recipients = availableUsers.filter(u => u.id === uploadForm.selectedUser);
      }

      console.log('🔍 Debug - Recipients:', recipients);
      console.log('🔍 Debug - Available Users:', availableUsers);
      console.log('🔍 Debug - Selected User:', uploadForm.selectedUser);

      if (recipients.length === 0) {
        alert('Por favor selecciona al menos un destinatario');
        return;
      }

      // Generar nombre seguro para el archivo
      const fileName = generateSafeFileName(uploadForm.file.name);
      const filePath = `documents/${userRole.company_id}/${Date.now()}_${fileName}`;

      // Subir archivo a Supabase Storage UNA VEZ
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('witar-documents')
        .upload(filePath, uploadForm.file);

      if (uploadError) {
        console.error('Error uploading file to storage:', uploadError);
        alert('Error al subir el archivo a Storage');
        return;
      }

      // Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('witar-documents')
        .getPublicUrl(filePath);

      // Obtener nombre del usuario que sube el documento
      const { data: uploaderProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const uploaderName = uploaderProfile?.full_name || 'Administrador';

      // Crear documentos para cada destinatario (compartiendo la misma URL)
      const documentPromises = recipients.map(recipient => {
        console.log('📄 Creating document for recipient:', recipient);
        
        const documentData = {
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          file_url: publicUrl, // Usar URL de Storage en lugar de Base64
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          user_id: recipient.id, // recipient.id es el user_id
          company_id: userRole.company_id,
          uploaded_by: user.id
        };
        
        console.log('📤 Document data being sent:', {
          title: documentData.title,
          user_id: documentData.user_id,
          company_id: documentData.company_id,
          uploaded_by: documentData.uploaded_by,
          current_user: user.id,
          user_role: userRole.role
        });
        
        return supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single()
          .then(result => {
            if (result.error) {
              console.error('❌ Error en inserción:', result.error);
              console.error('❌ Detalles del error:', {
                code: result.error.code,
                message: result.error.message,
                details: result.error.details,
                hint: result.error.hint
              });
            } else {
              console.log('✅ Documento insertado exitosamente:', result.data);
            }
            return result;
          });
      });

      try {
        const results = await Promise.all(documentPromises);
        console.log('✅ Upload results:', results);
        
        // Verificar si hubo errores
        const errors = results.filter(result => result.error);
        if (errors.length > 0) {
          console.error('❌ Upload errors:', errors);
          alert('Error al subir algunos documentos');
          return;
        }
        
        // Enviar notificaciones a todos los destinatarios
        const notificationPromises = results
          .filter(result => !result.error && result.data)
          .map(result => {
            const document = result.data;
            const recipient = recipients.find(r => r.id === document.user_id);
            if (recipient) {
              return NotificationService.notifyDocumentUploadedToUser({
                companyId: userRole.company_id,
                documentTitle: uploadForm.title,
                recipientUserId: recipient.id,
                uploaderName: uploaderName,
                documentId: document.id
              }).catch(err => {
                console.error('Error sending notification:', err);
                return null; // No fallar si una notificación falla
              });
            }
            return Promise.resolve(null);
          });

        await Promise.all(notificationPromises);
        
        alert(`Documento subido exitosamente a ${recipients.length} destinatario${recipients.length > 1 ? 's' : ''}`);
        setShowUploadModal(false);
        resetUploadForm();
        
        // Recargar documentos después de subir
        await loadDocuments();
      } catch (error) {
        console.error('Error uploading documents:', error);
        alert('Error al subir el documento');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  }

  function resetUploadForm() {
    setUploadForm({
      title: '',
      description: '',
      category: 'other',
      recipientType: 'user',
      selectedUser: '',
      selectedDepartment: '',
      file: null
    });
  }

  async function deleteDocument(documentId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      // Primero obtener el file_url para eliminar el archivo de Storage si existe
      const { data: documentData, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Si el archivo está en Storage (URL de Supabase), extraer la ruta y eliminarlo
      if (documentData?.file_url && documentData.file_url.includes('supabase.co/storage/v1/object/public/witar-documents/')) {
        try {
          // Extraer la ruta del archivo de la URL
          const urlParts = documentData.file_url.split('/witar-documents/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1].split('?')[0]; // Remover query params si existen
            const { error: storageError } = await supabase.storage
              .from('witar-documents')
              .remove([filePath]);
            
            if (storageError) {
              console.warn('Error eliminando archivo de Storage:', storageError);
              // Continuar con la eliminación del registro aunque falle Storage
            }
          }
        } catch (storageErr) {
          console.warn('Error al procesar eliminación de Storage:', storageErr);
          // Continuar con la eliminación del registro
        }
      }

      // Eliminar el registro de la base de datos
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error eliminando documento de la BD:', error);
        throw error;
      }

      alert('Documento eliminado exitosamente');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMessage = error?.message || error?.error_description || 'Error desconocido';
      alert(`Error al eliminar el documento: ${errorMessage}`);
    }
  }

  // Función para cargar file_url solo cuando se necesite
  async function loadDocumentFileUrl(documentId) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single();
      
      if (error) throw error;
      return data?.file_url;
    } catch (error) {
      console.error('Error loading document file URL:', error);
      return null;
    }
  }

  async function handleDownload(document) {
    try {
      // Si no tenemos file_url, cargarlo primero
      let fileUrl = document.file_url;
      if (!fileUrl) {
        fileUrl = await loadDocumentFileUrl(document.id);
      }
      
      if (!fileUrl) {
        alert('No se pudo cargar el archivo');
        return;
      }
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = document.title + getFileExtension(document.file_type);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar el archivo');
    }
  }

  function getFileExtension(mimeType) {
    const extensions = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'text/plain': '.txt',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    return extensions[mimeType] || '';
  }

  function getFilteredDocuments() {
    let filtered = documents;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filtrar por destinatario
    if (selectedRecipient !== 'all') {
      filtered = filtered.filter(doc => doc.recipient_name === selectedRecipient);
    }

    return filtered;
  }

  // Función para organizar documentos por usuario (carpetas)
  function organizeDocumentsByUser(docs) {
    console.log('🔍 Debug - Organizing documents by user:', docs);
    
    const folders = {};
    
    docs.forEach(doc => {
      const userId = doc.user_id;
      const userName = doc.recipient_name;
      
      console.log('🔍 Debug - Processing document:', { userId, userName, docTitle: doc.title });
      
      if (!folders[userId]) {
        folders[userId] = {
          userId,
          userName,
          documents: [],
          totalDocuments: 0,
          categories: new Set(),
          totalSize: 0
        };
        console.log('🔍 Debug - Created new folder for user:', userName);
      }
      
      folders[userId].documents.push(doc);
      folders[userId].totalDocuments++;
      folders[userId].categories.add(doc.category);
      folders[userId].totalSize += doc.file_size || 0;
    });
    
    // Convertir Sets a arrays para el renderizado
    Object.values(folders).forEach(folder => {
      folder.categories = Array.from(folder.categories);
    });
    
    console.log('🔍 Debug - Final folders:', folders);
    return folders;
  }

  // Función para alternar la expansión de una carpeta
  function toggleFolder(userId) {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedFolders(newExpanded);
  }

  // Función para obtener el tamaño formateado
  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const filteredDocuments = getFilteredDocuments();
  const userFolders = organizeDocumentsByUser(filteredDocuments);

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Documentos</h1>
        <p className="text-muted-foreground mt-1">
          Sube y gestiona documentos para empleados y managers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Documentos</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalDocuments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Por Categoría</p>
              <p className="text-3xl font-bold text-foreground">
                {Object.keys(stats.documentsByCategory).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
              <p className="text-3xl font-bold text-foreground">
                {Object.keys(stats.documentsByRecipient).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Carpetas</p>
              <p className="text-3xl font-bold text-foreground">
                {Object.keys(userFolders).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input"
            >
              <option value="all">Todas las categorías</option>
              <option value="contract">Contratos</option>
              <option value="id">Identificación</option>
              <option value="certificate">Certificados</option>
              <option value="other">Otros</option>
            </select>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="input"
            >
              <option value="all">Todos los destinatarios</option>
              {Object.keys(stats.documentsByRecipient).map(recipient => (
                <option key={recipient} value={recipient}>{recipient}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('folders')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'folders' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Carpetas
              </button>
            </div>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Subir Documento
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {viewMode === 'list' ? 'Documentos Subidos' : 'Carpetas por Usuario'}
            </h3>
            <div className="text-sm text-muted-foreground">
              {viewMode === 'list' 
                ? `${filteredDocuments.length} documentos` 
                : `${Object.keys(userFolders).length} carpetas`
              }
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {viewMode === 'list' ? (
            // Vista de Lista (existente)
            filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay documentos para mostrar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{document.title}</h4>
                        <p className="text-sm text-muted-foreground">{document.description}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {document.category}
                          </span>
                          <div className="flex items-center gap-2">
                            {document.recipient_avatar ? (
                              <img 
                                src={document.recipient_avatar} 
                                alt={document.recipient_name}
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {document.recipient_name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(document.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(document)}
                        className="btn btn-ghost btn-sm"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDocument(document.id)}
                        className="btn btn-ghost btn-sm text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Vista de Carpetas (nueva)
            Object.keys(userFolders).length === 0 ? (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay carpetas para mostrar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(userFolders).map((folder) => (
                  <div key={folder.userId} className="border border-border rounded-lg overflow-hidden">
                    {/* Header de la carpeta */}
                    <div 
                      className="flex items-center justify-between p-4 bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors"
                      onClick={() => toggleFolder(folder.userId)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedFolders.has(folder.userId) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {expandedFolders.has(folder.userId) ? (
                            <FolderOpen className="w-5 h-5 text-primary" />
                          ) : (
                            <Folder className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{folder.userName}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {folder.totalDocuments} documento{folder.totalDocuments !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(folder.totalSize)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {folder.categories.length} categoría{folder.categories.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {folder.categories.join(', ')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Contenido de la carpeta */}
                    {expandedFolders.has(folder.userId) && (
                      <div className="p-4 bg-background">
                        <div className="space-y-3">
                          {folder.documents.map((document) => (
                            <div key={document.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/20">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <h5 className="font-medium text-foreground text-sm">{document.title}</h5>
                                  <p className="text-xs text-muted-foreground">{document.description}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                                      {document.category}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatFileSize(document.file_size)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(document.created_at).toLocaleDateString('es-ES')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownload(document)}
                                  className="btn btn-ghost btn-sm"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteDocument(document.id)}
                                  className="btn btn-ghost btn-sm text-red-600"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">Subir Documento</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-ghost btn-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Título del Documento
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  className="input w-full"
                  placeholder="Ej: Contrato de trabajo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  className="input w-full"
                  rows="3"
                  placeholder="Descripción del documento..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Categoría
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                  className="input w-full"
                >
                  <option value="contract">Contratos</option>
                  <option value="id">Identificación</option>
                  <option value="certificate">Certificados</option>
                  <option value="other">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Destinatario
                </label>
                <select
                  value={uploadForm.recipientType}
                  onChange={(e) => setUploadForm({...uploadForm, recipientType: e.target.value})}
                  className="input w-full"
                >
                  <option value="user">Usuario específico</option>
                  <option value="department">Departamento</option>
                  <option value="all">Todos los usuarios</option>
                </select>
              </div>

              {uploadForm.recipientType === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Seleccionar Usuario
                  </label>
                  <select
                    value={uploadForm.selectedUser}
                    onChange={(e) => setUploadForm({...uploadForm, selectedUser: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {uploadForm.recipientType === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Seleccionar Departamento
                  </label>
                  <select
                    value={uploadForm.selectedDepartment}
                    onChange={(e) => setUploadForm({...uploadForm, selectedDepartment: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Seleccionar departamento...</option>
                    {availableDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Archivo
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                  className="input w-full"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={uploadDocument}
                disabled={uploading}
                className="btn btn-primary flex items-center gap-2"
              >
                {uploading ? (
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