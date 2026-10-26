import assert from 'node:assert/strict'
import test from 'node:test'
import { botonEn } from '../../soporte/servidor-mara-ayudas.mjs'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// Ajuste pasaporte-perfil: el pasaporte en api lee páginas, pistas, fechas, vitrina y condiciones del servidor.
// Los componentes propios del pasaporte no usan hooks: se expanden para leer su marcado.
const PROPIOS = new Set(['PassportLevelCard', 'PassportGroup', 'PassportBadgeCard', 'ConditionList', 'Parchment'])
const expandir = (n) =>
  Array.isArray(n)
    ? n.map(expandir)
    : typeof n?.type === 'function' && PROPIOS.has(n.type.name)
      ? expandir(n.type(n.props))
      : n?.props?.children !== undefined
        ? { ...n, props: { ...n.props, children: expandir(n.props.children) } }
        : n
const plano = (n) =>
  Array.isArray(n)
    ? n.map(plano).join(' ')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? plano(n.props.children)
        : ''
const texto = (n) => plano(expandir(n))
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const logrosFinal = jsonServidor('ruta/ruta-logros-final')
const logrosInicial = jsonServidor('ruta/ruta-logros-inicial')
const progresoNivel3 = jsonServidor('ruta/ruta-progreso-nivel-3')
const resumen = jsonServidor('ruta/ruta-resumen-inicial')
const nivel2 = {
  ...resumen,
  nivel_actual: {
    numero: 2,
    titulo: logrosFinal.niveles[1].titulo,
    descripcion: logrosFinal.niveles[1].descripcion,
    cita_lumi: logrosFinal.niveles[1].cita_lumi,
  },
}

function preparar({ logros = logrosFinal, cuenta = nivel2, servidor = () => ({ body: progresoNivel3 }) } = {}) {
  const app = fixtureServidor({ ruta: '/student/profile?section=passport' })
  app.load('src/store/servidor/sesion.ts').publicar({ resumen: listo(cuenta), logros: listo(copia(logros)) })
  app.fetch(servidor)
  return { app, a: app.load('src/lib/servidor/adaptadores.ts') }
}
const vista = (app) => app.mount(app.load('src/features/discovery/components/StudentPassportView.tsx').StudentPassportView)
const modal = (app, badge, group = 'La luz que despeja caminos') =>
  app.mount(app.load('src/features/discovery/components/PassportBadgeDialog.tsx').PassportBadgeDialog, {
    badge,
    group,
    groupIndex: 0,
    onClose() {},
  })

test('las páginas son los grupos del servidor y las secretas entran con su pista y un código local por posición', () => {
  const { a } = preparar()
  const grupos = a.insigniasServidor(logrosFinal)
  assert.deepEqual(
    copia(grupos.map((g) => [g.title, g.items.length])),
    [
      ['La luz que despeja caminos', 2],
      ['Huellas en la ciudad', 3],
    ],
  )
  const [obtenida, secreta] = grupos[0].items
  assert.equal(obtenida.code, 't-ins-1')
  assert.equal(obtenida.obtenidaEn, '2026-10-07T10:00:00')
  assert.equal(secreta.code, '???-G1-2')
  assert.equal(secreta.hidden, true)
  assert.match(secreta.pista, /No todo brillo sobrevive/)
  assert.deepEqual(
    copia(grupos[1].items.map((b) => b.code)),
    ['???-G2-1', '???-G2-2', '???-G2-3'],
  )
  assert.equal(a.textoRequisitoInsignia, undefined)
  assert.equal(a.insigniasOcultasPendientes, undefined)
})

test('condiciones: todas las reglas, resumen de la más avanzada, barra solo en las de conteo y respaldo sin texto', () => {
  const { a } = preparar()
  const nivel = a.condicionesObjetivo(progresoNivel3)
  assert.deepEqual(copia(nivel), {
    bloques: [
      [
        { texto: 'Termina el bloque de inicio', cumplida: true },
        { texto: 'Mira tres carreras distintas', cumplida: false, actual: 1, requerido: 3 },
      ],
    ],
    cumplidas: 1,
    total: 2,
    mejor: 0,
  })
  // DATO DE PRUEBA: dos reglas alternativas, una sin texto en su condición.
  const alternativas = copia(progresoNivel3)
  alternativas.reglas.push({
    regla: 'R-ALT',
    mensaje_bloqueo: 'Mensaje de la regla',
    cumplida: true,
    condiciones: [{ ...progresoNivel3.reglas[0].condiciones[0], texto: null }],
  })
  const resultado = a.condicionesObjetivo(alternativas, 'Requisito de la insignia')
  assert.equal(resultado.bloques[1][0].texto, 'Requisito de la insignia')
  assert.equal(a.condicionesObjetivo(alternativas).bloques[1][0].texto, 'Mensaje de la regla')
  assert.deepEqual([resultado.cumplidas, resultado.total], [1, 1])
})

