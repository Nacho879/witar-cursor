import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/lib/notificationService';
import { X, Upload, FileText, Folder, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { validateDocumentTitle, validateUploadedFile, generateSafeFileName } from '@/lib/securityUtils';

export default function UploadDocumentModal({ isOpen, onClose, onDocumentUploaded }) {
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('general');
  const [departmentId, setDepartmentId] = React.useState('');

  const [file, setFile] = React.useState(null);
  const [companyId, setCompanyId] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      loadCompanyId();
      loadDepartments();
    }
  }, [isOpen]);

  async function loadCompanyId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRole } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (userRole) {
          setCompanyId(userRole.company_id);
        }
      }
    } catch (error) {
      console.error('Error loading company ID:', error);
    }
  }

  async function loadDepartments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (userRole) {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', userRole.company_id)
          .eq('status', 'active')
          .order('name');

        if (!error && data) {
          setDepartments(data);
        }
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validar archivo usando utilidades de seguridad
      const fileValidation = validateUploadedFile(selectedFile);
      if (!fileValidation.isValid) {
        setMessage(`Error: ${fileValidation.errors.join(', ')}`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setMessage('');
    }
  }

  function validateForm() {
    // Validar título usando utilidades de seguridad
    const titleValidation = validateDocumentTitle(title);
    if (!titleValidation.isValid) {
      setMessage(`Error: ${titleValidation.errors.join(', ')}`);
      return false;
    }

    if (description.trim().length > 500) {
      setMessage('Error: La descripción no puede exceder 500 caracteres');
      return false;
    }

    if (!file) {
      setMessage('Error: Debes seleccionar un archivo');
      return false;
    }

    return true;
  }

  async function uploadDocument() {
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      if (!companyId) {
        setMessage('Error: No se pudo identificar la empresa');
        return;
      }

      // Generar nombre seguro para el archivo
      const fileName = generateSafeFileName(file.name);
      const filePath = `documents/${companyId}/${fileName}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('witar-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
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

      const uploaderName = uploaderProfile?.full_name || 'Usuario';

      // Crear registro en la base de datos
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          uploaded_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          user_id: departmentId || null // Usar departmentId como user_id si está disponible
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Enviar notificación si el documento está asignado a un usuario específico
      if (departmentId) {
        try {
          await NotificationService.notifyDocumentUploadedToUser({
            companyId: companyId,
            documentTitle: title.trim(),
            recipientUserId: departmentId,
            uploaderName: uploaderName,
            documentId: document?.id
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // No fallar la subida si la notificación falla
        }
      }

      setMessage('¡Documento subido exitosamente!');
      
      // Limpiar formulario
      setTitle('');
      setDescription('');
      setCategory('general');
      setDepartmentId('');
      setFile(null);
      
      // Notificar al componente padre
      if (onDocumentUploaded) {
        onDocumentUploaded(document);
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Subir Documento</h2>
              <p className="text-sm text-muted-foreground">
                Comparte archivos con tu equipo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-3">Archivo</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">
                  {file ? file.name : 'Haz clic para seleccionar un archivo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, Word, Excel, texto o imágenes (máx. 10MB)
                </p>
              </label>
            </div>
            {file && (
              <div className="mt-3 p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Título <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Nombre del documento..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
            <textarea
              placeholder="Describe el contenido del documento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input w-full resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 caracteres
            </p>
          </div>

          {/* Category and Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input w-full"
              >
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
              <label className="block text-sm font-medium mb-2">Departamento (opcional)</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="input w-full"
              >
                <option value="">Sin departamento específico</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.includes('Error')
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-success/10 text-success border border-success/20'
            }`}>
              {message.includes('Error') ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={uploadDocument}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Subir Documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 