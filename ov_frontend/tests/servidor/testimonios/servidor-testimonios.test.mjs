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
  const conPista = inicial.find((t) => t.codigo === 't-testimonio-1'),
    sinPista = inicial.find((t) => t.codigo === 't-testimonio-2')
  assert.equal(conPista.estado, 'BLOQUEADA')
  assert.equal(conPista.enlace, null)
  assert.equal(casos.pistaTestimonio(conPista), conPista.pista)
  assert.ok(conPista.pista)
  assert.equal(casos.pistaTestimonio(sinPista), null)
  assert.ok(final.every((t) => t.estado === 'DISPONIBLE' && t.enlace && casos.pistaTestimonio(t) === null))
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
  const caso = { codigo: 't-caso', titulo: 'Caso de prueba', disponible: false }
  assert.deepEqual(
    copia(voces.map((r) => [r.id, r.title, r.summary, r.url ?? null, r.author ?? null, r.servidor])),
    [
      [
        't-testimonio-1',
        final[0].titulo,
        final[0].cita,
        final[0].enlace,
        'Luis Mendoza · Paramédico/a · 5 años de experiencia',
        { disponible: true, pista: null, caso: { ...caso, disponible: true } },
      ],
      ['t-testimonio-2', mezcla[1].titulo, '', null, null, { disponible: false, pista: null, caso }],
    ],
  )
  assert.deepEqual(copia(voces.map((r) => recursos.isTravelResourceUnlocked(r, {}, {}))), [true, false])
  // Bloqueado con su caso aún cerrado: el requisito nombra el caso y avisa que llega pronto.
  assert.equal(
    recursos.resourceRequirement(voces[1]).text,
    'Completa la misión «Caso de prueba» en Central de Casos. Misión disponible próximamente.',
  )
  assert.equal(
    recursos.resourceRequirement({
      ...voces[1],
      servidor: { ...voces[1].servidor, caso: { ...caso, disponible: true } },
    }).text,
    'Completa la misión «Caso de prueba» en Central de Casos.',
  )
  // El video del testimonio se incrusta en el visor.
  assert.equal(
    recursos.youtubeEmbedUrl(final[0].enlace),
    'https://www.youtube-nocookie.com/embed/ysz5S6PUM-U',
  )
})

test('la mochila abre el testimonio en el visor, registra su vista y muestra el cierre de más voces', () => {
  const hook = readFileSync('src/features/backpack/hooks/useBackpack.ts', 'utf8')
  assert.doesNotMatch(hook, /window\.open/)
  assert.match(hook, /if \(resource\.servidor\) void registrarVistaTestimonio\(resource\.id\)/)
  assert.match(hook, /muestraMasVoces: true/)
  const vista = readFileSync('src/pages/student/StudentBackpackView.tsx', 'utf8')
  assert.match(vista, /resource=\{selected && isUnlocked\(selected\) \? selected : undefined\}/)
  // El cierre del caso abre el mismo pop up encima, con el visor global.
  assert.match(readFileSync('src/pages/student/ForestFireCasePage.tsx', 'utf8'), /<VisorRecursoHost \/>/)
  assert.match(
    readFileSync('src/features/cases/hooks/useTestimonioCaso.ts', 'utf8'),
    /d\.caso\?\.codigo === actividad/,
  )
})