test('pasaporte: sellos con secretas, vitrina del servidor, título siguiente con sus condiciones y sendero', async () => {
  const { app } = preparar()
  const v = vista(app)
  v.render()
  await esperar()
  const tree = expandir(v.render())
  const todo = texto(tree)
  assert.match(todo, /1\s+de\s+5\s+sellos/)
  assert.match(todo, /Vitrina:\s+1\s+de 3/)
  assert.match(todo, /Nivel\s+2\s+de\s+3/)
  assert.match(todo, new RegExp(logrosFinal.niveles[1].descripcion))
  // F5: la cita de Lumi del nivel viene del servidor.
  assert.match(todo, /Lumi: «\s*Los títulos no dicen cuánto vales\. Dicen en qué parte del camino vas\.\s*»/)
  assert.match(todo, /Cartógrafo de posibilidades/)
  assert.match(todo, /1\s+de\s+2\s+condiciones cumplidas/)
  assert.match(todo, /Mira tres carreras distintas/)
  assert.doesNotMatch(todo, /quedan por descubrir|Sellado|Logro oculto/)
  assert.match(todo, /Página\s+I\s+La luz que despeja caminos/)
  assert.match(todo, /Página\s+II\s+Huellas en la ciudad/)
  const botones = elementos(tree, (e) => e.type === 'button')
  assert.equal(botones.filter((b) => texto(b).includes('???')).length, 4)
  assert.ok(botones.every((b) => !elementos(b, (e) => e.props?.className === 'sx-p-lock').length))
  const trail = elementos(tree, (e) => e.type === 'li' && e.props['data-state'])
  assert.deepEqual(
    copia(trail.map((e) => [e.props['data-state'], texto(e.props.children.at(-1))])),
    [
      ['earned', 'Alcanzado'],
      ['current', 'Tu título actual'],
      ['next', 'Siguiente'],
    ],
  )
  assert.deepEqual(
    copia(app.requests.map((r) => r.url)),
    ['/api/cuentas/est-ana/progreso/NIVEL/N3'],
  )
  v.unmount()
})

test('en el último título no hay lista y la vitrina no lee localStorage en api', () => {
  const { app } = preparar({
    cuenta: { ...nivel2, nivel_actual: { ...logrosFinal.niveles[2], numero: 3 } },
    logros: { ...logrosFinal, vitrina: [] },
  })
  app.load('src/store/discoveryStore.ts').updateDiscovery((s) => ({
    ...s,
    // DATO DE PRUEBA: una vitrina local antigua que el modo api debe ignorar.
    profileBadgesApi: { 'est-ana': { profileBadgesConfigured: true, profileBadges: ['t-ins-1'] } },
  }))
  const todo = texto(vista(app).render())
  assert.match(todo, /Llegaste al último título del viaje/)
  assert.match(todo, /Vitrina:\s+0\s+de 3/)
  assert.equal(app.requests.length, 0)
})

test('getTravelerLevel toma número, título y descripción remotos; null no supone nivel 1', () => {
  const { app } = preparar()
  const level = app.load('src/store/adventureStore.ts').getTravelerLevel
  const sinLocal = new Proxy(
    {},
    {
      get() {
        throw Error('Se calculó nivel local')
      },
    },
  )
  const actual = level(sinLocal, { numero: 2, titulo: 'Título 2', descripcion: 'Descripción remota', cita_lumi: 'Cita' })
  assert.deepEqual(
    [actual.number, actual.label, actual.description, actual.citaLumi],
    [2, 'Título 2', 'Descripción remota', 'Cita'],
  )
  assert.ok(level(sinLocal, { numero: 3, titulo: 'Título 3', descripcion: null }).description)
  assert.equal(level({}, null), null)
})

