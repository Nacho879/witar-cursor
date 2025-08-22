// =====================================================
// UTILIDADES DE SEGURIDAD - WITAR
// =====================================================

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Valida y sanitiza nombre de departamento
 * @param {string} name - Nombre del departamento
 * @returns {object} - { isValid: boolean, sanitized: string, errors: string[] }
 */
export function validateDepartmentName(name) {
  const errors = [];
  const sanitized = sanitizeText(name);
  
  if (!sanitized) {
    errors.push('El nombre del departamento es obligatorio');
  } else if (sanitized.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  } else if (sanitized.length > 50) {
    errors.push('El nombre no puede exceder 50 caracteres');
  }
  
  // Validar caracteres permitidos
  const allowedPattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/;
  if (sanitized && !allowedPattern.test(sanitized)) {
    errors.push('El nombre solo puede contener letras, espacios, guiones y puntos');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Valida y sanitiza título de documento
 * @param {string} title - Título del documento
 * @returns {object} - { isValid: boolean, sanitized: string, errors: string[] }
 */
export function validateDocumentTitle(title) {
  const errors = [];
  const sanitized = sanitizeText(title);
  
  if (!sanitized) {
    errors.push('El título es obligatorio');
  } else if (sanitized.length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  } else if (sanitized.length > 100) {
    errors.push('El título no puede exceder 100 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Valida archivo subido
 * @param {File} file - Archivo a validar
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export function validateUploadedFile(file) {
  const errors = [];
  
  if (!file) {
    errors.push('Debes seleccionar un archivo');
    return { isValid: false, errors };
  }
  
  // Validar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('El archivo no puede exceder 10MB');
  }
  
  // Validar tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de archivo no permitido. Solo se permiten PDF, Word, Excel, texto e imágenes');
  }
  
  // Validar extensión del archivo
  const fileName = file.name.toLowerCase();
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push('Extensión de archivo no permitida');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida URL
 * @param {string} url - URL a validar
 * @returns {boolean} - true si es válida
 */
export function isValidUrl(url) {
  if (!url) return true; // URLs opcionales
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
export function isValidEmail(email) {
  if (!email) return false;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.toLowerCase().trim());
}

/**
 * Genera nombre seguro para archivo
 * @param {string} originalName - Nombre original del archivo
 * @returns {string} - Nombre seguro
 */
export function generateSafeFileName(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop().toLowerCase();
  
  return `${timestamp}-${random}.${extension}`;
} 