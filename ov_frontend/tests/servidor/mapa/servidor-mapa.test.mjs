import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

function mapa(fixture, desarrollo = true) {
  const app = fixtureServidor({ desarrollo })
  const sesion = app.load('src/store/servidor/sesion.ts')
  const bloques = jsonServidor(fixture)
  sesion.publicar({ actividades: { datos: bloques, estado: 'listo', error: null } })
  const camino = app.load('src/features/adventure/lib/caminoPoints.ts')
  const ciudad = app.load('src/features/adventure/lib/ciudadPoints.ts')
  const general = app.load('src/features/adventure/lib/mapPoints.ts')
  return {
    app,
    sesion,
    bloques,
    camino: () => camino.getCaminoPoints({}, {}),
    ciudad: () => ciudad.getCiudadPoints({}, {}),
    general,
    siguiente: camino.getNextCaminoActivity,
  }
}

const posiciones = (puntos) => copia(puntos.map((p) => [p.specActivityId ?? p.id, p.bloque, p.status]))

test('ruta dibuja T0, T1 y T2 en el orden del servidor, con su tramo y su estado', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  const camino = m.camino()
  assert.deepEqual(posiciones(camino), [
    ['t-inicio', 1, 'available'],
    ['t-partida', 1, 'locked'],
    ['t-cierre-inicio', 1, 'locked'],
    // Las opcionales se ven solo al desbloquearse.
    ['t-expectativas', 2, 'locked'],
    ['t-llegada', 3, 'locked'],
    ['t-comparar', 3, 'locked'],
    ['t-proyecto', 3, 'locked'],
  ])
  const { contenidoPorClave } = m.app.load('src/data/activities/contenidos.ts')
  const inicio = camino[0]
  assert.deepEqual(
    [inicio.title, inicio.x, inicio.y, inicio.subtitle],
    [
      'Inicio de prueba',
      contenidoPorClave('t_inicio').mapa.x,
      contenidoPorClave('t_inicio').mapa.y,
      'Informativa · 5 min',
    ],
  )
  assert.ok(
    m
      .ciudad()
      .filter((p) => p.specActivityId?.startsWith('t-'))
      .every((p) => p.status === 'locked'),
  )
  assert.equal(m.siguiente(camino).id, 't-inicio')
  assert.ok(m.siguiente(camino).nodos.length > 0)
})

test('lo que se abre al desbloquear aparece solo cuando el servidor lo hace visible', () => {
  const visibles = (etapa) =>
    mapa(`ruta/ruta-actividades-${etapa}`)
      .camino()
      .map((p) => p.specActivityId)
  assert.equal(visibles('t1').includes('t-opcional'), false)
  assert.equal(visibles('ciudad').includes('t-opcional'), true)
  assert.equal(visibles('ciudad').includes('t-adicional'), true)
  const ciudad = mapa('ruta/ruta-actividades-ciudad').ciudad()
  assert.equal(ciudad.find((p) => p.specActivityId === 't-mision-intereses').status, 'available')
})

// Ajuste del panel (F05): `progresoBloque` es solo el conteo del requisito de la Ciudad; el avance viene de `/avance`.
test('el avance del camino cuenta solo las actividades requeridas, como el servidor', () => {
  for (const [etapa, completadas] of [
    ['inicial', 0],
    ['t1', 3],
    ['ciudad', 4],
  ]) {
    const m = mapa(`ruta/ruta-actividades-${etapa}`)
    const progreso = m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques)
    assert.deepEqual([progreso.completadas, progreso.total], [completadas, 7])
    const avance = jsonServidor(`ruta/ruta-avance-${etapa}`)
    m.sesion.publicar({ avance: { datos: avance, estado: 'listo', error: null } })
    const zona = m.general.getZoneProgress('missions', {}, {})
    assert.equal(zona.porcentaje, avance.camino.porcentaje)
    assert.deepEqual(zona.tramo, avance.tramo_actual)
  }
  const m = mapa('ruta/ruta-actividades-t2')
  assert.equal(
    m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques, 'CIUDAD').completadas,
    3,
  )
})

