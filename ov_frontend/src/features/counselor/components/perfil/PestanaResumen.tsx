import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import type { PerfilEstudiante } from '@/types/servidor'
import { AvisosParaConversar } from './AvisosParaConversar'
import { RespuestasYNotas } from './RespuestasYNotas'
import { TarjetasResumen } from './TarjetasResumen'

// Ajuste panel-estudiantes §6 (boceto 06): Avisos, Para conversar, las tres tarjetas, sus respuestas y mis notas.
// Llega con la cabecera, en la misma lectura.
export function PestanaResumen({
  datos,
  modelo,
}: {
  datos: PerfilEstudiante
  modelo: ModeloPerfilEstudiante
}) {
  const nombre = datos.cabecera.nombre.split(' ')[0]
  return (
    <div className="space-y-4">
      <AvisosParaConversar
        avisos={datos.avisos}
        temas={datos.temas}
        temasVisibles={datos.temas_visibles}
        nombre={nombre}
        onIr={modelo.irADestino}
      />
      <TarjetasResumen datos={datos} onIr={modelo.irADestino} />
      <RespuestasYNotas respuestas={datos.respuestas} notas={datos.notas} modelo={modelo} />
    </div>
  )
}
