-- =====================================================
-- LIMPIAR NOTIFICACIONES BORRADAS MAYORES A 15 DÍAS
-- =====================================================
-- Este script limpia automáticamente las notificaciones borradas
-- que tienen más de 15 días en el historial.
-- 
-- Se puede ejecutar manualmente o configurar como cron job
-- =====================================================

-- Ejecutar función de limpieza
SELECT cleanup_old_deleted_notifications() as notificaciones_eliminadas;

-- Ver cuántas notificaciones se eliminarían sin borrarlas
SELECT COUNT(*) as notificaciones_a_eliminar
FROM deleted_notifications
WHERE deleted_at < NOW() - INTERVAL '15 days';

-- Ver notificaciones que serán eliminadas (últimas 10)
SELECT 
  id,
  title,
  deleted_at,
  NOW() - deleted_at as dias_en_historial,
  deleted_by
FROM deleted_notifications
WHERE deleted_at < NOW() - INTERVAL '15 days'
ORDER BY deleted_at ASC
LIMIT 10;

