-- =====================================================
-- CREAR BUCKET DE STORAGE PARA DOCUMENTOS
-- =====================================================

-- Crear el bucket 'witar-documents' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'witar-documents',
  'witar-documents',
  true, -- Bucket público para acceso directo
  10485760, -- 10MB límite de tamaño
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POLÍTICAS RLS PARA EL BUCKET
-- =====================================================

-- Política para permitir que usuarios autenticados suban archivos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'witar-documents' AND
  (storage.foldername(name))[1] = 'documents'
);

-- Política para permitir que usuarios autenticados lean archivos
CREATE POLICY "Usuarios autenticados pueden leer documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'witar-documents'
);

-- Política para permitir que usuarios autenticados eliminen sus propios archivos
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'witar-documents'
);

-- Política para permitir acceso público a lectura (opcional, si quieres que los documentos sean accesibles sin autenticación)
CREATE POLICY "Acceso público de lectura a documentos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'witar-documents'
);

