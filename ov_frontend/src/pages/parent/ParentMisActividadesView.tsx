import { FichaModal } from '@/features/backpack/components/FichaModal'
import { fichaServidor } from '@/features/backpack/lib/travelerResources'
import { CabeceraMisActividades } from '@/features/parent/components/servidor/CabeceraMisActividades'
import { FilaActividad } from '@/features/parent/components/servidor/FilaActividad'
import { useMisActividadesServidor } from '@/features/parent/hooks/useMisActividadesServidor'
import '@/features/parent/styles/mis-actividades.css'

// F08 (A7, A8): Mis actividades del apoderado en api. La ruta tiene un solo bloque: lista directa, sin tramos.
// Las fichas se abren en el modal compartido, sin favorito, con su contenido pedido al pulsar el chip.
export function ParentMisActividadesView() {
  const v = useMisActividadesServidor()
  return (
    <div className="pa-vista">
      <CabeceraMisActividades avance={v.avance} diploma={v.diploma} onVerDiploma={v.verDiploma} />
      <section aria-label="Ruta de actividades" className="pa-lista">
        {v.filas.map((fila) => (
          <FilaActividad
            key={fila.actividad.id}
            abriendo={v.abriendo === fila.actividad.id}
            fila={fila}
            onAbrirFicha={v.abrirFicha}
            onComenzar={() => v.comenzar(fila)}
          />
        ))}
      </section>
      <FichaModal
        abierto={!!v.fichaAbierta}
        contenido={v.contenidoFicha}
        puedeMarcarFavorito={false}
        resource={v.fichaAbierta ? fichaServidor(v.fichaAbierta) : undefined}
        onClose={v.cerrarFicha}
      />
    </div>
  )
}
