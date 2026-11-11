import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'
import { contenido } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste front de registros (lote 2, §6): las seis formas de eco, con todos sus datos y con los mínimos. Los ecos de
// b4-1, b4-5, b5-1 y b5-3 son los de los fixtures `contenido-*`; los de b1-3, b3-4, ma3 y h1–h3 se arman con la forma
// que entrega el backend (DATO DE PRUEBA).
const app = fixtureServidor()
const { formasEco, resumenPasos } = app.load('src/features/activities/lib/formasEco.ts')
const NODOS = 'src/features/activities/components/nodes'
const ecosDe = (actividad, item) =>
  contenido(`registro-${actividad}-inicial`).items.find((i) => i.codigo === item).ecos
const textos = (tree) => {
  const salida = []
  const visitar = (n) => {
    if (typeof n === 'string' || typeof n === 'number') salida.push(String(n))
    else if (Array.isArray(n)) n.forEach(visitar)
    else if (n?.props) {
      if (n.props.texto) salida.push(n.props.texto)
      if (n.props.plan) salida.push(JSON.stringify(n.props.plan))
      visitar(n.props.children)
    }
  }
  visitar(tree)
  return salida.join(' ')
}

test('plan (b4-1): rótulo, carrera, motivos y de quién fue la idea', () => {
  const [bloque] = formasEco(ecosDe('b4-1', 'b4-1-respalda'))
  assert.equal(bloque.forma, 'plan')
  assert.equal(bloque.plan.rotulo, 'Tu Plan A')
  assert.ok(bloque.plan.carrera && bloque.plan.motivos.length > 0)
  assert.equal(bloque.plan.idea, 'La idea fue mía')
  // Con solo la carrera, no hay huecos.
  assert.deepEqual(copia(formasEco([{ codigo: 'x', nombre: 'Tu Plan A', forma: 'cabecera', carrera: 'Contabilidad' }])),
    [{ forma: 'plan', plan: { rotulo: 'Tu Plan A', carrera: 'Contabilidad', motivos: [] } }])
})

test('dos planes (b4-5): lado a lado, Plan A y Plan B, con institución, motivos y relato', () => {
  const [bloque] = formasEco(ecosDe('b4-5', 'b4-5-moneda'))
  assert.equal(bloque.forma, 'planes')
  assert.deepEqual(copia(bloque.planes.map((p) => p.rotulo)), ['Tu Plan A', 'Tu Plan B'])
  assert.ok(bloque.planes[0].institucion && bloque.planes[0].relato && bloque.planes[0].motivos.length)
  const arbol = app.mount(app.load(`${NODOS}/EcosItem.tsx`).EcosItem, { ecos: ecosDe('b4-5', 'b4-5-moneda') }).render()
  assert.equal(elementos(arbol, (e) => e.type?.name === 'Par').length, 1)
})

test('plan sin forma (ma8): la carrera y los motivos, con el rótulo del Plan A', () => {
  const [bloque] = formasEco([{ codigo: 'ma8-ref-plan', nombre: null, tipo: 'PLAN', texto: 'Psicología',
    opciones: ['Ayudar a otros'] }])
  assert.deepEqual(copia(bloque.plan), { rotulo: 'Tu Plan A', carrera: 'Psicología', motivos: ['Ayudar a otros'] })
})

test('proyecto (b5-1): carrera, institución, camino y los pasos en un solo bloque; la primera señal como elección', () => {
  const bloques = formasEco(ecosDe('b5-1', 'b5-1-seguridad'))
  assert.deepEqual(copia(bloques.map((b) => b.forma)), ['proyecto', 'eleccion'])
  const [proyecto, senal] = bloques
  assert.equal(proyecto.rotulo, 'Tu proyecto hoy')
  assert.ok(proyecto.institucion && proyecto.camino && proyecto.pasos.length === 1)
  assert.deepEqual(copia(senal), { forma: 'eleccion', valor: '2 de 5', origen: 'Tu primera señal' })
  // Sin primera señal, el eco no viene y no deja hueco.
  const sinSenal = ecosDe('b5-1', 'b5-1-seguridad').filter((e) => e.codigo !== 'b5-1-ref-check-in')
  assert.deepEqual(copia(formasEco(sinSenal).map((b) => b.forma)), ['proyecto'])
})

test('proyecto plegable: resumen siempre; tres pasos sin enlace; cinco se abren y se pliegan', () => {
  const pasos = (n, hechos) => ({ codigo: 'p', forma: 'pasos', hechos: ['Uno', 'Dos'].slice(0, hechos),
    pendientes: ['Tres', 'Cuatro', 'Cinco'].slice(0, n - hechos) })
  const base = { codigo: 'b5-1-ref-planes', nombre: 'Tu proyecto hoy', forma: 'proyecto', carrera: 'Administración' }
  const { EcoProyecto } = app.load(`${NODOS}/EcoProyecto.tsx`)
  const montar = (n, hechos) => app.mount(EcoProyecto, formasEco([base, pasos(n, hechos)])[0])
  let nodo = montar(3, 1)
  assert.equal(elementos(nodo.render(), (e) => e.type === 'li').length, 3)
  assert.equal(elementos(nodo.render(), (e) => e.type === 'button').length, 0)
  assert.ok(textos(nodo.render()).includes('1 hecho · 2 pendientes'))
  nodo = montar(5, 2)
  assert.equal(elementos(nodo.render(), (e) => e.type === 'li').length, 3)
  assert.ok(textos(nodo.render()).includes('2 hechos · 3 pendientes'))
  const boton = () => elementos(nodo.render(), (e) => e.type === 'button')[0]
  assert.ok(textos(boton()).includes('ver los 5 pasos'))
  boton().props.onClick()
  assert.equal(elementos(nodo.render(), (e) => e.type === 'li').length, 5)
  assert.ok(textos(boton()).includes('ver menos'))
  boton().props.onClick()
  assert.equal(elementos(nodo.render(), (e) => e.type === 'li').length, 3)
  assert.equal(resumenPasos([{ texto: 'a', hecho: true }]), '1 hecho · 0 pendientes')
})

