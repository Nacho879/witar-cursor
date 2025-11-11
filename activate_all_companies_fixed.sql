-- =====================================================
-- Script para activar TODAS las empresas en la base de datos
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Este script maneja RLS correctamente
-- =====================================================

-- 1. Verificar estado actual ANTES de activar
SELECT 
  '📊 Estado ANTES de activar' as info,
  status,
  COUNT(*) as cantidad,
  COUNT(*) FILTER (WHERE blocked_at IS NOT NULL) as bloqueadas
FROM companies
GROUP BY status
ORDER BY status;

-- 2. Mostrar empresas que necesitan activación
SELECT 
  '📋 Empresas que se activarán' as info,
  id,
  name,
  status as estado_actual,
  blocked_at,
  blocked_reason,
  created_at
FROM companies
WHERE status != 'active' OR blocked_at IS NOT NULL
ORDER BY created_at DESC;

-- 3. Contar cuántas empresas se van a actualizar
SELECT 
  '🔢 Total de empresas a activar' as info,
  COUNT(*) as total_a_activar
FROM companies
WHERE status != 'active' OR blocked_at IS NOT NULL;

-- 4. IMPORTANTE: Deshabilitar RLS temporalmente para permitir la actualización
-- Esto es necesario porque las políticas RLS solo permiten que owners actualicen
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- 5. Activar TODAS las empresas que no estén activas o estén bloqueadas
UPDATE companies 
SET 
  status = 'active',
  blocked_at = NULL,
  blocked_reason = NULL,
  updated_at = NOW()
WHERE status != 'active' OR blocked_at IS NOT NULL;

-- 6. Volver a habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 7. Verificar el resultado DESPUÉS de activar
SELECT 
  '✅ Estado DESPUÉS de activar' as info,
  status,
  COUNT(*) as cantidad,
  COUNT(*) FILTER (WHERE blocked_at IS NOT NULL) as bloqueadas
FROM companies
GROUP BY status
ORDER BY status;

-- 8. Mostrar resumen final detallado
SELECT 
  '📈 Resumen final' as info,
  COUNT(*) FILTER (WHERE status = 'active') as empresas_activas,
  COUNT(*) FILTER (WHERE status = 'trial') as empresas_en_prueba,
  COUNT(*) FILTER (WHERE status = 'blocked') as empresas_bloqueadas,
  COUNT(*) as total_empresas,
  COUNT(*) FILTER (WHERE blocked_at IS NOT NULL) as empresas_con_blocked_at
FROM companies;

-- 9. Verificar que no queden empresas bloqueadas
SELECT 
  '🔍 Verificación: Empresas aún bloqueadas' as info,
  id,
  name,
  status,
  blocked_at,
  blocked_reason
FROM companies
WHERE status = 'blocked' OR blocked_at IS NOT NULL;

-- 10. Listar todas las empresas activas
SELECT 
  '✅ Lista de todas las empresas activas' as info,
  id,
  name,
  status,
  created_at
FROM companies
WHERE status = 'active'
ORDER BY created_at DESC;

SELECT '🎉 Proceso de activación completado' as resultado;

