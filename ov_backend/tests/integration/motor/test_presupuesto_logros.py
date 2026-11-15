"""Ajuste logros: las insignias de `contenido` no agregan lecturas a las acciones y consultas que las reevalúan.

Cada medición corre el mismo recorrido en dos bases copiadas de la plantilla, una con una sola insignia (como hoy en
`ruta`, hay reglas de insignia: `GET logros` lee sus fechas en una consulta, haya una o veinticinco), y compara
las lecturas (SELECT y WITH). Las escrituras pueden crecer cuando una acción obtiene una insignia (su desbloqueo y su
notificación); las lecturas, no. DATO DE PRUEBA."""

from datetime import datetime

import pytest
from sqlalchemy import create_engine, delete, select

from soporte_acceso import ClienteConToken
from soporte_bases import copiar_plantilla
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_contenido import avanzar, completar
from soporte_llm import ClientePrueba
from soporte_planes import crear, guardar, por_que_lista
from soporte_ruta import FECHA, pedir

from app import models as m
from app.main import crear_aplicacion
from datos import contenido


PASOS = {'pasos': [{'tipo': 'conversar', 'texto': 'DATO DE PRUEBA: hablar con alguien de la carrera.'}]}
OBTENIDAS = ('R-b4-1', 'R-b4-5', 'R-b5-1')
# La base de comparación conserva una insignia sin evaluador.
CONSERVADA = 'R-ins-chispa'


def _lecturas(contador):
    tipos = contador.por_tipo
    return tipos.get('SELECT', 0) + tipos.get('WITH', 0)


def _cargas_de_hijas(contador):
    """Cuántas veces se leyeron las filas hijas de los planes (`cargar_hijas` es lo único que lee las dudas)."""
    return sum(1 for e in contador.ejecuciones if e.sentencia.lstrip().upper().startswith('SELECT')
               and 'FROM duda_tarjeta' in e.sentencia)


def _quitar_insignias(url):
    motor = create_engine(url)
    with motor.begin() as conexion:
        ids = list(conexion.scalars(select(m.ReglaDesbloqueo.id).where(
            m.ReglaDesbloqueo.codigo.like('R-ins-%'), m.ReglaDesbloqueo.codigo != CONSERVADA)))
        conexion.execute(delete(m.CondicionDesbloqueo).where(m.CondicionDesbloqueo.regla_id.in_(ids)))
        conexion.execute(delete(m.ReglaDesbloqueo).where(m.ReglaDesbloqueo.id.in_(ids)))
    motor.dispose()


@pytest.fixture
def aplicaciones(plantilla_contenido, tmp_path):
    """La aplicación de `contenido` con sus insignias y la misma con una sola (`CONSERVADA`)."""
    creadas = {}
    for nombre in ('con', 'sin'):
        url = copiar_plantilla(plantilla_contenido, tmp_path / f'{nombre}.db')
        if nombre == 'sin':
            _quitar_insignias(url)
        aplicacion = crear_aplicacion(url)
        aplicacion.state.cliente_llm = ClientePrueba()
        creadas[nombre] = aplicacion
    yield creadas
    for aplicacion in creadas.values():
        aplicacion.state.motor_bd.dispose()


def _obtener(aplicacion, reglas):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        ana = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        ya = set(sesion.scalars(select(m.Desbloqueo.regla_id).where(m.Desbloqueo.cuenta_id == ana.id)))
        for regla in sesion.scalars(select(m.ReglaDesbloqueo).where(m.ReglaDesbloqueo.codigo.in_(reglas))):
            if regla.id not in ya:
                sesion.add(m.Desbloqueo(cuenta_id=ana.id, regla_id=regla.id, visto=True,
                                        fecha_hora=datetime.fromisoformat(FECHA)))