test('modal por descubrir: condiciones del servidor y, si la consulta falla, solo el requisito', async () => {
  const progreso = {
    objetivo: { tipo: 'INSIGNIA', codigo: 't-ins-1' },
    disponible: false,
    reglas: [
      {
        regla: 'R-t-ins-1',
        mensaje_bloqueo: 'Completa el inicio.',
        cumplida: false,
        condiciones: [{ ...progresoNivel3.reglas[0].condiciones[0], cumplida: false, actual: 0, texto: 'Completa la misión de inicio' }],
      },
    ],
  }
  let falla = false
  const { app, a } = preparar({
    logros: logrosInicial,
    servidor: (r) => {
      assert.ok(r.url.endsWith('/progreso/INSIGNIA/t-ins-1'))
      if (falla) throw Error('DATO DE PRUEBA: sin red')
      return { body: progreso }
    },
  })
  const badge = a.insigniasServidor(logrosInicial)[0].items[0]
  // F5: la insignia llega como un objeto nuevo en cada render (como desde el adaptador) y se consulta una vez.
  const Dialogo = app.load('src/features/discovery/components/PassportBadgeDialog.tsx').PassportBadgeDialog
  let m = app.mount((props) => Dialogo({ ...props, badge: { ...badge } }), {
    group: 'La luz que despeja caminos',
    groupIndex: 0,
    onClose() {},
  })
  m.render()
  await esperar()
  m.render()
  await esperar()
  let todo = texto(m.render())
  assert.equal(app.requests.filter((r) => r.url.endsWith('/progreso/INSIGNIA/t-ins-1')).length, 1)
  assert.match(todo, /Por descubrir/)
  assert.match(todo, /Cómo se consigue\s+·\s+0 de 1 cumplidas/)
  assert.match(todo, /Completa la misión de inicio/)
  assert.match(todo, /Su historia se revela cuando la consigas/)
  assert.doesNotMatch(todo, /misiones\.|Reintentar requisito|Ir a/)
  m.unmount()
  falla = true
  m = modal(app, badge)
  m.render()
  await esperar()
  todo = texto(m.render())
  assert.match(todo, new RegExp(logrosInicial.insignias[0].requisito))
  assert.doesNotMatch(todo, /cumplidas|No se pudo conectar/)
  m.unmount()
  assert.equal(app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('modal secreto: pista de Lumi, sin consultar el progreso; sin pista, el texto de respaldo', () => {
  const { app, a } = preparar()
  const secreta = a.insigniasServidor(logrosFinal)[0].items[1]
  let todo = texto(modal(app, secreta).render())
  assert.match(todo, /\?\?\?/)
  assert.match(todo, /Insignia secreta/)
  assert.match(todo, /Pista de Lumi/)
  assert.match(todo, /No todo brillo sobrevive/)
  assert.match(todo, /Su nombre y su historia se revelan cuando la consigas/)
  todo = texto(modal(app, { ...secreta, pista: null }).render())
  assert.match(todo, /Lumi todavía no quiere contarte nada de este sello/)
  assert.equal(app.requests.length, 0)
})

test('modal obtenido: fecha, frase, historia y cómo se consiguió, como en el boceto', () => {
  const { app, a } = preparar()
  const badge = a.insigniasServidor(logrosFinal)[0].items[0]
  const todo = texto(modal(app, badge).render())
  assert.match(todo, /La primera chispa/)
  assert.match(todo, /Sellada el 7 de octubre de 2026/)
  assert.match(todo, /Lo que guarda este sello\s+«\s*Una nueva mirada viaja contigo\.\s*»\s+Antes de buscar un destino decidiste mirar/)
  assert.match(todo, /Cómo la conseguiste:\s+completaste la introducción de tu viaje\./)
  assert.doesNotMatch(todo, /t-inicio|Lo que lograste|Qué significa|viajeros/)
})

test('vitrina: cargador sin pasar al gris mientras guarda y un segundo toque no envía otra petición', async () => {
  const enviados = []
  let responder
  const { app, a } = preparar({
    servidor: (r) => {
      assert.equal(r.url, '/api/acciones/vitrina')
      enviados.push(r.body)
      return new Promise((ok) => {
        responder = () => ok({ body: { vitrina: r.body.codigos } })
      })
    },
  })
  const badge = a.insigniasServidor(logrosFinal)[0].items[0]
  const m = modal(app, badge)
  botonEn(m.render(), 'En tu vitrina').props.onClick()
  let boton = botonEn(m.render(), 'En tu vitrina')
  assert.equal(boton.props['aria-busy'], true)
  assert.equal(boton.props['aria-disabled'], true)
  assert.equal(boton.props.disabled, false)
  assert.ok(elementos(boton, (e) => /animate-spin/.test(e.props?.className ?? '')).length)
  boton.props.onClick()
  responder()
  await esperar()
  assert.deepEqual(copia(enviados), [{ cuenta: 'est-ana', codigos: [] }])
  boton = botonEn(m.render(), 'Añadir a tu vitrina')
  assert.equal(boton.props['aria-busy'], false)
  assert.equal(elementos(boton, (e) => /animate-spin/.test(e.props?.className ?? '')).length, 0)
  m.unmount()
})

test('guardar la vitrina no vuelve a pedir el título siguiente ni lo deja vacío', async () => {
  const { app } = preparar({
    servidor: (r) =>
      r.url.endsWith('/progreso/NIVEL/N3') ? { body: progresoNivel3 } : { body: { vitrina: r.body.codigos } },
  })
  const v = vista(app)
  v.render()
  await esperar()
  const condiciones = () => texto(expandir(v.render()))
  assert.match(condiciones(), /1\s+de\s+2\s+condiciones cumplidas/)
  await app.load('src/store/servidor/operaciones.ts').guardarVitrina([])
  assert.match(condiciones(), /1\s+de\s+2\s+condiciones cumplidas/)
  await esperar()
  assert.match(condiciones(), /Vitrina:\s+0\s+de 3/)
  assert.equal(app.requests.filter((r) => r.url.endsWith('/progreso/NIVEL/N3')).length, 1)
  v.unmount()
})

test('vitrina: si falla, el pie lo dice y el botón vuelve a su estado', async () => {
  const { app, a } = preparar({
    servidor: () => ({ status: 500, body: { detail: { mensaje: 'DATO DE PRUEBA: falla' } } }),
  })
  const badge = a.insigniasServidor(logrosFinal)[0].items[0]
  const m = modal(app, badge)
  botonEn(m.render(), 'En tu vitrina').props.onClick()
  await esperar()
  const tree = m.render()
  const boton = botonEn(tree, 'En tu vitrina')
  assert.equal(boton.props['aria-busy'], false)
  assert.equal(elementos(tree, (e) => e.props?.role === 'alert').length, 1)
  assert.deepEqual(copia(app.load('src/store/servidor/sesion.ts').obtenerEstadoServidor().logros.datos.vitrina), [
    't-ins-1',
  ])
  m.unmount()
})

test('con tres sellos en la vitrina, uno más no se puede elegir', () => {
  // DATO DE PRUEBA: tres insignias obtenidas en la vitrina y una cuarta obtenida fuera de ella.
  const logros = copia(logrosFinal)
  logros.insignias = ['A', 'B', 'C', 'D'].map((c, i) => ({ ...logrosFinal.insignias[0], codigo: c, orden: i + 1 }))
  logros.vitrina = ['A', 'B', 'C']
  const { app, a } = preparar({ logros })
  const cuarta = a.insigniasServidor(logros)[0].items[3]
  const tree = modal(app, cuarta).render()
  assert.equal(botonEn(tree, 'Añadir a tu vitrina').props.disabled, true)
  assert.match(texto(tree), /Ya tienes 3 sellos en tu vitrina\. Quita uno para elegir este\./)
})

test('entrada bloqueada a Ciudad consulta al abrir y reintenta con el conteo remoto', async () => {
  const { app } = preparar()
  let falla = true
  app.fetch((r) => {
    assert.ok(r.url.includes('/progreso/BLOQUE/CIUDAD'))
    if (falla) throw Error('DATO DE PRUEBA: sin conexión')
    return {
      body: { objetivo: { tipo: 'BLOQUE', codigo: 'CIUDAD' }, disponible: false, mensaje_bloqueo: '', reglas: [] },
    }
  })
  const { CityLocked } = app.load('src/features/adventure/components/CityLocked.tsx')
  const view = app.mount(CityLocked, { adventure: {} })
  assert.match(texto(view.render()), /Consultando el requisito/)
  await esperar()
  assert.match(texto(view.render()), /No se pudo conectar/)
  falla = false
  botonEn(view.render(), 'Reintentar requisito').props.onClick()
  view.render()
  await esperar()
  // F00: el front ya no arma el conteo del camino; el texto sale del progreso recibido.
  assert.match(texto(view.render()), /aún está pendiente/)
  view.unmount()
  assert.equal(app.requests.filter((r) => r.method === 'POST').length, 0)
})