test('un contenido sin nodos ubica el punto, pero no abre actividad', () => {
  const m = mapa('ruta/ruta-actividades-t2')
  const { getPointDetails } = m.app.load('src/features/adventure/lib/pointDetails.ts')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  // F03 dio nodos a t-lee-cuestionario y F07b, a t-comparar: el ejemplo vacía en la prueba los nodos de t-comparar
  // (T2), porque ya no queda un registro abierto sin contenido.
  m.app.load('src/data/activities/contenidos.ts').contenidoPorClave('t_comparar').nodos.length = 0
  const pendiente = m.camino().find((p) => p.specActivityId === 't-comparar')
  assert.equal(pendiente.status, 'available')
  const detalle = getPointDetails(pendiente, {}, {})
  assert.deepEqual(
    [detalle.badge, detalle.actionLabel, detalle.disabled, detalle.meta, detalle.type],
    ['Contenido pendiente', 'Contenido pendiente', true, '15 min', 'Registro'],
  )
  assert.equal(actividadPorContenido(m.bloques, 't-comparar'), undefined)
  assert.ok(actividadPorContenido(m.bloques, 't-lee-cuestionario'))
  assert.ok(actividadPorContenido(m.bloques, 't-expectativas'))
  const inicio = getPointDetails(
    m.camino().find((p) => p.specActivityId === 't-inicio'),
    {},
    {},
  )
  assert.deepEqual(
    [inicio.badge, inicio.actionLabel, inicio.disabled, inicio.type],
    ['Completada', 'Volver a realizar esta misión', false, 'Informativa'],
  )
})

test('una actividad sin contenido avisa una vez por sesión en desarrollo y nunca en producción', () => {
  const original = console.warn,
    avisos = []
  console.warn = (texto) => avisos.push(texto)
  const sinContenido = (m) => {
    m.bloques[3].actividades[0].contenido = 'sin_contenido_prueba'
    m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
    return m
  }
  try {
    const m = sinContenido(mapa('ruta/ruta-actividades-ciudad'))
    m.ciudad()
    m.ciudad()
    assert.deepEqual(avisos, ['Actividad sin contenido: t-mision-intereses → sin_contenido_prueba'])
    assert.equal(
      m.ciudad().some((p) => p.specActivityId === 't-mision-intereses'),
      false,
    )
    m.sesion.limpiarEstadoServidor()
    m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
    m.ciudad()
    assert.equal(avisos.length, 2)
    sinContenido(mapa('ruta/ruta-actividades-ciudad', false)).ciudad()
    assert.equal(avisos.length, 2)
  } finally {
    console.warn = original
  }
})

// Hasta F03, la secuencia de Mara se prueba con los fixtures de plataforma.
test('orden remoto, códigos nuevos, visibilidad y secuencias dirigen puntos y siguiente actividad', () => {
  const m = mapa('actividades-ciudad')
  const camino = m.bloques[0]
  camino.actividades = [
    { ...camino.actividades[2], codigo: 'registro-nuevo', estado: 'DISPONIBLE' },
    { ...camino.actividades[0], visible: false },
    { ...camino.actividades[1], estado: 'DISPONIBLE', visibilidad: 'AL_DESBLOQUEAR' },
  ]
  const puntos = m.camino()
  assert.deepEqual(copia(puntos.map((a) => a.specActivityId).filter(Boolean)), [
    'registro-nuevo',
    'enc-mitos',
  ])
  const siguiente = m.siguiente(puntos)
  assert.equal(siguiente.id, 'registro-nuevo')
  assert.equal(siguiente.nodos.length > 0, true)
  assert.equal(m.general.getRecommendedPoint(puntos).specActivityId, 'registro-nuevo')
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques).total, 1)
  const secuencia = m.bloques[1].actividades.slice(0, 14)
  secuencia.slice(0, 3).forEach((a) => (a.estado = 'COMPLETADA'))
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').subtitle, 'Test · Interacción 4 de 14')
  secuencia.forEach((a) => (a.estado = 'COMPLETADA'))
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').specActivityId, 'act-tip-14')
  assert.equal(m.ciudad().find((a) => a.id === 'mara-test').status, 'completed')
})

