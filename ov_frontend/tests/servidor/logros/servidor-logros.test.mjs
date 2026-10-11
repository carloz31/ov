import { esConsultaDominio, respuestaDominio } from '../../soporte/servidor-ayudas.mjs'
import { escenarioServidor } from '../../soporte/servidor-ayudas.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { iniciarMara, botonEn } from '../../soporte/servidor-mara-ayudas.mjs'
import { copia, elementos, esperar, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

const texto = (n) =>
  Array.isArray(n)
    ? n.map(texto).join(' ')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? texto(n.props.children)
        : ''
async function iniciar() {
  const f = await iniciarMara(),
    a = f.app.load('src/lib/servidor/adaptadores.ts'),
    p = f.app.load('src/features/discovery/lib/passport.ts')
  await f.almacen.asegurarSeccion('logros')
  const presentaciones = f.app
    .load('src/features/discovery/lib/achievements.ts')
    .getAchievementPresentations()
  return { ...f, a, p, presentaciones, grupos: a.insigniasServidor(f.estado, presentaciones) }
}
test('insignias solo del servidor, sin cálculos locales ni ocultas pendientes en la proyección', async () => {
  const f = await iniciar(),
    publicas = f.grupos.flatMap((g) => g.items)
  assert.equal(publicas.filter((b) => b.done).length, 3)
  assert.equal(
    publicas.some((b) => b.code === 'I10' || b.code === '???'),
    false,
  )
  assert.equal(f.a.insigniasOcultasPendientes(f.estado), 1)
  assert.equal(f.p.getStudentAchievementGroups({}, {}, f.grupos), f.grupos)
  assert.ok(publicas.every((b) => f.estado.insignias.some((i) => i.codigo === b.code)))
  const adverso = copia(f.estado)
  adverso.insignias.find((i) => i.codigo === 'I1').estado = 'BLOQUEADA'
  assert.equal(f.a.insigniasServidor(adverso, f.presentaciones)[0].items[0].done, false)
})
test('oculta obtenida y código desconocido usan su información pública sin inventar progreso', async () => {
  const f = await iniciar(),
    estado = copia(f.estado)
  // DATO DE PRUEBA: logro oculto obtenido y un código público sin presentación local.
  Object.assign(
    estado.insignias.find((i) => i.codigo === '???'),
    {
      codigo: 'I10',
      estado: 'OBTENIDA',
      nombre: 'Cazador de mitos',
      descripcion: 'Disipaste un mito.',
      requisito: 'Vence un desafío intacto.',
    },
  )
  estado.insignias.push({
    codigo: 'I99',
    nombre: 'Otro sello',
    descripcion: null,
    requisito: 'DATO DE PRUEBA',
    estado: 'BLOQUEADA',
  })
  const badges = f.a.insigniasServidor(estado, f.presentaciones).flatMap((g) => g.items)
  assert.equal(badges.find((b) => b.code === 'I10').done, true)
  assert.equal(badges.find((b) => b.code === 'I10').title, 'Cazador de mitos')
  assert.equal(badges.find((b) => b.code === 'I10').description, 'Vence un desafío intacto.')
  assert.equal(badges.find((b) => b.code === 'I99').icon, 'sparkles')
  assert.equal(f.a.insigniasOcultasPendientes(estado), 0)
  f.app.fetch((r) => (esConsultaDominio(r) ? respuestaDominio(r, estado) : { body: [] }))
  await f.almacen.reintentarSeccion('logros')
  await f.almacen.refrescar()
  const View = f.app.load('src/features/discovery/components/StudentPassportView.tsx').StudentPassportView
  const tree = View()
  assert.ok(elementos(tree, (e) => e.type === 'button').some((b) => texto(b).includes('Cazador de mitos')))
  assert.doesNotMatch(texto(tree), /quedan por descubrir|Logro oculto|\?\?\?/)
})
test('pasaporte no filtra códigos ocultos ni adicionales y usa nivel remoto y total real', async () => {
  const f = await iniciar(),
    View = f.app.load('src/features/discovery/components/StudentPassportView.tsx').StudentPassportView
  const tree = View(),
    buttons = elementos(tree, (e) => e.type === 'button')
  assert.equal(
    buttons.some((b) => /I10|\?\?\?|Logro oculto/.test(texto(b))),
    false,
  )
  assert.match(texto(tree), /3\s+de\s+10\s+insignias/)
  assert.match(texto(tree), /1 insignias quedan por descubrir/)
  assert.doesNotMatch(texto(tree), /Logro oculto|Cazador de mitos|Disipaste un mito/)
  assert.match(texto(tree), /Nivel\s+3\s+de 5/)
  assert.equal(
    f.app.requests.some((r) => r.url.includes('/progreso/')),
    false,
  )
})
test('elección de insignias por cuenta respeta máximo tres, selección vacía y almacenamiento local', async () => {
  const f = await iniciar(),
    d = f.app.load('src/store/discoveryStore.ts'),
    api = { grupos: f.grupos, cuenta: 'est-ana' }
  d.updateDiscovery((s) => ({ ...s, profileBadges: ['I1'], profileBadgesConfigured: true }))
  assert.equal(f.p.getProfileBadges({}, d.getDiscovery(), {}, api).length, 3)
  d.updateDiscovery((s) => f.p.toggleProfileBadge(s, {}, 'I1', {}, api))
  d.updateDiscovery((s) => f.p.toggleProfileBadge(s, {}, 'I2', {}, api))
  d.updateDiscovery((s) => f.p.toggleProfileBadge(s, {}, 'I3', {}, api))
  assert.equal(f.p.getProfileBadges({}, d.getDiscovery(), {}, api).length, 0)
  assert.equal(f.p.getProfileBadges({}, d.getDiscovery(), {}, { ...api, cuenta: 'est-luis' }).length, 3)
  assert.deepEqual(Array.from(d.getDiscovery().profileBadges), ['I1'])
  const antes = d.getDiscovery()
  assert.equal(f.p.toggleProfileBadge(antes, {}, 'I4', {}, api), antes)
  const reload = fixtureServidor({ guardado: Object.fromEntries(f.app.local) }).load(
    'src/store/discoveryStore.ts',
  )
  assert.deepEqual(copia(reload.getDiscovery().profileBadgesApi), copia(d.getDiscovery().profileBadgesApi))
})
test('niveles 1 a 3 toman número y título remoto sin leer el avance local; null no supone nivel 1', async () => {
  const f = await iniciar(),
    level = f.app.load('src/store/adventureStore.ts').getTravelerLevel
  for (const numero of [1, 2, 3]) {
    const actual = level(
      new Proxy(
        {},
        {
          get() {
            throw Error('Se calculó nivel local')
          },
        },
      ),
      { numero, titulo: `Título ${numero}` },
    )
    assert.equal(actual.number, numero)
    assert.equal(actual.label, `Título ${numero}`)
    assert.ok(actual.description)
    assert.ok(actual.nextStep)
  }
  assert.equal(level({}, null), null)
})

test('cada título del pasaporte respeta número, nombre y estado remoto', async () => {
  const f = await iniciar(),
    estado = copia(f.estado)
  // DATO DE PRUEBA: orden y estados adversos para detectar deducciones del avance local.
  estado.niveles = [
    { numero: 2, titulo: 'Título pendiente remoto', estado: 'BLOQUEADO' },
    { numero: 1, titulo: 'Título obtenido remoto', estado: 'OBTENIDO' },
    { numero: 3, titulo: 'Título actual remoto', estado: 'OBTENIDO' },
  ]
  f.app.fetch((r) => (esConsultaDominio(r) ? respuestaDominio(r, estado) : { body: [] }))
  await f.almacen.reintentarSeccion('logros')
  await f.almacen.refrescar()
  const View = f.app.load('src/features/discovery/components/StudentPassportView.tsx').StudentPassportView
  const items = elementos(View(), (e) => e.type === 'li')
  assert.deepEqual(
    items.map((e) => e.props['data-state']),
    ['pending', 'earned', 'current'],
  )
  assert.doesNotMatch(texto(items[0]), /Alcanzado/)
  assert.match(texto(items[1]), /Alcanzado/)
})
test('requisitos de insignia con evaluador cuentan Camino y consultas tardías se descartan', async () => {
  const f = await iniciar()
  const progreso = {
    objetivo: { tipo: 'INSIGNIA', codigo: 'I2' },
    disponible: false,
    reglas: [
      {
        regla: 'R-I2',
        cumplida: false,
        condiciones: [],
        evaluador_especial: { nombre: 'misiones_camino_sin_inicio', cumplido: false },
      },
    ],
  }
  const inicial = escenarioServidor('inicial')
  assert.match(f.a.textoRequisitoInsignia(progreso, inicial.bloques, 'I2', inicial), /0 de 3 misiones/)
  assert.match(f.a.textoRequisitoInsignia(progreso, f.estado.bloques, 'I2', f.estado), /3 de 3 misiones/)
  let resolver
  f.app.fetch(
    () =>
      new Promise((r) => {
        resolver = r
      }),
  )
  const consulta = f.almacen.consultarProgreso('INSIGNIA', 'I2')
  f.almacen.limpiarEstadoServidor()
  resolver({ body: progreso })
  assert.equal((await consulta).tipo, 'http')
})
test('detalle bloqueado consulta al abrir, muestra error y reintento, sin eventos', async () => {
  const f = await iniciar(),
    badge = f.grupos.flatMap((g) => g.items).find((b) => b.code === 'I4')
  const props = { badge, group: 'Caminar con otros', groupIndex: 1, onClose() {} }
  let falla = true
  f.app.fetch((r) => {
    assert.ok(r.url.includes('/progreso/INSIGNIA/I4'))
    if (falla) throw Error('DATO DE PRUEBA: sin red')
    return { body: { objetivo: { tipo: 'INSIGNIA', codigo: 'I4' }, disponible: false, reglas: [] } }
  })
  const modal = f.app.mount(
    f.app.load('src/features/discovery/components/PassportBadgeDialog.tsx').PassportBadgeDialog,
    props,
  )
  modal.render()
  await esperar()
  assert.match(texto(modal.render()), /No se pudo conectar/)
  falla = false
  botonEn(modal.render(), 'Reintentar requisito').props.onClick()
  modal.render()
  await esperar()
  assert.match(texto(modal.render()), /Invita a un compañero/)
  modal.unmount()
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})

test('entrada bloqueada a Ciudad consulta al abrir y reintenta con el conteo remoto', async () => {
  const f = await iniciar()
  let falla = true
  f.app.fetch((r) => {
    assert.ok(r.url.includes('/progreso/BLOQUE/CIUDAD'))
    if (falla) throw Error('DATO DE PRUEBA: sin conexión')
    return { body: { objetivo: { tipo: 'BLOQUE', codigo: 'CIUDAD' }, disponible: false, reglas: [] } }
  })
  const { CityLocked } = f.app.load('src/features/adventure/components/CityLocked.tsx')
  const view = f.app.mount(CityLocked, { adventure: {} })
  assert.match(texto(view.render()), /Consultando el requisito/)
  await esperar()
  assert.match(texto(view.render()), /No se pudo conectar/)
  falla = false
  botonEn(view.render(), 'Reintentar requisito').props.onClick()
  view.render()
  await esperar()
  assert.match(texto(view.render()), /9 de 9/)
  view.unmount()
  assert.equal(f.app.requests.filter((r) => r.method === 'POST').length, 0)
})
