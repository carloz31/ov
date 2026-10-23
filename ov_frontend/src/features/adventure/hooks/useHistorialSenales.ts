import { useAdventure } from '@/store/adventureStore'
import { useStudentUi } from '@/store/studentUiStore'
import { appPaths } from '@/routes/paths'
import { getTodayCheckIn, useCheckInDay } from '@/features/adventure/lib/checkIn'
import { useSenalServidor } from '@/features/adventure/hooks/useSenalServidor'

// Historial de señales: en api, la serie 1–5 del servidor y sus días registrados (F05); en local, la propia.
export function useHistorialSenales() {
  const state = useAdventure()
  const ui = useStudentUi()
  const senal = useSenalServidor()
  useCheckInDay()
  const serie = senal.activo ? senal.serie : state.readinessCheckIns
  const checkIns = [...serie].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-12)
  const escala = senal.activo ? senal.escala : 10
  const dias = senal.diasRegistrados
  return {
    today: senal.activo ? senal.hoy : getTodayCheckIn(state),
    checkIns,
    escala,
    y: (value: number) => 240 - ((value - 1) / (escala - 1)) * 210,
    marcas: escala === 10 ? [1, 3, 5, 7, 10] : Array.from({ length: escala }, (_, i) => i + 1),
    total: serie.length,
    // Se vuelve al último mapa visitado, como «Volver al mapa» de la barra superior.
    mapa: ui.lastMap === 'central' ? appPaths.student.exploration : appPaths.student.missions,
    // F05, solo api: una señal por día (sin «Cambiar») y el conteo de días del servidor.
    servidor: senal.activo
      ? {
          puedeRegistrar: !senal.registradoHoy,
          conteo: `${dias} ${dias === 1 ? 'día registrado' : 'días registrados'}${serie.length > 12 ? ' · Últimas 12' : ''}`,
        }
      : undefined,
  }
}
