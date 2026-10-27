import { useState } from 'react'
import { Parchment } from '@/components/student/Parchment'
import { nombresTipoCarrera, rangoSoles, soles, textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import type {
  IngresoCarreraPublico,
  InstitucionEnCarrera,
  TipoInstitucionServidor,
  TramoIngreso,
} from '@/types/servidor'

const VISIBLES = 4

function TarjetaTramo({
  titulo,
  etiqueta,
  tramo,
  escala,
  destacada = false,
}: {
  titulo: string
  etiqueta: string
  tramo: TramoIngreso
  escala: number
  destacada?: boolean
}) {
  const pos = (monto: number) => `${(monto / escala) * 100}%`
  return (
    <div className="sx-c-tramo" data-destacada={destacada}>
      <div className="sx-c-tramo-cabeza">
        <strong>{titulo}</strong>
        <span>{etiqueta}</span>
      </div>
      <small>Promedio mensual</small>
      <p className="sx-c-tramo-promedio">{soles(tramo.promedio)}</p>
      <div className="sx-c-barra-rango" role="img" aria-label={`Promedio ${soles(tramo.promedio)}, ${rangoSoles(tramo)}`}>
        <span style={{ left: pos(tramo.minimo), width: `calc(${pos(tramo.maximo)} - ${pos(tramo.minimo)})` }} />
        <i style={{ left: pos(tramo.promedio) }} />
      </div>
      <div className="sx-c-tramo-extremos">
        <small>Mín. {soles(tramo.minimo)}</small>
        <small>Máx. {soles(tramo.maximo)}</small>
      </div>
    </div>
  )
}

function SelectorLugar({
  valor,
  lugares,
  onElegir,
}: {
  valor: string
  lugares: { codigo: string; nombre: string }[]
  onElegir: (codigo: string) => void
}) {
  return (
    <label className="sx-c-selector sx-c-selector-claro">
      <span>Lugar</span>
      <select value={valor} onChange={(e) => onElegir(e.target.value)}>
        <option value="">Todo el país</option>
        {lugares.map((l) => (
          <option key={l.codigo} value={l.codigo}>
            {l.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

// F06 · ajuste catalogo-datos-reales (F6b): cuánto ganan los egresados de la familia y el tipo de la carrera
// (no de la carrera exacta). «Por lugar»: jóvenes y adultos en todo el país o en un departamento con dato.
// «Por institución»: las instituciones que la dictan y tienen dato, de mayor a menor promedio.
export function IngresoCarrera({
  ingreso,
  instituciones,
  familia,
  tipo,
}: {
  ingreso: IngresoCarreraPublico
  instituciones: InstitucionEnCarrera[]
  familia: string
  tipo: TipoInstitucionServidor
}) {
  const [pestana, setPestana] = useState<'lugar' | 'institucion'>('lugar')
  const [lugar, setLugar] = useState('')
  const [todas, setTodas] = useState(false)
  // Revisión del usuario: «Por institución» también se acota por departamento (el de la institución).
  const [lugarInstitucion, setLugarInstitucion] = useState('')
  const fila = ingreso.departamentos.find((d) => d.ubicacion?.codigo === lugar) ?? ingreso.nacional
  const conIngreso = instituciones
    .filter((i): i is InstitucionEnCarrera & { ingreso: TramoIngreso } => i.ingreso !== null)
    .sort((a, b) => b.ingreso.promedio - a.ingreso.promedio)
  const escala = Math.max(fila.jovenes.maximo, fila.adultos.maximo, 1)
  const lugaresInstituciones = [...new Map(conIngreso.map((i) => [i.ubicacion.codigo, i.ubicacion])).values()].sort(
    (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  )
  const enLugar = lugarInstitucion ? conIngreso.filter((i) => i.ubicacion.codigo === lugarInstitucion) : conIngreso
  return (
    <Parchment title="Cuánto ganan sus egresados">
      <p className="sx-c-subtitulo">
        Promedios de la familia <strong>{familia}</strong> ({nombresTipoCarrera[tipo].toLowerCase()}), no solo de
        esta carrera.
      </p>
      <div className="sx-c-pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'lugar'} onClick={() => setPestana('lugar')}>
          Por lugar
        </button>
        {conIngreso.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'institucion'}
            onClick={() => setPestana('institucion')}
          >
            Por institución · {conIngreso.length}
          </button>
        )}
        {pestana === 'lugar' && ingreso.departamentos.length > 0 && (
          <SelectorLugar
            valor={lugar}
            lugares={ingreso.departamentos.map((d) => d.ubicacion!)}
            onElegir={setLugar}
          />
        )}
        {pestana === 'institucion' && lugaresInstituciones.length > 1 && (
          <SelectorLugar
            valor={lugarInstitucion}
            lugares={lugaresInstituciones}
            onElegir={(codigo) => {
              setLugarInstitucion(codigo)
              setTodas(false)
            }}
          />
        )}
      </div>
      {pestana === 'lugar' ? (
        <div className="sx-c-tramos">
          <TarjetaTramo titulo="Jóvenes" etiqueta="Recién egresados" tramo={fila.jovenes} escala={escala} destacada />
          <TarjetaTramo titulo="Adultos" etiqueta="Con experiencia" tramo={fila.adultos} escala={escala} />
        </div>
      ) : (
        <div className="sx-c-filas">
          {(todas ? enLugar : enLugar.slice(0, VISIBLES)).map((i) => (
            <div className="sx-c-fila-dato" key={i.codigo}>
              <div>
                <strong>{i.nombre}</strong>
                <small>{[textoGestion(i.gestion), i.ubicacion.nombre].filter(Boolean).join(' · ')}</small>
              </div>
              <div className="sx-c-monto">
                <strong>{soles(i.ingreso.promedio)}</strong>
                <small>{rangoSoles(i.ingreso)}</small>
              </div>
            </div>
          ))}
          {!todas && enLugar.length > VISIBLES && (
            <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => setTodas(true)}>
              Ver las {enLugar.length - VISIBLES} restantes
            </button>
          )}
        </div>
      )}
    </Parchment>
  )
}
