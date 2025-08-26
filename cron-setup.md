# Configuración de Cierre Automático de Fichajes

## 🕐 Cierre Automático a las 23:59

### Función Creada
- **Función**: `auto-close-time-entries`
- **Propósito**: Cerrar automáticamente todos los fichajes activos a las 23:59
- **Estado**: ✅ Desplegada en Supabase

### Funcionalidades

#### 🔄 Proceso Automático
1. **Busca fichajes activos**: Todos los `clock_in` del día sin `clock_out` correspondiente
2. **Cierra fichajes**: Crea automáticamente `clock_out` a las 23:59
3. **Cierra pausas**: Finaliza pausas abiertas (`break_start` sin `break_end`)
4. **Notifica managers**: Envía notificaciones sobre el cierre automático

#### 📊 Características
- **Horario**: 23:59 todos los días
- **Notas automáticas**: "Cierre automático del sistema a las 23:59"
- **Logs detallados**: Registro completo de acciones
- **Manejo de errores**: Procesamiento individual por usuario

### Configuración del Cron Job

#### Opción 1: Vercel Cron Jobs (Recomendado)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/auto-close-time-entries",
      "schedule": "59 23 * * *"
    }
  ]
}
```

#### Opción 2: Supabase Edge Functions con Cron
```typescript
// Crear función que se ejecute automáticamente
// Configurar en Supabase Dashboard > Edge Functions > Cron
```

#### Opción 3: Servicio Externo (Cron-job.org)
1. URL: `https://kywzvqzcdwyrajxmtqus.supabase.co/functions/v1/auto-close-time-entries`
2. Schedule: `59 23 * * *` (23:59 todos los días)
3. Headers: `Authorization: Bearer [SUPABASE_ANON_KEY]`

### Configuración Manual

#### Para probar la función:
```bash
curl -X POST https://kywzvqzcdwyrajxmtqus.supabase.co/functions/v1/auto-close-time-entries \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

#### Para configurar cron local (desarrollo):
```bash
# Agregar al crontab
59 23 * * * curl -X POST https://kywzvqzcdwyrajxmtqus.supabase.co/functions/v1/auto-close-time-entries
```

### Notificaciones

#### Para Managers
- **Título**: "Cierre automático de fichajes"
- **Mensaje**: "Se han cerrado automáticamente X fichajes activos a las 23:59"
- **Tipo**: `time_clock`

#### Logs del Sistema
- Fichajes cerrados automáticamente
- Pausas finalizadas
- Errores de procesamiento
- Estadísticas del proceso

### Seguridad

#### Validaciones
- ✅ Solo procesa fichajes del día actual
- ✅ Verifica que no exista `clock_out` previo
- ✅ Manejo de errores individual por usuario
- ✅ Logs detallados para auditoría

#### Permisos
- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` para acceso completo
- ✅ Solo managers reciben notificaciones
- ✅ No afecta datos históricos

### Monitoreo

#### Métricas a Revisar
- Número de fichajes cerrados diariamente
- Errores de procesamiento
- Tiempo de ejecución
- Notificaciones enviadas

#### Alertas Recomendadas
- Función no ejecutada en 24h
- Más de 10 errores en una ejecución
- Tiempo de ejecución > 30 segundos

---

**Estado**: ✅ Implementado y desplegado
**Próximo paso**: Configurar cron job para ejecución automática 