test('contenido sin posición no se dibuja ni participa del progreso', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  m.bloques[0].actividades[0].contenido = 'pad_01_acompanar'
  assert.equal(
    m.camino().some((p) => p.specActivityId === 't-inicio'),
    false,
  )
  assert.equal(m.app.load('src/lib/servidor/contenidos.ts').progresoBloque(m.bloques).total, 6)
})

test('resolver por contenido usa los nodos del JSON de la ruta con el código y el título del servidor', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  const { contenidoPorClave } = m.app.load('src/data/activities/contenidos.ts')
  for (const codigo of ['t-inicio', 't-partida', 't-cierre-inicio']) {
    const resuelta = actividadPorContenido(m.bloques, codigo)
    assert.equal(resuelta.id, codigo)
    assert.equal(resuelta.titulo, m.bloques[0].actividades.find((a) => a.codigo === codigo).titulo)
    assert.deepEqual(copia(resuelta.nodos), contenidoPorClave(codigo.replaceAll('-', '_')).nodos)
  }
})

test('el drawer muestra el mensaje de bloqueo del servidor, sin consultar el progreso', () => {
  const m = mapa('ruta/ruta-actividades-inicial')
  const { getPointDetails } = m.app.load('src/features/adventure/lib/pointDetails.ts')
  const detalle = (codigo) =>
    getPointDetails(
      m.camino().find((p) => p.specActivityId === codigo),
      {},
      {},
    )
  assert.equal(detalle('t-partida').requirement, 'Completa el inicio para continuar.')
  assert.equal(detalle('t-cierre-inicio').requirement, 'Completa tu punto de partida para continuar.')
  const bloqueT1 = m.bloques[1]
  assert.equal(detalle('t-expectativas').requirement, bloqueT1.actividades[0].bloqueo[0].mensaje)
  // Sin motivo propio, la actividad usa el de su bloque.
  bloqueT1.actividades[0].bloqueo = null
  bloqueT1.bloqueo[0].mensaje = 'DATO DE PRUEBA: motivo del bloque'
  m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
  assert.equal(detalle('t-expectativas').requirement, 'DATO DE PRUEBA: motivo del bloque')
  assert.equal(detalle('t-inicio').requirement, undefined)
  assert.equal(
    m.app.requests.some((r) => r.url.includes('/progreso/')),
    false,
  )
})

test('una opcional lleva su insignia, su duración del servidor y no cuenta para el tramo', () => {
  const m = mapa('ruta/ruta-actividades-ciudad')
  const { getPointDetails } = m.app.load('src/features/adventure/lib/pointDetails.ts')
  const camino = m.camino()
  const opcional = camino.find((p) => p.specActivityId === 't-opcional')
  assert.equal(opcional.opcional, true)
  assert.equal(camino.find((p) => p.specActivityId === 't-expectativas').opcional, undefined)
  const detalle = getPointDetails(opcional, {}, {})
  assert.deepEqual(
    [detalle.opcional, detalle.meta, detalle.description],
    [true, '5 min', 'Actividad opcional que aparece al desbloquearse.'],
  )
  assert.equal(getPointDetails(camino[0], {}, {}).opcional, false)
  // La presentación sale solo del servidor; si llega nula, no se inventa otra.
  assert.equal(getPointDetails(camino[0], {}, {}).description, m.bloques[0].actividades[0].descripcion)
  m.bloques[0].actividades[0].descripcion = null
  m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
  assert.equal(getPointDetails(m.camino()[0], {}, {}).description, '')
  const { BlockSign } = m.app.load('src/features/adventure/components/BlockSign.tsx')
  // T1 tiene opcionales pendientes, pero su única requerida (t-expectativas) está completada:
  // lleva el mismo ícono que T0 (todo completo) y no el de T2 (pendiente).
  const icono = (numero) =>
    BlockSign({ points: camino }).props.children.find((s) => s.key === String(numero)).props.children[0].type
  assert.equal(icono(2), icono(1))
  assert.notEqual(icono(2), icono(3))
})

