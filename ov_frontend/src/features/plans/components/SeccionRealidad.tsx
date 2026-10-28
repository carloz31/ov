import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import { FRECUENCIAS, soles, textoElegida } from '@/lib/servidor/adaptadoresPlanes'
import {
  cambiarCamino,
  cambiarInstitucion,
  textoAnios,
  totalesGastos,
  type BorradorRealidad,
} from '@/lib/servidor/adaptadoresPlanesEdicion'
import type { ElegidaEntrada, InstitucionEnCarrera, OpcionesTarjeta, PlanCarrera } from '@/types/servidor'
import { ChipsElegibles } from './ChipsElegibles'
import { TablaGastos } from './TablaGastos'
import { TarjetaTotal } from './TarjetaTotal'

const NINGUNA = 'todavia-no-se'
const OTRO = 'otro-camino'
const mismo = (a: ElegidaEntrada, codigo: string) => 'opcion' in a && a.opcion === codigo
const chipsDe = (elegidas: ElegidaEntrada[], lista: OpcionesTarjeta['financiamiento']) =>
  elegidas.map((e) => ({ clave: 'otro' in e ? `otro-${e.otro}` : e.opcion, texto: textoElegida(e, lista) }))
// Un «Otro» repetido (sin importar mayúsculas ni espacios) no se agrega: el servidor lo rechazaría.
const sinRepetir = <T extends ElegidaEntrada>(lista: T[], texto: string): T[] =>
  lista.some(
    (e) => 'otro' in e && e.otro.trim().toLocaleLowerCase('es') === texto.trim().toLocaleLowerCase('es'),
  )
    ? lista
    : [...lista, { otro: texto } as T]

