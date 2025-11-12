# Historial de Notificaciones Borradas

## Descripción

Sistema de historial que guarda las notificaciones borradas durante 15 días antes de eliminarlas permanentemente. Esto permite recuperar información importante que pudo haber sido eliminada por error.

## Características

- ✅ Guarda automáticamente las notificaciones antes de borrarlas
- ✅ Mantiene el historial por 15 días
- ✅ Limpieza automática de registros antiguos
- ✅ Vista de historial en la interfaz de usuario
- ✅ Muestra días restantes hasta eliminación permanente

## Instalación

### 1. Ejecutar la migración SQL

Ejecuta el archivo de migración en Supabase:

```sql
supabase/migrations/0020_create_deleted_notifications_history.sql
```

O ejecuta directamente en el SQL Editor de Supabase:

```sql
-- Ver el archivo completo en: supabase/migrations/0020_create_deleted_notifications_history.sql
```

### 2. Verificar la instalación

```sql
-- Verificar que la tabla existe
SELECT * FROM deleted_notifications LIMIT 1;

-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'before_delete_notification';

-- Verificar que la función de limpieza existe
SELECT * FROM pg_proc WHERE proname = 'cleanup_old_deleted_notifications';
```

## Uso

### Ver historial en la interfaz

1. Ve a la página de Notificaciones
2. Haz clic en la pestaña "Historial Borradas"
3. Verás todas las notificaciones eliminadas con:
   - Fecha de creación original
   - Fecha de borrado
   - Días restantes hasta eliminación permanente

### Limpiar manualmente

Para limpiar las notificaciones mayores a 15 días manualmente:

```sql
-- Ejecutar limpieza
SELECT cleanup_old_deleted_notifications();
```

O usar el archivo SQL:

```bash
# Ejecutar en Supabase SQL Editor
cleanup_deleted_notifications.sql
```

### Limpieza automática con Cron Job

#### Opción 1: Usar Supabase Cron (Recomendado)

1. Ve a Supabase Dashboard > Database > Cron Jobs
2. Crea un nuevo cron job:

```sql
-- Ejecutar diariamente a las 2 AM
SELECT cron.schedule(
  'cleanup-deleted-notifications',
  '0 2 * * *', -- Todos los días a las 2 AM
  $$
  SELECT cleanup_old_deleted_notifications();
  $$
);
```

#### Opción 2: Usar Edge Function

1. Despliega la Edge Function:

```bash
supabase functions deploy cleanup-deleted-notifications
```

2. Configura un cron job externo (ej: GitHub Actions, Vercel Cron) para llamar a la función:

```bash
curl -X POST https://[TU_PROYECTO].supabase.co/functions/v1/cleanup-deleted-notifications \
  -H "Authorization: Bearer [TU_ANON_KEY]"
```

#### Opción 3: Usar pg_cron (si está habilitado)

```sql
-- Ejecutar diariamente a las 2 AM
SELECT cron.schedule(
  'cleanup-deleted-notifications',
  '0 2 * * *',
  'SELECT cleanup_old_deleted_notifications();'
);
```

## Estructura de la Base de Datos

### Tabla: `deleted_notifications`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del registro |
| `original_id` | UUID | ID original de la notificación |
| `company_id` | UUID | ID de la empresa |
| `recipient_id` | UUID | ID del destinatario |
| `sender_id` | UUID | ID del remitente |
| `type` | VARCHAR(50) | Tipo de notificación |
| `title` | VARCHAR(255) | Título |
| `message` | TEXT | Mensaje |
| `data` | JSONB | Datos adicionales |
| `read_at` | TIMESTAMP | Fecha de lectura |
| `deleted_by` | UUID | Usuario que borró |
| `deleted_at` | TIMESTAMP | Fecha de borrado |
| `original_created_at` | TIMESTAMP | Fecha original de creación |
| `original_updated_at` | TIMESTAMP | Fecha original de actualización |

## Funciones

### `save_deleted_notification()`

Trigger que se ejecuta automáticamente antes de borrar una notificación. Guarda todos los datos en `deleted_notifications`.

### `cleanup_old_deleted_notifications()`

Función que elimina registros con más de 15 días. Retorna el número de registros eliminados.

## Políticas RLS

- Los usuarios pueden ver sus propias notificaciones borradas
- Los usuarios pueden ver notificaciones borradas que ellos eliminaron
- Los admins/owners pueden ver todas las notificaciones borradas de su empresa

## API

### NotificationService

```javascript
// Obtener historial de notificaciones borradas
const deleted = await NotificationService.getDeletedNotifications(userId, companyId, limit);

// Limpiar notificaciones antiguas (solo admins)
const deletedCount = await NotificationService.cleanupOldDeletedNotifications();
```

## Notas

- Las notificaciones se guardan automáticamente al borrarlas (no requiere cambios en el código)
- El historial se mantiene por exactamente 15 días
- La limpieza automática debe configurarse manualmente
- Los usuarios solo ven sus propias notificaciones borradas (excepto admins)

## Troubleshooting

### El trigger no funciona

Verifica que el trigger esté activo:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'before_delete_notification';
```

### No se ven notificaciones en el historial

Verifica las políticas RLS:

```sql
SELECT * FROM pg_policies WHERE tablename = 'deleted_notifications';
```

### La limpieza no funciona

Verifica que la función exista y tenga permisos:

```sql
SELECT * FROM pg_proc WHERE proname = 'cleanup_old_deleted_notifications';
```