test('la Ciudad cerrada se explica desde el selector: sin llave en el mapa y con el mensaje del bloque', async () => {
  const m = mapa('ruta/ruta-actividades-t1')
  assert.equal(
    m.camino().some((p) => p.id === 'city'),
    false,
  )
  const mensaje = m.bloques.find((b) => b.codigo === 'CIUDAD').bloqueo[0].mensaje
  const { useMapScreen } = m.app.load('src/features/adventure/hooks/useMapScreen.ts')
  const adventure = m.app.load('src/store/adventureStore.ts').useAdventure()
  const pantalla = (zone, points) =>
    m.app.mount(useMapScreen, { zone, points, adventure, journey: {} }).render()
  const camino = pantalla('missions', m.camino())
  assert.deepEqual([camino.ciudadBloqueo, camino.mostrarCiudadBloqueada], [mensaje, false])
  assert.match(camino.pasosAyuda.join(' '), /En el camino se abre la ciudad/)
  assert.doesNotMatch(camino.pasosAyuda.join(' '), /Al final del camino/)
  const ciudad = pantalla('central', m.ciudad())
  assert.equal(ciudad.mostrarCiudadBloqueada, false)
  const { ZoneSwitch } = m.app.load('src/features/adventure/components/ZoneSwitch.tsx')
  let explicada = 0
  // En api no hay tooltip: la Ciudad cerrada la explica Lumi al pulsar.
  const selector = m.app.mount(ZoneSwitch, {
    zone: 'missions',
    cityOpen: false,
    showLockedHint: false,
    onCityLocked: () => explicada++,
  })
  const tree = selector.render()
  assert.equal(
    elementos(tree, (e) => typeof e.type !== 'string' && /Tooltip/.test(e.type?.name ?? '')).length,
    0,
  )
  assert.equal(elementos(tree, (e) => e.props?.children === mensaje).length, 0)
  elementos(tree, (e) => e.type === 'button' && e.props.className === 'sx-zone-city')[0].props.onClick()
  assert.equal(explicada, 1)
  // Con la Ciudad abierta no hay mensaje que mostrar.
  const abierta = mapa('ruta/ruta-actividades-ciudad')
  const { useMapScreen: usar } = abierta.app.load('src/features/adventure/hooks/useMapScreen.ts')
  const estado = abierta.app
    .mount(usar, {
      zone: 'missions',
      points: abierta.camino(),
      adventure: abierta.app.load('src/store/adventureStore.ts').useAdventure(),
      journey: {},
    })
    .render()
  assert.equal(estado.ciudadBloqueo, undefined)
})

test('en api el drawer, el panel, los tramos y el reproductor toman sus textos del servidor', () => {
  const m = mapa('ruta/ruta-actividades-t1')
  const { getPointDetails } = m.app.load('src/features/adventure/lib/pointDetails.ts')
  const { actividadPorContenido } = m.app.load('src/lib/servidor/contenidos.ts')
  const valores = m.camino().find((p) => p.specActivityId === 't-valores')
  assert.equal(valores.subtitle, 'Registro · 10 min')
  assert.equal(valores.bloqueNombre, m.bloques[1].nombre)
  const detalle = getPointDetails(valores, {}, {})
  assert.deepEqual([detalle.region, detalle.meta], [m.bloques[1].nombre, '10 min'])
  // Sin duración del servidor, no se muestra tiempo.
  m.bloques[1].actividades.find((a) => a.codigo === 't-valores').duracion_estimada_min = null
  m.sesion.publicar({ actividades: { datos: m.bloques, estado: 'listo', error: null } })
  const sinTiempo = m.camino().find((p) => p.specActivityId === 't-valores')
  assert.equal(sinTiempo.subtitle, 'Registro')
  assert.equal(getPointDetails(sinTiempo, {}, {}).meta, '')
  const { BlockSign } = m.app.load('src/features/adventure/components/BlockSign.tsx')
  const letreros = BlockSign({ points: m.camino() }).props.children.map((s) => s.props.children[1])
  assert.deepEqual(
    copia(letreros),
    m.bloques.filter((b) => b.espacio === 'MISIONES_CAMPO').map((b) => b.nombre),
  )
  const inicio = actividadPorContenido(m.bloques, 't-inicio')
  assert.deepEqual(
    [inicio.titulo, inicio.ubicacion],
    [m.bloques[0].actividades[0].titulo, m.bloques[0].nombre],
  )
})

