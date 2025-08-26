import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    console.log('🕐 Iniciando cierre automático de fichajes activos...')
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(today.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000) // 23:59
    
    console.log('📅 Fecha actual:', now.toISOString())
    console.log('🕐 Fin del día:', endOfDay.toISOString())

    // Buscar todos los fichajes de entrada (clock_in) que no tienen salida correspondiente
    const { data: activeEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select(`
        id,
        user_id,
        company_id,
        entry_time,
        users!inner(email),
        companies!inner(name)
      `)
      .eq('entry_type', 'clock_in')
      .gte('entry_time', today.toISOString())
      .lt('entry_time', endOfDay.toISOString())

    if (fetchError) {
      console.error('❌ Error obteniendo fichajes activos:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Error obteniendo fichajes activos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Encontrados ${activeEntries?.length || 0} fichajes activos`)

    if (!activeEntries || activeEntries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay fichajes activos para cerrar' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let closedCount = 0
    const errors = []

    // Procesar cada fichaje activo
    for (const entry of activeEntries) {
      try {
        // Verificar si ya existe un fichaje de salida para este usuario hoy
        const { data: existingClockOut, error: checkError } = await supabase
          .from('time_entries')
          .select('id')
          .eq('user_id', entry.user_id)
          .eq('entry_type', 'clock_out')
          .gte('entry_time', today.toISOString())
          .lt('entry_time', endOfDay.toISOString())
          .maybeSingle()

        if (checkError) {
          console.error('❌ Error verificando fichaje de salida:', checkError)
          errors.push(`Error verificando salida para usuario ${entry.user_id}: ${checkError.message}`)
          continue
        }

        // Si no existe fichaje de salida, crear uno automático
        if (!existingClockOut) {
          const { error: insertError } = await supabase
            .from('time_entries')
            .insert({
              user_id: entry.user_id,
              company_id: entry.company_id,
              entry_type: 'clock_out',
              entry_time: endOfDay.toISOString(),
              notes: 'Cierre automático del sistema a las 23:59'
            })

          if (insertError) {
            console.error('❌ Error cerrando fichaje:', insertError)
            errors.push(`Error cerrando fichaje para usuario ${entry.user_id}: ${insertError.message}`)
          } else {
            console.log(`✅ Fichaje cerrado automáticamente para ${entry.users?.email || entry.user_id}`)
            closedCount++
          }
        } else {
          console.log(`ℹ️ Usuario ${entry.users?.email || entry.user_id} ya tiene fichaje de salida`)
        }

        // Verificar si hay pausas sin cerrar
        const { data: openBreaks, error: breaksError } = await supabase
          .from('time_entries')
          .select('id, entry_time')
          .eq('user_id', entry.user_id)
          .eq('entry_type', 'break_start')
          .gte('entry_time', entry.entry_time)
          .lt('entry_time', endOfDay.toISOString())

        if (!breaksError && openBreaks && openBreaks.length > 0) {
          // Cerrar pausas abiertas
          for (const breakEntry of openBreaks) {
            const { data: breakEnd, error: breakCheckError } = await supabase
              .from('time_entries')
              .select('id')
              .eq('user_id', entry.user_id)
              .eq('entry_type', 'break_end')
              .gt('entry_time', breakEntry.entry_time)
              .maybeSingle()

            if (!breakCheckError && !breakEnd) {
              // No hay fin de pausa, crear uno automático
              const { error: breakEndError } = await supabase
                .from('time_entries')
                .insert({
                  user_id: entry.user_id,
                  company_id: entry.company_id,
                  entry_type: 'break_end',
                  entry_time: endOfDay.toISOString(),
                  notes: 'Fin de pausa automático del sistema a las 23:59'
                })

              if (!breakEndError) {
                console.log(`✅ Pausa cerrada automáticamente para ${entry.users?.email || entry.user_id}`)
              }
            }
          }
        }

      } catch (error) {
        console.error('❌ Error procesando fichaje:', error)
        errors.push(`Error procesando fichaje ${entry.id}: ${error.message}`)
      }
    }

    // Crear notificación para los managers sobre el cierre automático
    if (closedCount > 0) {
      const companies = [...new Set(activeEntries.map(entry => entry.company_id))]
      
      for (const companyId of companies) {
        const companyEntries = activeEntries.filter(entry => entry.company_id === companyId)
        
        // Obtener managers de la empresa
        const { data: managers } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', companyId)
          .in('role', ['manager', 'admin', 'owner'])
          .eq('is_active', true)

        if (managers) {
          for (const manager of managers) {
            await supabase
              .from('notifications')
              .insert({
                company_id: companyId,
                recipient_id: manager.user_id,
                type: 'time_clock',
                title: 'Cierre automático de fichajes',
                message: `Se han cerrado automáticamente ${companyEntries.length} fichajes activos a las 23:59. Los empleados que no ficharon salida han sido marcados como fuera de servicio.`,
                created_at: new Date().toISOString()
              })
          }
        }
      }
    }

    const result = {
      message: `Proceso completado`,
      closedEntries: closedCount,
      totalActive: activeEntries.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    }

    console.log('✅ Cierre automático completado:', result)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en cierre automático:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 