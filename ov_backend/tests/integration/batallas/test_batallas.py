"""B08 · HU-017: batallas con reintento; solo la primera victoria abre el siguiente paso. F04b: las preguntas
salen del pool del servidor y el intento guarda sus respuestas. F04c: el servidor decide la victoria con las
vidas y los destellos de la batalla. DATO DE PRUEBA."""

from collections import Counter

from sqlalchemy import select

from app import models as m
from app.services import batallas as servicio_batallas
from datos.ruta import PREGUNTAS_BATALLA
from soporte_retiro import buscar, condicion, medir, regla
from soporte_ruta import avanzar, filas_base, pedir, reglas, respuestas_batalla

POOL = {codigo: (ficha, opciones, correcta) for codigo, _, ficha, _, opciones, correcta, _ in PREGUNTAS_BATALLA}
FICHAS = [{'codigo': 't-ficha', 'titulo': 'Ficha de prueba', 'estado': 'DISPONIBLE'},
          {'codigo': 't-ficha-2', 'titulo': 'Segunda ficha de prueba', 'estado': 'DISPONIBLE'}]


def intento(victoria, otros=0, cuenta='est-ana'):
    return {'cuenta': cuenta, 'actividad': 't-batalla', 'respuestas': respuestas_batalla(victoria, otros)}


def resultado(respuesta):
    return {clave: respuesta[clave] for clave in ('victoria', 'practica', 'aciertos', 'preguntas', 'destellos_restantes')}


def tipos(respuesta):
    return [evento['tipo'] for evento in respuesta['eventos_registrados']]


def batalla(cliente, cuenta='est-ana'):
    fila, = pedir(cliente, 'GET', f'/cuentas/{cuenta}/batallas')
    return fila


def test_hu017_perder_reintentar_y_ganar_una_sola_vez(cliente, aplicacion):
    antes = filas_base(aplicacion)
    bloqueada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True), 409)
    # T1 todavía está cerrado: manda el mensaje de su bloque.
    assert bloqueada['detail']['mensaje'] == 'Termina el bloque de inicio para abrir el camino.'
    assert filas_base(aplicacion) == antes
    assert batalla(cliente)['estado'] == 'BLOQUEADA'
    avanzar(cliente, 't-cierre-inicio')
    assert batalla(cliente) == {'actividad': 't-batalla', 'titulo': 'Batalla de prueba', 'estado': 'DISPONIBLE',
                                'intentos': 0, 'superada': False, 'primer_intento': None,
                                'preguntas_por_intento': 7, 'vidas_enemigo': 5, 'destellos': 3, 'fichas': FICHAS}

    # Un acierto y tres errores: el tercer error agota los destellos.
    perdida = pedir(cliente, 'POST', '/acciones/resolver-batalla',
                    {**intento(False, 1), 'fecha_hora': '2026-10-08T10:00:00'})
    assert perdida == {'eventos_registrados': [], 'nuevos_desbloqueos': [], 'victoria': False, 'practica': False,
                       'aciertos': 1, 'preguntas': 4, 'destellos_restantes': 0}
    fila = batalla(cliente)
    assert (fila['estado'], fila['intentos'], fila['superada']) == ('EN_CURSO', 1, False)
    # Aciertos y preguntas los cuenta el servidor a partir de las respuestas.
    assert fila['primer_intento'] == {'victoria': False, 'aciertos': 1, 'preguntas': 4,
                                      'fecha_hora': '2026-10-08T10:00:00'}
    pedir(cliente, 'POST', '/acciones/completar-actividad', {'cuenta': 'est-ana', 'actividad': 't-batalla'}, 409)

    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 1))
    assert tipos(ganada) == ['COMPLETA_ACTIVIDAD', 'SUPERA_BATALLA']
    assert resultado(ganada) == {'victoria': True, 'practica': False, 'aciertos': 5, 'preguntas': 6,
                                 'destellos_restantes': 2}
    # B10: vencer ya no da insignia; t-explorar espera además una vista fuera del perfil.
    assert reglas(ganada) == set()
    repaso = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True))
    assert (repaso['eventos_registrados'], repaso['nuevos_desbloqueos']) == ([], [])
    assert (repaso['victoria'], repaso['practica']) == (True, True)
    derrota = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(False))
    assert (derrota['victoria'], derrota['practica'], derrota['preguntas']) == (False, True, 3)

    fila = batalla(cliente)
    assert (fila['estado'], fila['intentos'], fila['superada']) == ('COMPLETADA', 4, True)
    assert fila['primer_intento']['victoria'] is False
    with aplicacion.state.fabrica_sesiones() as sesion:
        assert len(sesion.scalars(select(m.ResultadoBatalla)).all()) == 4
        assert sesion.scalar(select(m.ProgresoActividad.estado).join(m.Actividad).where(
            m.Actividad.codigo == 't-batalla')) == m.EstadoProgreso.COMPLETADA
        # Cada intento guarda sus respuestas: 4 + 6 + 5 + 3, con los aciertos marcados.
        guardadas = sesion.scalars(select(m.RespuestaBatalla)).all()
        assert len(guardadas) == 18 and sum(r.correcta for r in guardadas) == 1 + 5 + 5 + 0