def _recorrido(aplicacion):
    """Mide cada paso: {paso: (lecturas, cargas de hijas)}."""
    medidas = {}
    with ClienteConToken(aplicacion) as cliente:
        def medir(paso, metodo, ruta, datos=None):
            with ContadorConsultas(aplicacion.state.motor_bd) as contador:
                respuesta = cliente.request(metodo, ruta, json=datos)
            assert respuesta.status_code == 200, (paso, respuesta.text)
            medidas[paso] = (_lecturas(contador), _cargas_de_hijas(contador))
            return respuesta.json()

        completar(cliente, 'b0-1')
        medir('completar-actividad', 'POST', '/acciones/completar-actividad',
              {'cuenta': 'est-ana', 'actividad': 'b0-2', 'fecha_hora': FECHA})
        avanzar(cliente, 'b0-3', 'b1-4')

        vidas, _, _ = contenido.CONFIGURACION_BATALLAS['b1-5']
        respuestas = [{'pregunta': p[0], 'opcion': p[5]} for p in contenido.PREGUNTAS_BATALLA if p[1] == 'b1-5'][:vidas]
        medir('responder-batalla', 'POST', '/acciones/resolver-batalla',
              {'cuenta': 'est-ana', 'actividad': 'b1-5', 'fecha_hora': FECHA, 'respuestas': respuestas})
        medir('GET logros', 'GET', '/cuentas/est-ana/logros')
        # Las cuatro secciones de la tarjeta abiertas y dos planes; R-b4-1, R-b4-5 y R-b5-1 aún pendientes.
        for codigo in ('b3-2', 'b3-8', 'b4-5'):
            pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': codigo})
        for carrera in (PSICOLOGIA, PERIODISMO):
            crear(cliente, carrera)
        guardar(cliente, PSICOLOGIA, 'PASOS', PASOS)
        _obtener(aplicacion, ())
        medir('guardar-seccion pendientes', 'POST', '/acciones/planes/guardar-seccion',
              {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'seccion': 'POR_QUE', 'datos': por_que_lista()})
        # Con las tres reglas de planes del camino ya obtenidas, solo quedan pendientes las insignias de planes.
        _obtener(aplicacion, OBTENIDAS)
        medir('guardar-seccion', 'POST', '/acciones/planes/guardar-seccion',
              {'cuenta': 'est-ana', 'carrera': PERIODISMO, 'seccion': 'POR_QUE', 'datos': por_que_lista()})
        medir('medidores', 'POST', '/acciones/planes/medidores',
              {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'entusiasmo': 3})
        medir('paso-hecho', 'POST', '/acciones/planes/paso-hecho',
              {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1, 'hallazgo': 'DATO DE PRUEBA'})
        medir('ordenar', 'POST', '/acciones/planes/ordenar',
              {'cuenta': 'est-ana', 'carreras': [PERIODISMO, PSICOLOGIA]})
        medir('progreso con evaluador', 'GET', '/cuentas/est-ana/progreso/INSIGNIA/ins-plan-completo')
        medir('progreso sin evaluador', 'GET', '/cuentas/est-ana/progreso/INSIGNIA/ins-caso')
    return medidas


def test_las_insignias_no_agregan_lecturas(aplicaciones):
    con, sin = _recorrido(aplicaciones['con']), _recorrido(aplicaciones['sin'])
    for paso in ('completar-actividad', 'responder-batalla', 'GET logros', 'guardar-seccion pendientes'):
        assert con[paso][0] == sin[paso][0], (paso, con[paso], sin[paso])
    # Con varias reglas de planes pendientes, los planes se cargan una sola vez por evaluación.
    assert con['guardar-seccion pendientes'][1] == 1
    # Con las del camino obtenidas, las insignias de planes pendientes cuestan a lo más dos lecturas: los conteos de
    # eventos (hoy no se cargan, porque no queda ninguna regla de planes por reevaluar) y las tarjetas. Ningún plan
    # tiene sus cuatro secciones guardadas, así que no se cargan las hijas.
    for paso in ('guardar-seccion', 'medidores', 'paso-hecho', 'ordenar'):
        assert con[paso][0] <= sin[paso][0] + 2, (paso, con[paso], sin[paso])
        assert con[paso][1] == sin[paso][1] == 0, (paso, con[paso], sin[paso])
    # El progreso de una insignia con evaluador de planes lee a lo más las tarjetas además de lo de siempre.
    assert con['progreso con evaluador'][0] <= con['progreso sin evaluador'][0] + 1
    assert con['progreso con evaluador'][1] == 0
