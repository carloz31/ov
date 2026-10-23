import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import {
  copia,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

const { LockKeyhole, Target } = createRequire(import.meta.url)('lucide-react')

// Ajuste del inicio: el «Siguiente paso» es la siguiente requerida de la ruta y la lista de
// disponibles se reduce a una línea con el conteo.
async function iniciar(etapa, cambiar = () => {}) {
  const app = fixtureServidor()
  const escenario = escenarioRuta(etapa)
  escenario.bloques = copia(escenario.bloques)
  const actividad = (codigo) =>
    escenario.bloques.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
  cambiar(actividad, escenario.bloques)
  app.fetch((r) => {
    if (r.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenario)
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  assert.equal((await app.load('src/store/servidor/operaciones.ts').ingresar()).tipo, 'ok')
  const { siguientePaso, actividadesMas } = app.load('src/features/adventure/lib/siguientePaso.ts')
  const bloques = app.load('src/store/servidor/sesion.ts').obtenerEstadoServidor().actividades.datos
  const puntos = [
    ...app.load('src/features/adventure/lib/caminoPoints.ts').getCaminoPoints({}, {}),
    ...app.load('src/features/adventure/lib/ciudadPoints.ts').getCiudadPoints({}, {}),
  ]
  const calcular = (zona = 'camino') => {
    const paso = siguientePaso(bloques, puntos, zona)
    return { paso, mas: actividadesMas(puntos, paso) }
  }
  return { app, escenario, actividad, puntos, calcular }
}
const todas = (bloques) => bloques.flatMap((b) => b.actividades)
// Visibles en DISPONIBLE o EN_CURSO, contadas desde la respuesta del servidor.
const disponiblesServidor = (bloques) =>
  todas(bloques).filter((a) => a.visible && (a.estado === 'DISPONIBLE' || a.estado === 'EN_CURSO')).length

function texto(nodo) {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(texto).join('')
  return texto(nodo.props?.children)
}
function pintar(app, props) {
  const { SiguientePasoServidor } = app.load('src/features/adventure/components/SiguientePasoServidor.tsx')
  return SiguientePasoServidor({ saludo: false, onAbrir() {}, ...props })
}

test('disponible: T2 bloqueado y una requerida disponible en la Ciudad; el botón lleva a su mapa', async () => {
  const { app, escenario, calcular } = await iniciar('ciudad')
  const { paso, mas } = calcular('camino')
  assert.equal(paso.estado, 'disponible')
  assert.equal(paso.punto.specActivityId, 't-mision-intereses')
  assert.equal(paso.href, '/student/exploration?punto=t-mision-intereses')
  // Desde la Ciudad se abre en la misma zona.
  assert.equal(calcular('ciudad').paso.href, undefined)
  // N: visibles disponibles o empezadas, sin la del botón.
  assert.equal(mas, disponiblesServidor(escenario.bloques) - 1)
  const arbol = pintar(app, { paso, mas })
  assert.match(texto(arbol), /Siguiente paso/)
  assert.match(texto(arbol), new RegExp(paso.punto.title))
  assert.match(texto(arbol), new RegExp(paso.punto.subtitle))
  assert.match(texto(arbol), new RegExp(`${mas} actividades más disponibles · Ver todas ›`))
  const linea = elementos(arbol, (e) => e.props.className === 'sx-panel-link sx-next-more')[0]
  assert.equal(linea.props.to, '/student/activities')
})

test('empezada: una requerida en curso gana a una disponible anterior y dice «Continúa»', async () => {
  const { app, calcular } = await iniciar('inicial', (actividad) => {
    actividad('t-partida').estado = 'EN_CURSO'
  })
  const { paso, mas } = calcular()
  assert.equal(paso.estado, 'empezada')
  assert.equal(paso.punto.specActivityId, 't-partida')
  assert.equal(paso.href, undefined)
  // t-inicio queda disponible: una más, en singular.
  assert.equal(mas, 1)
  const arbol = pintar(app, { paso, mas })
  assert.match(texto(arbol), /Continúa/)
  assert.doesNotMatch(texto(arbol), /Siguiente paso/)
  assert.match(texto(arbol), /1 actividad más disponible · Ver todas ›/)
})

test('bloqueada: sin requeridas disponibles, la primera bloqueada con el mensaje del servidor', async () => {
  const { app, escenario, calcular } = await iniciar('t2', (actividad) => {
    for (const codigo of ['t-llegada', 't-comparar', 't-contraste']) actividad(codigo).estado = 'COMPLETADA'
  })
  const { paso, mas } = calcular()
  const proyecto = todas(escenario.bloques).find((a) => a.codigo === 't-proyecto')
  const bloque = escenario.bloques.find((b) => b.codigo === 'T2')
  assert.equal(paso.estado, 'bloqueada')
  assert.equal(paso.punto.specActivityId, 't-proyecto')
  assert.equal(paso.mensaje, (proyecto.bloqueo ?? bloque.bloqueo)[0].mensaje)
  assert.equal(mas, disponiblesServidor(escenario.bloques))
  const arbol = pintar(app, { paso, mas })
  assert.match(texto(arbol), new RegExp(paso.mensaje.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  // La misma tarjeta, con candado en lugar de la diana.
  assert.equal(elementos(arbol, (e) => e.type === LockKeyhole).length, 1)
  assert.equal(elementos(arbol, (e) => e.type === Target).length, 0)
  assert.equal(elementos(arbol, (e) => e.props['data-estado'] === 'bloqueada').length, 1)
})

test('completado: todas las requeridas hechas y quedan opcionales; recorrido: no queda ninguna', async () => {
  const completas = (actividad, bloques) => {
    for (const a of todas(bloques)) if (a.requerida) a.estado = 'COMPLETADA'
  }
  const { app, escenario, calcular } = await iniciar('t2', completas)
  const { paso, mas } = calcular()
  assert.deepEqual(copia(paso), { estado: 'completado' })
  assert.equal(mas, disponiblesServidor(escenario.bloques))
  assert.ok(mas > 0)
  const arbol = pintar(app, { paso, mas })
  assert.match(texto(arbol), /Completaste el camino/)
  assert.match(texto(arbol), /Aún quedan actividades por descubrir\. Sigue explorando\./)
  assert.equal(elementos(arbol, (e) => e.props.to === '/student/activities').length, 1)

  const final = await iniciar('t2', (actividad, bloques) => {
    for (const a of todas(bloques))
      if (a.requerida || a.estado !== 'COMPLETADA') a.estado = a.requerida ? 'COMPLETADA' : 'BLOQUEADA'
  })
  const recorrido = final.calcular()
  assert.deepEqual(copia(recorrido.paso), { estado: 'recorrido' })
  assert.equal(recorrido.mas, 0)
  const arbolFinal = pintar(final.app, recorrido)
  assert.match(texto(arbolFinal), /Recorriste todo el camino/)
  assert.equal(elementos(arbolFinal, (e) => e.props.to === '/student/profile/helena').length, 1)
  // Con N = 0 la línea no aparece.
  assert.equal(elementos(arbolFinal, (e) => e.props.className === 'sx-panel-link sx-next-more').length, 0)
})

test('una requerida oculta se omite con un aviso en desarrollo', async (t) => {
  const avisos = t.mock.method(console, 'warn', () => {})
  const { calcular } = await iniciar('inicial', (actividad) => {
    actividad('t-inicio').visible = false
  })
  const { paso } = calcular()
  assert.equal(paso.punto.specActivityId, 't-partida')
  assert.ok(avisos.mock.calls.some((c) => /t-inicio/.test(c.arguments[0])))
})

test('en api el panel muestra el siguiente paso y ya no la lista de disponibles', async () => {
  const { app, calcular } = await iniciar('ciudad')
  const { paso, mas } = calcular()
  const { AdventurePanel } = app.load('src/features/adventure/components/AdventurePanel.tsx')
  const panel = app.mount(AdventurePanel, {
    adventure: app.load('src/store/adventureStore.ts').useAdventure(),
    points: [],
    progress: { label: 'Nivel de recorrido', value: 0 },
    siguiente: paso,
    masDisponibles: mas,
    onSelect() {},
    onCheckIn() {},
  })
  const tree = panel.render()
  const seccion = elementos(tree, (e) => e.type?.name === 'SiguientePasoServidor')
  assert.equal(seccion.length, 1)
  assert.equal(seccion[0].props.mas, mas)
  assert.doesNotMatch(texto(tree), /Actividades disponibles/)
  assert.doesNotMatch(texto(tree), /Ver más/)
  panel.unmount()
})
