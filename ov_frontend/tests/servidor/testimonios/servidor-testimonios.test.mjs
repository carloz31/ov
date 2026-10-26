import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {
  cargarAlmacen,
  copia,
  escenarioRuta,
  esConsultaDominio,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// F04: testimonios bloqueados con pista y disponibles con enlace.
const code = ts.transpileModule(readFileSync('src/lib/servidor/adaptadoresCasos.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
const casos = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const inicial = jsonServidor('ruta/ruta-testimonios-inicial')
const final = jsonServidor('ruta/ruta-testimonios-final')

test('bloqueado: solo la pista, si la tiene; disponible: descripción y enlace', () => {
  const conPista = inicial.find((t) => t.codigo === 't-testimonio-1')
  assert.equal(conPista.estado, 'BLOQUEADA')
  assert.equal(conPista.enlace, null)
  assert.equal(casos.pistaTestimonio(conPista), conPista.pista)
  assert.ok(conPista.pista)
  assert.equal(casos.pistaTestimonio({ ...conPista, pista: null }), null)
  // Ajuste mochila: al final solo el primero está abierto; los demás conservan su pista.
  const disponibles = final.filter((t) => t.estado === 'DISPONIBLE')
  assert.deepEqual(copia(disponibles.map((t) => t.codigo)), ['t-testimonio-1'])
  assert.ok(disponibles.every((t) => t.enlace && casos.pistaTestimonio(t) === null))
  assert.ok(final.filter((t) => t.estado === 'BLOQUEADA').every((t) => !t.enlace && casos.pistaTestimonio(t)))
})

test('consultar y ver un testimonio usan las rutas del backend', async () => {
  const app = fixtureServidor(),
    estado = escenarioRuta('ciudad')
  app.fetch((req) => {
    if (esConsultaDominio(req)) return respuestaDominio(req, estado)
    if (req.url.includes('/desbloqueos?')) return { body: [] }
    if (req.url.endsWith('/testimonios')) return { body: final }
    if (req.url.endsWith('/ver-testimonio'))
      return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  const store = app.load('src/store/servidor/testimonios.ts')
  assert.deepEqual(copia(await store.consultarTestimonios()), { tipo: 'ok', datos: final })
  assert.equal((await store.verTestimonio('t-testimonio-2')).tipo, 'ok')
  assert.deepEqual(copia(app.requests.slice(-2).map((r) => [r.url, r.body ?? null])), [
    ['/api/cuentas/est-ana/testimonios', null],
    ['/api/acciones/ver-testimonio', { cuenta: 'est-ana', testimonio: 't-testimonio-2' }],
  ])
})

// Ajustes Central (7): la tarjeta del prototipo con los datos del servidor.
test('en la mochila, los testimonios del servidor llevan persona, ocupación, cita y el caso que los regala', () => {
  const app = fixtureServidor()
  const sesion = app.load('src/store/servidor/sesion.ts')
  sesion.publicar({ fichas: { datos: jsonServidor('ruta/ruta-fichas-final'), estado: 'listo', error: null } })
  const recursos = app.load('src/features/backpack/lib/travelerResources.ts')
  const mezcla = [final[0], inicial.find((t) => t.codigo === 't-testimonio-2')]
  const voces = recursos.getTravelResources(mezcla).filter((r) => r.kind === 'testimonial')
  const caso = { codigo: 't-caso', titulo: 'Caso de prueba' }
  assert.deepEqual(
    copia(voces.map((r) => [r.id, r.title, r.summary, r.url ?? null, r.author ?? null, r.servidor])),
    [
      [
        't-testimonio-1',
        final[0].titulo,
        final[0].cita,
        final[0].enlace,
        'Luis Mendoza · Paramédico/a · 5 años de experiencia',
        { disponible: true, pista: null, caso, casoDisponible: true, visto: true },
      ],
      [
        't-testimonio-2',
        mezcla[1].titulo,
        mezcla[1].pista,
        null,
        null,
        { disponible: false, pista: mezcla[1].pista, caso, casoDisponible: false, visto: false },
      ],
    ],
  )
  assert.deepEqual(copia(voces.map((r) => recursos.isTravelResourceUnlocked(r, {}, {}))), [true, false])
  // Bloqueado: el requisito solo nombra la misión que lo desbloquea, sin «próximamente».
  assert.equal(
    recursos.resourceRequirement(voces[1]).text,
    'Completa la misión «Caso de prueba» en Central de Casos.',
  )
  // El video del testimonio se incrusta en el visor.
  assert.equal(
    recursos.youtubeEmbedUrl(final[0].enlace),
    'https://www.youtube-nocookie.com/embed/ysz5S6PUM-U',
  )
})

// Ajuste mochila: la voz bloqueada se lista solo con su llamado disponible y su tarjeta abre el pop up de
// requisito; las de llamados que aún no se abren se cuentan en la tarjeta de cierre.
test('la mochila abre el testimonio en su pop up y registra su vista; sin «llega pronto»', () => {
  const hook = readFileSync('src/features/backpack/hooks/useBackpack.ts', 'utf8')
  assert.doesNotMatch(hook, /window\.open/)
  assert.match(hook, /if \(resource\.servidor\) void registrarVistaTestimonio\(resource\.id\)/)
  const vista = readFileSync('src/pages/student/StudentBackpackView.tsx', 'utf8')
  const voz = readFileSync('src/features/backpack/components/VozPorDescubrir.tsx', 'utf8')
  assert.doesNotMatch(voz, /llega pronto|Misión disponible próximamente/)
  assert.match(voz, /onClick=\{onRequisito\}/)
  // El testimonio abre su pop up; la ficha, el modal de ficha.
  assert.match(vista, /resource=\{selected\?\.kind !== 'sheet' && selected && isUnlocked\(selected\) \? selected : undefined\}/)
  // Abierto desde un cierre (`?ficha=`), también registra su vista.
  assert.match(
    hook,
    /if \(testimonioSolicitado && fichaSolicitada\) void registrarVistaTestimonio\(fichaSolicitada\)/,
  )
})