test('las opcionales van fuera del camino, con línea desde su origen, y se revelan una por una', () => {
  const m = mapa('ruta/ruta-actividades-t1')
  const camino = m.camino()
  const opcionales = camino.filter((p) => p.additional)
  assert.deepEqual(copia(opcionales.map((p) => [p.specActivityId, p.originId, p.opcional])), [
    ['t-valores', 't-cierre-inicio', true],
    ['t-lee-cuestionario', 't-cierre-inicio', true],
    ['t-batalla', 't-cierre-inicio', true],
  ])
  // El camino principal une solo las requeridas, en orden y cruzando bloques.
  const { MapPath } = m.app.load('src/features/adventure/components/MapPath.tsx')
  const lineas = MapPath({ points: camino }).props.children
  assert.deepEqual(copia(lineas[0].map((l) => l.key)), [
    't-inicio-t-partida',
    't-partida-t-cierre-inicio',
    't-cierre-inicio-t-expectativas',
    't-expectativas-t-llegada',
    't-llegada-t-comparar',
    't-comparar-t-proyecto',
  ])
  assert.equal(lineas[1].filter(Boolean).length, 3)
  // Los desbloqueos de una acción quedan en memoria y se revelan uno por uno.
  const avisos = m.app.load('src/store/servidor/avisos.ts')
  avisos.incorporarDesbloqueos(
    jsonServidor('ruta/ruta-completar-t-cierre-inicio').nuevos_desbloqueos.concat(
      ['t-valores', 't-lee-cuestionario', 't-batalla', 't-partida'].map((codigo) => ({
        regla: `DATO DE PRUEBA ${codigo}`,
        tipo_objetivo: 'ACTIVIDAD',
        objetivo: { codigo, nombre: codigo },
        condiciones: [],
      })),
    ),
  )
  const estado = (codigo) => {
    const p = m.camino().find((x) => x.specActivityId === codigo)
    return p.revealing ? 'revela' : p.revealQueued ? 'espera' : 'visible'
  }
  assert.deepEqual(['t-valores', 't-lee-cuestionario', 't-batalla'].map(estado), [
    'revela',
    'espera',
    'espera',
  ])
  avisos.quitarPorRevelar((c) => c === 't-valores')
  assert.deepEqual(['t-valores', 't-lee-cuestionario', 't-batalla'].map(estado), [
    'visible',
    'revela',
    'espera',
  ])
  // Una requerida no se anima: el Camino la descarta de la cola.
  avisos.quitarPorRevelar((c) => !['t-lee-cuestionario', 't-batalla'].includes(c))
  assert.deepEqual(copia(m.sesion.obtenerEstadoServidor().porRevelar), ['t-lee-cuestionario', 't-batalla'])
  m.sesion.limpiarEstadoServidor()
  assert.deepEqual(copia(m.sesion.obtenerEstadoServidor().porRevelar), [])
})

