"""B08 · HU-017: batallas con reintento; solo la primera victoria abre el siguiente paso. DATO DE PRUEBA."""

from sqlalchemy import select

from app import models as m
from soporte_retiro import buscar, condicion, medir, regla
from soporte_ruta import avanzar, filas_base, pedir, reglas


def intento(victoria, aciertos, preguntas, cuenta='est-ana'):
    return {'cuenta': cuenta, 'actividad': 't-batalla', 'victoria': victoria, 'aciertos': aciertos,
            'preguntas': preguntas}


def tipos(respuesta):
    return [evento['tipo'] for evento in respuesta['eventos_registrados']]


def batalla(cliente, cuenta='est-ana'):
    fila, = pedir(cliente, 'GET', f'/cuentas/{cuenta}/batallas')
    return fila


def test_hu017_perder_reintentar_y_ganar_una_sola_vez(cliente, aplicacion):
    antes = filas_base(aplicacion)
    bloqueada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 3, 3), 409)
    # T1 todavía está cerrado: manda el mensaje de su bloque.
    assert bloqueada['detail']['mensaje'] == 'Termina el bloque de inicio para abrir el camino.'
    assert filas_base(aplicacion) == antes
    assert batalla(cliente)['estado'] == 'BLOQUEADA'
    avanzar(cliente, 't-cierre-inicio')
    assert batalla(cliente) == {'actividad': 't-batalla', 'titulo': 'Batalla de prueba', 'estado': 'DISPONIBLE',
                                'intentos': 0, 'superada': False, 'primer_intento': None}

    perdida = pedir(cliente, 'POST', '/acciones/resolver-batalla',
                    {**intento(False, 1, 4), 'fecha_hora': '2026-10-08T10:00:00'})
    assert perdida == {'eventos_registrados': [], 'nuevos_desbloqueos': []}
    fila = batalla(cliente)
    assert (fila['estado'], fila['intentos'], fila['superada']) == ('EN_CURSO', 1, False)
    assert fila['primer_intento'] == {'victoria': False, 'aciertos': 1, 'preguntas': 4,
                                      'fecha_hora': '2026-10-08T10:00:00'}
    pedir(cliente, 'POST', '/acciones/completar-actividad', {'cuenta': 'est-ana', 'actividad': 't-batalla'}, 409)

    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 3, 4))
    assert tipos(ganada) == ['COMPLETA_ACTIVIDAD', 'SUPERA_BATALLA']
    # B10: vencer ya no da insignia; t-explorar espera además una vista fuera del perfil.
    assert reglas(ganada) == set()
    repaso = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 4, 4))
    assert repaso == {'eventos_registrados': [], 'nuevos_desbloqueos': []}
    pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(False, 0, 2))

    fila = batalla(cliente)
    assert (fila['estado'], fila['intentos'], fila['superada']) == ('COMPLETADA', 4, True)
    assert fila['primer_intento']['victoria'] is False
    with aplicacion.state.fabrica_sesiones() as sesion:
        assert len(sesion.scalars(select(m.ResultadoBatalla)).all()) == 4
        assert sesion.scalar(select(m.ProgresoActividad.estado).join(m.Actividad).where(
            m.Actividad.codigo == 't-batalla')) == m.EstadoProgreso.COMPLETADA


def test_victoria_intacta_abre_la_insignia_oculta(cliente):
    avanzar(cliente, 't-cierre-inicio')
    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 3, 3))
    assert tipos(ganada) == ['COMPLETA_ACTIVIDAD', 'SUPERA_BATALLA', 'VENCE_DESAFIO_INTACTO']
    assert reglas(ganada) == {'R-t-ins-oculta'}
    assert batalla(cliente)['primer_intento']['victoria'] is True


def test_entradas_invalidas_no_dejan_filas(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    antes = filas_base(aplicacion)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 5, 4), 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(False, 0, 0), 422)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**intento(True, 1, 1), 'actividad': 't-inicio'}, 409)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**intento(True, 1, 1), 'actividad': 't-nula'}, 404)
    pedir(cliente, 'POST', '/acciones/resolver-batalla', intento(True, 1, 1, cuenta='nadie'), 404)
    assert filas_base(aplicacion) == antes
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/batallas') == []


def batallas_extra(sesion, cantidad):
    # DATO DE PRUEBA: batallas propias para medir pocas contra muchas.
    destino = buscar(sesion, m.Bloque, 'T1')
    inicio = buscar(sesion, m.Actividad, 't-inicio')
    for n in range(cantidad):
        actividad = m.Actividad(codigo=f'bat-extra-{n}', titulo='DATO DE PRUEBA', tipo='BATALLA', contenido='prueba',
                                orden=100 + n, bloque_id=destino.id, requerida=False)
        sesion.add(actividad)
        sesion.flush()
        regla(sesion, f'R-bat-extra-{n}', 'ACTIVIDAD', actividad.id,
              [condicion('COMPLETA_ACTIVIDAD', referencia=inicio.id)])


def test_presupuesto_de_consultas_de_batallas(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'batallas-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                batallas_extra(sesion, extra)
            avanzar(cliente, 't-cierre-inicio')
            cantidades = [medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/batallas')[1].cantidad]
            for victoria in (False, True):
                cantidades.append(medir(cliente, aplicacion, 'POST', '/acciones/resolver-batalla',
                                        intento(victoria, 2, 3), limite=12)[1].cantidad)
            cantidades.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/batallas')[1].cantidad)
            conteos.append(cantidades)
    assert conteos[0] == conteos[1]