test('«Hoy» (b5-3): dos planes (A con institución) y la seguridad debajo, con su origen', () => {
  const bloques = formasEco(ecosDe('b5-3', 'b5-3-cambio'))
  assert.deepEqual(copia(bloques.map((b) => b.forma)), ['hoy'])
  const [hoy] = bloques
  assert.deepEqual(copia(hoy.planes.map((p) => p.rotulo)), ['Tu Plan A', 'Tu Plan B'])
  assert.ok(hoy.planes[0].institucion)
  assert.equal(hoy.eleccion.origen, 'qué tan seguro/a te sientes de tu proyecto')
  const arbol = app.mount(app.load(`${NODOS}/EcosItem.tsx`).EcosItem, { ecos: ecosDe('b5-3', 'b5-3-cambio') }).render()
  assert.ok(textos(arbol).includes('Hoy'))
})

test('elección con su texto (b1-3) y texto (b3-4): entre «» y con su origen', () => {
  const contraste = formasEco([
    { codigo: 'b1-3-voz', nombre: 'Lo que te dicen', origen: 'ITEM', eleccion: ['Mi mamá'],
      texto: ['quiere que estudie algo que tenga trabajo seguro'] },
    { codigo: 'b1-3-mia', nombre: 'Lo que tú quieres', origen: 'ITEM', eleccion: ['Estudiar'] },
  ])
  assert.deepEqual(copia(contraste), [
    { forma: 'eleccion', valor: 'Mi mamá', texto: ['quiere que estudie algo que tenga trabajo seguro'],
      origen: 'Lo que te dicen' },
    { forma: 'eleccion', valor: 'Estudiar', origen: 'Lo que tú quieres' },
  ])
  const [quien] = formasEco([{ codigo: 'b3-4-necesito', nombre: 'Lo que necesitarías saber', origen: 'ITEM',
    texto: ['Necesitaría saber si hay trabajo fijo al terminar'] }])
  assert.equal(quien.forma, 'textos')
  const arbol = app.mount(app.load(`${NODOS}/EcosItem.tsx`).EcosItem, { ecos: [{ codigo: 'b3-4-necesito',
    nombre: 'Lo que necesitarías saber', origen: 'ITEM', texto: ['Necesitaría saber'] }] }).render()
  const [bloque] = elementos(arbol, (e) => e.type?.name === 'Textos')
  assert.deepEqual(copia(bloque.props.textos), [{ lineas: ['Necesitaría saber'], origen: 'Lo que necesitarías saber' }])
  // Un texto citado va entre «»; si ya llega con comillas, tal cual.
  const { citado } = app.load('src/features/activities/lib/formasEco.ts')
  assert.equal(citado('Necesitaría saber'), '«Necesitaría saber»')
  assert.equal(citado('«ya citado»'), '«ya citado»')
})

test('varios textos (ma3) van en un solo bloque, cada uno con su origen; un texto de dos líneas se ve en dos', () => {
  const bloques = formasEco([
    { codigo: 'ma3-ref-dia', nombre: 'tu día a los 23', tipo: 'TEXTO', texto: 'a / b', lineas: ['a', 'b'] },
    { codigo: 'ma3-ref-hito', nombre: 'lo que estarás haciendo dentro de un año', tipo: 'TEXTO', texto: 'c' },
  ])
  assert.deepEqual(copia(bloques), [{ forma: 'textos', textos: [
    { lineas: ['a', 'b'], origen: 'tu día a los 23' },
    { lineas: ['c'], origen: 'lo que estarás haciendo dentro de un año' }] }])
})

test('resultado de test (h1, h3): nombre, la línea que corresponde y las dimensiones, sin puntajes', () => {
  const [habilidades] = formasEco([{ codigo: 'h1-ref-resultado', nombre: 'Tu test de habilidades', tipo: 'RESULTADO',
    opciones: ['Empatía', 'Liderazgo'] }])
  assert.deepEqual(copia(habilidades), { forma: 'resultado', nombre: 'Tu test de habilidades',
    linea: 'Lo que salió más alto', dimensiones: ['Empatía', 'Liderazgo'] })
  const [intereses] = formasEco([{ codigo: 'h3-ref-resultado', nombre: 'Tu test de intereses', tipo: 'RESULTADO',
    opciones: ['Emprendedor', 'Convencional', 'Social'] }])
  assert.equal(intereses.linea, 'Tu código, en orden')
})

test('un eco que no viene no se muestra: sin hueco ni aviso', () => {
  assert.deepEqual(copia(formasEco([])), [])
  assert.deepEqual(copia(formasEco([{ codigo: 'h1-ref-resultado', nombre: 'Tu test', tipo: 'RESULTADO' },
    { codigo: 'x', tipo: 'TEXTO' }, { codigo: 'b4-1-ref-plan', forma: 'cabecera', motivos: [] }])), [])
  assert.equal(app.mount(app.load(`${NODOS}/EcosItem.tsx`).EcosItem, { ecos: [] }).render(), null)
})