test('en api las opcionales llevan «?» sin píldora, lo bloqueado candado y la recomendada es una requerida', () => {
  const m = mapa('ruta/ruta-actividades-ciudad')
  const { MapNode } = m.app.load('src/features/adventure/components/MapNode.tsx')
  const nodo = (codigo) => {
    const point = m.camino().find((p) => p.specActivityId === codigo)
    return MapNode({ point, onSelect() {}, onFocus() {} })
  }
  const opcional = nodo('t-opcional')
  assert.match(opcional.props['aria-label'], /, misión extra$/)
  // Sin píldora: la etiqueta lleva solo el título.
  const pildora = (n) => n.props.children[1].props.children[1]
  assert.equal(pildora(opcional), false)
  const circulo = opcional.props.children[0].props.children
  const esquina = circulo[1].props.children
  assert.equal(esquina.props.fill, 'none')
  const adicional = nodo('t-adicional')
  assert.match(adicional.props['aria-label'], /, misión adicional$/)
  assert.equal(pildora(adicional), false)
  // Lo bloqueado lleva candado, no el «?» de las misiones extra.
  const bloqueado = nodo('t-llegada')
  const icono = bloqueado.props.children[0].props.children[0].type
  assert.notEqual(icono, esquina.type)
  // La recomendada es una requerida disponible aunque haya opcionales disponibles antes.
  const t1 = mapa('ruta/ruta-actividades-t1')
  const camino = t1.camino()
  assert.ok(camino.some((p) => p.opcional && p.status === 'available'))
  assert.equal(t1.general.getRecommendedPoint(camino).specActivityId, 't-expectativas')
  // Sin requeridas disponibles (la Ciudad abierta y T2 cerrado), la recomendada puede ser una opcional.
  assert.equal(m.general.getRecommendedPoint(m.camino()).opcional, true)
  const { guiaCaminoApi } = m.app.load('src/data/content/guideTexts.ts')
  assert.match(guiaCaminoApi[0], /candado aún no están disponibles.*misiones extra que ganaste/)
})

test('completar t-cierre-inicio encola para revelar las opcionales que su bloque vuelve visibles', async () => {
  const { escenarioRuta, esConsultaDominio, respuestaDominio } =
    await import('../../soporte/servidor-ayudas.mjs')
  const app = fixtureServidor()
  let etapa = 'inicial'
  app.fetch((r) => {
    if (r.url === '/api/acciones/ingresar')
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (r.url === '/api/acciones/completar-actividad') {
      etapa = 't1'
      return { body: jsonServidor('ruta/ruta-completar-t-cierre-inicio') }
    }
    if (esConsultaDominio(r)) return respuestaDominio(r, escenarioRuta(etapa))
    if (r.url.includes('/desbloqueos?')) return { body: [] }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  const acciones = app.load('src/store/servidor/operaciones.ts')
  assert.equal((await acciones.ingresar()).tipo, 'ok')
  const sesion = app.load('src/store/servidor/sesion.ts')
  // El ingreso no anima nada: lo visible ya estaba.
  assert.deepEqual(copia(sesion.obtenerEstadoServidor().porRevelar), [])
  // El servidor solo informa NIVEL, SECCION y BLOQUE T1; las opcionales llegan al volverse visibles.
  assert.equal((await acciones.completarActividad('t-cierre-inicio')).tipo, 'ok')
  assert.deepEqual(copia(sesion.obtenerEstadoServidor().porRevelar), [
    't-valores',
    't-lee-cuestionario',
    't-batalla',
  ])
  const camino = app.load('src/features/adventure/lib/caminoPoints.ts').getCaminoPoints({}, {})
  assert.deepEqual(
    copia(camino.filter((p) => p.additional).map((p) => [p.specActivityId, !!p.revealing, !!p.revealQueued])),
    [
      ['t-valores', true, false],
      ['t-lee-cuestionario', false, true],
      ['t-batalla', false, true],
    ],
  )
})

test('una actividad de la Ciudad cerrada no reescribe la dirección: el mapa es quien lleva al Camino', () => {
  // Regresión: este efecto corría después del del mapa y devolvía a la Ciudad con `?punto=`.
  const app = fixtureServidor({ ruta: '/student/exploration?actividad=t-mision-intereses' })
  app.load('src/store/servidor/sesion.ts').publicar({
    actividades: { datos: jsonServidor('ruta/ruta-actividades-t1'), estado: 'listo', error: null },
  })
  const { useCityAccess } = app.load('src/features/adventure/hooks/useCityAccess.ts')
  const acceso = app.mount(useCityAccess).render()
  assert.equal(acceso.activity, undefined)
  assert.equal(app.query.get('actividad'), 't-mision-intereses')
  assert.equal(app.query.has('punto'), false)
})