// F07b (§7; lienzo «en lectura» y ajuste de «Cuánto costaría», que reemplaza el de edición): «Cómo lo haría
// realidad». En lectura, dónde y cómo, la tarjeta del costo con los totales del servidor junto a la tabla, y los
// chips de pago y complicaciones; en edición, institución y camino (dos `Select`) arriba, la tabla de gastos
// propuestos con los totales en vivo y las dos filas de chips.
export function SeccionRealidad({
  plan,
  opciones,
  instituciones,
  paginaWeb,
  borrador,
  onCambiar,
}: {
  plan: PlanCarrera
  opciones: OpcionesTarjeta
  instituciones: InstitucionEnCarrera[]
  paginaWeb: string | null
  borrador: BorradorRealidad | null
  onCambiar: (cambio: (b: BorradorRealidad) => BorradorRealidad) => void
}) {
  const ciclos = opciones.ciclos_por_anio
  if (!borrador) {
    const i = plan.institucion
    const anios = i?.duracion_ciclos ? i.duracion_ciclos / ciclos : null
    return (
      <dl className="sx-p-lectura sx-p-realidad">
        <div>
          <dt>Dónde estudiaría</dt>
          <dd className="sx-p-dato">
            {i ? (
              <>
                <strong>{i.nombre}</strong>
                <small>
                  {[textoGestion(i.gestion), i.ubicacion.nombre, anios && textoAnios(anios)]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </>
            ) : (
              'Todavía no sé'
            )}
          </dd>
        </div>
        <div>
          <dt>Cómo llegaría</dt>
          <dd className="sx-p-dato">
            {plan.camino ? textoElegida(plan.camino, opciones.caminos) : 'Todavía nada'}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Costo</dt>
          <dd>
            <TarjetaTotal
              primerAnio={plan.total_primer_anio}
              carrera={plan.total_carrera}
              anios={anios}
              ciclosPorAnio={ciclos}
              enVivo={false}
            />
          </dd>
        </div>
        <div>
          <dt>Cuánto costaría</dt>
          <dd>
            <table className="sx-p-gastos" data-lectura="true">
              <thead>
                <tr>
                  <th scope="col">Rubro</th>
                  <th scope="col">S/</th>
                  <th scope="col">Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {plan.gastos.map((g, k) => (
                  <tr key={k}>
                    <th scope="row">{textoElegida({ opcion: g.rubro, otro: g.otro }, opciones.rubros)}</th>
                    <td>{soles(g.monto).replace('S/ ', '')}</td>
                    <td>{FRECUENCIAS.find(([c]) => c === g.frecuencia)?.[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </div>
        <div>
          <dt>Cómo lo pagaría</dt>
          <dd className="sx-p-chips">
            {plan.financiamiento.length
              ? plan.financiamiento.map((f, k) => (
                  <span className="sx-p-chip" data-elegido="true" key={k}>
                    {textoElegida(f, opciones.financiamiento)}
                  </span>
                ))
              : 'Todavía nada'}
          </dd>
        </div>
        <div>
          <dt>Lo que podría complicarlo</dt>
          <dd className="sx-p-chips">
            {plan.complicaciones.length
              ? plan.complicaciones.map((c) => (
                  <span className="sx-p-chip" data-elegido="true" key={c.numero}>
                    {textoElegida(c, opciones.dificultades)}
                  </span>
                ))
              : 'Todavía nada'}
          </dd>
        </div>
      </dl>
    )
  }
  const elegida =
    instituciones.find((x) => x.codigo === borrador.institucion) ??
    (plan.institucion?.codigo === borrador.institucion ? plan.institucion : null)
  const gestion = elegida?.gestion ?? null
  const duracion = elegida?.duracion_ciclos ?? null
  const totales = totalesGastos(borrador.gastos, ciclos, duracion)
  const otroCamino = borrador.camino && 'otro' in borrador.camino ? borrador.camino.otro : ''
  const opcionesInstitucion = elegida && !instituciones.length ? [elegida] : instituciones
  return (
    <>
      <div className="sx-p-dos">
        <label className="sx-p-campo">
          <strong>Dónde estudiaría</strong>
          <span className="sx-p-ayuda">Instituciones que ofrecen esta carrera; tus favoritas primero.</span>
          <Select
            value={borrador.institucion ?? NINGUNA}
            onValueChange={(codigo) => {
              const nueva = instituciones.find((x) => x.codigo === codigo) ?? null
              onCambiar((b) => cambiarInstitucion(b, nueva?.codigo ?? null, nueva?.gestion ?? null, opciones))
            }}
          >
            <SelectTrigger aria-label="Dónde estudiaría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcionesInstitucion.map((x) => (
                <SelectItem key={x.codigo} value={x.codigo}>
                  {[x.nombre, textoGestion(x.gestion) ?? 'sin dato', x.ubicacion.nombre].join(' · ')}
                </SelectItem>
              ))}
              <SelectItem value={NINGUNA}>Todavía no sé</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="sx-p-campo">
          <strong>Cómo llegaría</strong>
          <span className="sx-p-ayuda">Una sola opción; cambia los gastos propuestos.</span>
          <Select
            value={!borrador.camino ? undefined : 'otro' in borrador.camino ? OTRO : borrador.camino.opcion}
            onValueChange={(valor) =>
              onCambiar((b) =>
                cambiarCamino(
                  b,
                  valor === OTRO ? { otro: otroCamino } : { opcion: valor },
                  opciones,
                  gestion,
                ),
              )
            }
          >
            <SelectTrigger aria-label="Cómo llegaría">
              <SelectValue placeholder="Elige cómo llegarías" />
            </SelectTrigger>
            <SelectContent>
              {opciones.caminos.map((c) => (
                <SelectItem key={c.codigo} value={c.codigo}>
                  {c.texto}
                </SelectItem>
              ))}
              <SelectItem value={OTRO}>Otro…</SelectItem>
            </SelectContent>
          </Select>
          {borrador.camino && 'otro' in borrador.camino && (
            <Input
              aria-label="Otro camino"
              placeholder="¿Cómo llegarías?"
              autoFocus
              value={otroCamino}
              onChange={(e) =>
                onCambiar((b) => cambiarCamino(b, { otro: e.target.value }, opciones, gestion))
              }
            />
          )}
        </label>
      </div>
      <TablaGastos
        borrador={borrador}
        opciones={opciones}
        gestion={gestion}
        paginaWeb={paginaWeb}
        onCambiar={onCambiar}
      />
      <TarjetaTotal
        primerAnio={totales.primerAnio}
        carrera={totales.carrera}
        anios={totales.anios}
        ciclosPorAnio={ciclos}
        faltan={totales.faltan}
        enVivo
      />
      <fieldset className="sx-p-campo">
        <legend>¿Cómo lo pagarías?</legend>
        <ChipsElegibles
          titulo="Elegidas"
          vacio="Todavía no marcas ninguna."
          elegidos={chipsDe(borrador.financiamiento, opciones.financiamiento)}
          disponibles={opciones.financiamiento.filter(
            (f) => !borrador.financiamiento.some((e) => mismo(e, f.codigo)),
          )}
          textoOtro="Otra forma"
          onMarcar={(codigo) =>
            onCambiar((b) => ({ ...b, financiamiento: [...b.financiamiento, { opcion: codigo }] }))
          }
          onQuitar={(k) =>
            onCambiar((b) => ({ ...b, financiamiento: b.financiamiento.filter((_, j) => j !== k) }))
          }
          onOtro={(texto) =>
            onCambiar((b) => ({ ...b, financiamiento: sinRepetir(b.financiamiento, texto) }))
          }
        />
      </fieldset>
      <fieldset className="sx-p-campo">
        <legend>Lo que podría complicarlo</legend>
        <span className="sx-p-ayuda">
          Lo que marques aquí se convierte en pasos sugeridos, como tus dudas.
        </span>
        <ChipsElegibles
          titulo="Elegidas"
          vacio="Todavía no marcas ninguna."
          elegidos={chipsDe(borrador.complicaciones, opciones.dificultades)}
          disponibles={opciones.dificultades.filter(
            (d) => !borrador.complicaciones.some((e) => mismo(e, d.codigo)),
          )}
          textoOtro="Otra"
          onMarcar={(codigo) =>
            onCambiar((b) => ({ ...b, complicaciones: [...b.complicaciones, { opcion: codigo }] }))
          }
          onQuitar={(k) =>
            onCambiar((b) => ({ ...b, complicaciones: b.complicaciones.filter((_, j) => j !== k) }))
          }
          onOtro={(texto) =>
            onCambiar((b) => ({ ...b, complicaciones: sinRepetir(b.complicaciones, texto) }))
          }
        />
      </fieldset>
    </>
  )
}
