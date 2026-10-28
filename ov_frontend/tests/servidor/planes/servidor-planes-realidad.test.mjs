import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cargarAlmacen,
  copia,
  elementos,
  esperar,
  fixtureServidor,
  jsonServidor,
} from '../../soporte/servidor-ayudas.mjs'

// F07b (§7, §9; lienzos de la sección 3): «Cómo lo haría realidad» en lectura y edición, totales en vivo, cuerpo
// de guardado y aviso de sugerencias; «1.er año» en el frente de la tarjeta. Con los fixtures ruta-*.
const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
const accion = { eventos_registrados: [], nuevos_desbloqueos: [] }
const completos = jsonServidor('ruta/ruta-planes')
const carreraDetalle = jsonServidor('ruta/ruta-catalogo-carrera-psychology')
const SECCIONES = [{ codigo: 'PLANES', nombre: 'Planes', estado: 'DISPONIBLE', bloqueo: [] }]
const PSICOLOGIA = 'mtpe-369'
const [listo] = completos.planes

function planAbierto(planes = completos) {
  const app = fixtureServidor({ ruta: `/student/profile/decisions/${PSICOLOGIA}` })
  app.fetch((r) => {
    if (r.url.endsWith('/planes')) return { body: planes }
    if (r.url.includes(`/catalogo/carreras/${PSICOLOGIA}`)) return { body: carreraDetalle }
    if (r.url.includes('/catalogo/instituciones/'))
      return {
        body: {
          ...jsonServidor('ruta/ruta-catalogo-institucion-t-uni'),
          pagina_web: 'https://www.unfv.edu.pe',
        },
      }
    if (r.url.includes('/instrumentos/TEST-RIASEC/resultado'))
      return { body: jsonServidor('ruta/ruta-resultado-riasec') }
    if (r.url.includes('/acciones/')) return { body: accion }
    return { body: [] }
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  almacen.publicar({
    secciones: { ...almacen.obtenerEstadoServidor().secciones, datos: SECCIONES, estado: 'listo' },
  })
  const { PlanAbierto } = app.load('src/features/plans/components/PlanAbierto.tsx')
  return { app, vista: app.mount(PlanAbierto, { carrera: PSICOLOGIA, seccion: 'REALIDAD' }) }
}
async function dibujar(vista) {
  for (let i = 0; i < 3; i++) {
    vista.render()
    await esperar()
  }
  return vista.render()
}
const hijo = (arbol, nombre) => elementos(arbol, (e) => e.type?.name === nombre)[0]
const boton = (arbol, etiqueta) =>
  elementos(arbol, (e) => e.type === 'button' && texto(e).includes(etiqueta))[0]

test('lectura: dónde, cómo, tarjeta del costo con los totales del servidor, tabla y chips', async () => {
  const { app, vista } = planAbierto()
  const arbol = await dibujar(vista)
  assert.doesNotMatch(texto(arbol), /siguiente lote/)
  const seccion = hijo(arbol, 'SeccionRealidad')
  assert.equal(seccion.props.borrador, null)
  const { SeccionRealidad } = app.load('src/features/plans/components/SeccionRealidad.tsx')
  const lectura = SeccionRealidad(seccion.props)
  assert.match(
    texto(lectura),
    /Dónde estudiaría.*Universidad Nacional Federico Villarreal.*Pública · Lima · 5 años/,
  )
  assert.match(texto(lectura), /Cómo llegaría.*Prepararme primero/)
  assert.match(texto(lectura), /Cuánto costaría.*Preparación1 300Una vez/)
  assert.match(texto(lectura), /Cómo lo pagaría.*Trabajo de verano/)
  const total = hijo(lectura, 'TarjetaTotal')
  assert.deepEqual(copia(total.props), {
    primerAnio: listo.total_primer_anio,
    carrera: listo.total_carrera,
    anios: 5,
    ciclosPorAnio: 2,
    enVivo: false,
  })
  const { TarjetaTotal } = app.load('src/features/plans/components/TarjetaTotal.tsx')
  assert.match(
    texto(TarjetaTotal(total.props)),
    /Primer año≈ S\/ 2 500≈ S\/ 208 al mes · toda la carrera ≈ S\/ 7 300Muéstrales este número en casa\./,
  )
})

test('edición: camino en Select, totales de lo escrito con «faltan N montos», cuerpo sin vacíos y aviso §9', async () => {
  const { app, vista } = planAbierto()
  let arbol = await dibujar(vista)
  boton(arbol, 'Editar').props.onClick()
  arbol = await dibujar(vista)
  let seccion = hijo(arbol, 'SeccionRealidad')
  assert.equal(seccion.props.instituciones.length, carreraDetalle.instituciones.length)
  assert.equal(seccion.props.paginaWeb, 'https://www.unfv.edu.pe')
  assert.match(texto(arbol), /Guardar puede tardar unos segundos\./)
  const { SeccionRealidad } = app.load('src/features/plans/components/SeccionRealidad.tsx')
  let edicion = SeccionRealidad(seccion.props)
  assert.deepEqual(copia(hijo(edicion, 'TarjetaTotal').props), {
    primerAnio: 2500,
    carrera: 7300,
    anios: 5,
    ciclosPorAnio: 2,
    faltan: 3,
    enVivo: true,
  })
  assert.match(
    texto(edicion),
    /Instituciones que ofrecen esta carrera; tus favoritas primero\..*Una sola opción; cambia los gastos propuestos\./,
  )
  assert.match(texto(edicion), /Lo que marques aquí se convierte en pasos sugeridos, como tus dudas\./)
  const [pago, complicaciones] = elementos(edicion, (e) => e.type?.name === 'ChipsElegibles')
  assert.equal(pago.props.titulo, 'Elegidas')
  assert.equal(pago.props.numerado, undefined)
  assert.deepEqual([pago.props.textoOtro, complicaciones.props.textoOtro], ['Otra forma', 'Otra'])
  // «Cómo llegaría» es un Select con «Otro…»; postular directamente no prepara: se va Preparación y el total baja.
  const camino = elementos(edicion, (e) => e.props?.onValueChange && e.props.value === 'PREPARARME')[0]
  assert.ok(elementos(camino, (e) => texto(e) === 'Otro…').length)
  camino.props.onValueChange('POSTULAR_DIRECTO')
  seccion = hijo(vista.render(), 'SeccionRealidad')
  edicion = SeccionRealidad(seccion.props)
  assert.ok(!seccion.props.borrador.gastos.some((g) => g.rubro === 'PREPARACION'))
  assert.equal(hijo(edicion, 'TarjetaTotal').props.primerAnio, 1200)
  complicaciones.props.onMarcar('DISTANCIA')
  boton(vista.render(), 'Guardar sección').props.onClick()
  // Ajuste: mientras se guarda, el cuerpo de la sección y el menú no admiten acciones.
  const enVuelo = vista.render()
  assert.equal(elementos(enVuelo, (e) => e.type === 'fieldset')[0].props.disabled, true)
  assert.equal(hijo(enVuelo, 'MenuSeccionesPlan').props.bloqueado, true)
  assert.match(texto(enVuelo), /Guardando…/)
  await esperar()
  await esperar()
  const guardar = app.requests.find((r) => r.url.endsWith('/acciones/planes/guardar-seccion'))
  assert.deepEqual(copia(guardar.body), {
    cuenta: 'est-ana',
    carrera: PSICOLOGIA,
    seccion: 'REALIDAD',
    datos: {
      institucion: 'inst-63',
      camino: { opcion: 'POSTULAR_DIRECTO' },
      // Las filas con el monto vacío (Admisión, Materiales, Transporte) no se envían.
      gastos: [
        { rubro: 'MATRICULA', monto: 600, frecuencia: 'POR_CICLO' },
        { rubro: 'PENSION', monto: 0, frecuencia: 'MENSUAL' },
      ],
      financiamiento: [{ opcion: 'FAMILIA' }, { otro: 'Trabajo de verano' }],
      complicaciones: [{ numero: 1 }, { opcion: 'DISTANCIA' }],
    },
  })
  const aviso = hijo(vista.render(), 'AvisoPlan').props.aviso
  const m = listo.sugerencias.filter((s) => s.estado === 'PENDIENTE').length
  assert.equal(aviso.titulo, `1 complicación y ${m} pasos sugeridos`)
  assert.equal(hijo(vista.render(), 'SeccionRealidad').props.borrador, null)
  assert.equal(elementos(vista.render(), (e) => e.type === 'fieldset')[0].props.disabled, false)
})

test('frente de la tarjeta: «1.er año ≈ S/ …» bajo la institución solo con REALIDAD lista', () => {
  const app = fixtureServidor({ ruta: '/student/profile/decisions' })
  const { TarjetaPlan } = app.load('src/features/plans/components/TarjetaPlan.tsx')
  const props = { indice: 0, principal: true, primerInteres: false, ocupado: false, onEliminar() {} }
  assert.match(
    texto(TarjetaPlan({ ...props, plan: listo })),
    /Federico Villarreal · Pública1\.er año ≈ S\/ 2 500/,
  )
  const enProceso = {
    ...listo,
    secciones: listo.secciones.map((s) => (s.codigo === 'REALIDAD' ? { ...s, estado: 'EN_PROCESO' } : s)),
  }
  assert.doesNotMatch(texto(TarjetaPlan({ ...props, plan: enProceso })), /1\.er año/)
})

test('«Dónde estudiaría» busca entre muchas instituciones, sin tildes ni mayúsculas, con «Todavía no sé» al final', () => {
  const app = fixtureServidor({ ruta: `/student/profile/decisions/${PSICOLOGIA}` })
  const { Combobox } = app.load('src/components/ui/Combobox.tsx')
  const elegidas = []
  const opciones = carreraDetalle.instituciones.map((i) => ({ valor: i.codigo, texto: i.nombre }))
  const vista = app.mount(Combobox, {
    etiqueta: 'Dónde estudiaría',
    opciones,
    fijas: [{ valor: 'todavia-no-se', texto: 'Todavía no sé' }],
    valor: 'todavia-no-se',
    onCambiar: (v) => elegidas.push(v),
  })
  const campo = () => elementos(vista.render(), (e) => e.type === 'input')[0]
  const textos = () => elementos(vista.render(), (e) => e.props?.role === 'option').map((e) => texto(e))
  assert.equal(campo().props.value, 'Todavía no sé')
  campo().props.onFocus()
  assert.equal(textos().length, opciones.length + 1)
  const buscada = opciones.find((o) => /Católica/.test(o.texto))
  campo().props.onChange({ target: { value: 'catolica' } })
  assert.ok(textos().includes(buscada.texto))
  assert.ok(textos().every((t) => /Católica/.test(t) || t === 'Todavía no sé'))
  assert.equal(textos().at(-1), 'Todavía no sé')
  campo().props.onKeyDown({ key: 'Enter', preventDefault() {} })
  assert.deepEqual(elegidas, [buscada.valor])
  assert.equal(campo().props['aria-expanded'], false)
})
