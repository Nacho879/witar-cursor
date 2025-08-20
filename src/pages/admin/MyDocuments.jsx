import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  CheckCircle
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
    documentsByRecipient: {}
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
            name: profile?.full_name || 'Usuario sin nombre',
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

      // Cargar documentos subidos por el admin
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', userRole.company_id)
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener información de los destinatarios
      const recipientIds = [...new Set(documents.map(doc => doc.user_id))];
      const { data: recipients } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', recipientIds);

      // Combinar datos
      const documentsWithRecipients = documents.map(doc => {
        const recipient = recipients?.find(r => r.user_id === doc.user_id);
        return {
          ...doc,
          recipient_name: recipient?.full_name || 'Usuario desconocido',
          recipient_avatar: recipient?.avatar_url
        };
      });

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
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRole) return;

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

      if (recipients.length === 0) {
        alert('Por favor selecciona al menos un destinatario');
        return;
      }

      // Leer archivo como Base64
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64Data = e.target.result;

        // Crear documentos para cada destinatario
        const documentPromises = recipients.map(recipient => 
          supabase.from('documents').insert({
            title: uploadForm.title,
            description: uploadForm.description,
            category: uploadForm.category,
            file_url: base64Data,
            file_type: uploadForm.file.type,
            file_size: uploadForm.file.size,
            user_id: recipient.id,
            company_id: userRole.company_id,
            uploaded_by: user.id
          })
        );

        try {
          await Promise.all(documentPromises);
          alert(`Documento subido exitosamente a ${recipients.length} destinatario${recipients.length > 1 ? 's' : ''}`);
          setShowUploadModal(false);
          resetUploadForm();
          loadDocuments();
        } catch (error) {
          console.error('Error uploading documents:', error);
          alert('Error al subir el documento');
        }
      };

      reader.readAsDataURL(uploadForm.file);
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
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      alert('Documento eliminado exitosamente');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  }

  function handleDownload(document) {
    try {
      const link = document.createElement('a');
      link.href = document.file_url;
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

  const filteredDocuments = getFilteredDocuments();

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
              <p className="text-sm font-medium text-muted-foreground">Destinatarios</p>
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
              <p className="text-sm font-medium text-muted-foreground">Último Mes</p>
              <p className="text-3xl font-bold text-foreground">
                {documents.filter(doc => {
                  const docDate = new Date(doc.created_at);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return docDate > monthAgo;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
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
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Documentos Subidos</h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Subir Documento
            </button>
          </div>
        </div>
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
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
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Subir Documento</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Título del Documento
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej: Contrato de trabajo"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full"
                    rows={3}
                    placeholder="Descripción del documento..."
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Categoría
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="contract">Contrato</option>
                    <option value="id">Identificación</option>
                    <option value="certificate">Certificado</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                {/* Tipo de Destinatario */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Destinatarios
                  </label>
                  <select
                    value={uploadForm.recipientType}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      recipientType: e.target.value,
                      selectedUser: '',
                      selectedDepartment: ''
                    }))}
                    className="input w-full"
                  >
                    <option value="user">Usuario específico</option>
                    <option value="department">Departamento completo</option>
                    <option value="all">Todos los empleados y managers</option>
                  </select>
                </div>

                {/* Usuario específico */}
                {uploadForm.recipientType === 'user' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Seleccionar Usuario
                    </label>
                    <select
                      value={uploadForm.selectedUser}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, selectedUser: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role === 'manager' ? 'Gerente' : 'Empleado'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Departamento */}
                {uploadForm.recipientType === 'department' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Seleccionar Departamento
                    </label>
                    <select
                      value={uploadForm.selectedDepartment}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, selectedDepartment: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="">Seleccionar departamento...</option>
                      {availableDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Archivo */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Archivo
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
                    className="input w-full"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="btn btn-outline"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={uploadDocument}
                disabled={uploading || !uploadForm.title || !uploadForm.file}
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