def test_victoria_intacta_abre_la_insignia_oculta(cliente):
    avanzar(cliente, 't-cierre-inicio')
    # Cinco aciertos seguidos: vence con todos los destellos.
    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True))
    assert tipos(ganada) == ['COMPLETA_ACTIVIDAD', 'SUPERA_BATALLA', 'VENCE_DESAFIO_INTACTO']
    assert ganada['destellos_restantes'] == 3
    assert reglas(ganada) == {'R-t-ins-oculta'}
    assert batalla(cliente)['primer_intento']['victoria'] is True


def test_entradas_invalidas_no_dejan_filas(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    antes = filas_base(aplicacion)
    base = intento(True, 1)
    primera = base['respuestas'][0]
    # El intento debe terminar justo en la última respuesta: ni incompleto ni con respuestas de más.
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'respuestas': base['respuestas'][:-1]}, 422)
    sexta = {'pregunta': PREGUNTAS_BATALLA[5][0], 'opcion': PREGUNTAS_BATALLA[5][5]}
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'respuestas': respuestas_batalla(True) + [sexta]}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'respuestas': []}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'respuestas': [primera, primera]}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla',
          {**base, 'respuestas': [{'pregunta': 'ajena', 'opcion': 0}]}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla',
          {**base, 'respuestas': [{**primera, 'opcion': 4}]}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'respuestas': [{**primera, 'opcion': -1}]}, 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'actividad': 't-inicio'}, 409)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**base, 'actividad': 't-nula'}, 404)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, cuenta='nadie'), 404)
    assert filas_base(aplicacion) == antes
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/batallas') == []


def test_preguntas_de_un_intento_al_azar_con_opciones_mezcladas(cliente, aplicacion):
    bloqueada = cliente.get('/cuentas/est-ana/batallas/t-batalla/preguntas')
    assert bloqueada.status_code == 409
    assert bloqueada.json()['detail']['mensaje'] == 'Termina el bloque de inicio para abrir el camino.'
    avanzar(cliente, 't-cierre-inicio')
    antes = filas_base(aplicacion)
    servicio_batallas.azar.seed(7)
    vistas = set()
    for _ in range(6):
        preguntas = pedir(cliente, 'GET', '/cuentas/est-ana/batallas/t-batalla/preguntas')
        assert len(preguntas) == 7 and len({p['codigo'] for p in preguntas}) == 7
        for pregunta in preguntas:
            ficha, opciones, correcta = POOL[pregunta['codigo']]
            assert pregunta['ficha']['codigo'] == ficha
            # Mezcladas, pero cada opción conserva su índice y la correcta es la del pool.
            assert sorted(o['indice'] for o in pregunta['opciones']) == list(range(len(opciones)))
            assert all(opciones[o['indice']] == o['texto'] for o in pregunta['opciones'])
            assert pregunta['correcta'] == correcta and pregunta['explicacion']
        vistas |= {p['codigo'] for p in preguntas}
    # En varios intentos sale más del pool que un solo intento; la lectura no escribe nada.
    assert len(vistas) > 7
    assert filas_base(aplicacion) == antes
    assert cliente.get('/cuentas/est-ana/batallas/t-inicio/preguntas').status_code == 404
    assert cliente.get('/cuentas/est-ana/batallas/t-nula/preguntas').status_code == 404


def test_las_fichas_de_la_batalla_salen_de_sus_preguntas():
    assert Counter(ficha for ficha, _, _ in POOL.values()) == {'t-ficha': 7, 't-ficha-2': 7}


def batallas_extra(sesion, cantidad):
    # DATO DE PRUEBA: batallas propias, con una pregunta cada una, para medir pocas contra muchas.
    destino = buscar(sesion, m.Bloque, 'T1')
    inicio = buscar(sesion, m.Actividad, 't-inicio')
    ficha = buscar(sesion, m.Ficha, 't-ficha')
    for n in range(cantidad):
        actividad = m.Actividad(codigo=f'bat-extra-{n}', titulo='DATO DE PRUEBA', tipo='BATALLA', contenido='prueba',
                                orden=100 + n, bloque_id=destino.id, requerida=False, preguntas_por_intento=1,
                                vidas_enemigo=1, destellos=1)
        sesion.add(actividad)
        sesion.flush()
        sesion.add(m.PreguntaBatalla(codigo=f'bat-extra-{n}-p1', actividad_id=actividad.id, ficha_id=ficha.id,
                                     enunciado='DATO DE PRUEBA', opciones=['a', 'b', 'c'], correcta=0,
                                     explicacion='DATO DE PRUEBA'))
        regla(sesion, f'R-bat-extra-{n}', 'ACTIVIDAD', actividad.id,
              [condicion('COMPLETA_ACTIVIDAD', referencia=inicio.id)])


def test_presupuesto_de_consultas_de_batallas(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'batallas-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                batallas_extra(sesion, extra)
            avanzar(cliente, 't-cierre-inicio')
            cantidades = [medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/batallas')[1].cantidad,
                          medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/batallas/t-batalla/preguntas')[1].cantidad]
            for victoria in (False, True):
                cantidades.append(medir(cliente, aplicacion, 'POST', '/acciones/resolver-batalla',
                                        intento(victoria, 2), limite=14)[1].cantidad)
            cantidades.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/batallas')[1].cantidad)
            conteos.append(cantidades)
    assert conteos[0] == conteos[1]
