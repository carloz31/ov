"""Ajuste logros: los evaluadores de las insignias de `contenido` y el avance que devuelven. DATO DE PRUEBA."""

from sqlalchemy import select

from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO, PSICOLOGIA
from soporte_contenido import avanzar
from soporte_planes import crear, guardar, por_que_lista, realidad_lista
from soporte_ruta import FECHA, pedir

from app import models as m
from app.services.motor.reglas import evaluar_regla
from datos import contenido


TIPOS = {codigo: tipo for codigo, _bloque, _titulo, tipo, *_ in contenido.ACTIVIDADES}
BLOQUE = {codigo: bloque for codigo, bloque, *_ in contenido.ACTIVIDADES}
BATALLAS = [c for c, t in TIPOS.items() if t == 'BATALLA']
CASOS = [c for c, t in TIPOS.items() if t == 'CASO']
ESTUDIANTE = {codigo for codigo, *_, audiencia in contenido.BLOQUES if audiencia == 'ESTUDIANTE'} - {'LUMI'}
ACTIVIDADES_ISLA = [c for c, b in BLOQUE.items() if b in ESTUDIANTE]
CONVERSACIONES = [c[0] for c in contenido.CONVERSACIONES]
# Actividades que abren PLANES y las cuatro secciones de la tarjeta en `contenido`.
ABREN_PLANES = ('b0-4', 'b3-2', 'b3-8', 'b4-5')
CONOCIMIENTO = {'respuestas': {p: 'SI' for p in ('DIA_NORMAL', 'DONDE_TRABAJAR', 'CURSOS', 'INGRESO', 'CONOCE_ALGUIEN')}}
PASOS = {'pasos': [{'tipo': 'conversar', 'texto': 'DATO DE PRUEBA: hablar con alguien de la carrera.'}]}


def evento(cliente, tipo, referencia=None):
    return pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': tipo, 'referencia': referencia})


def evaluador(sesion, regla):
    """El resultado del evaluador de la regla, con una sesión que ya ve lo que escribió el cliente."""
    sesion.expire_all()
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    fila = sesion.scalar(select(m.ReglaDesbloqueo).where(m.ReglaDesbloqueo.codigo == regla))
    return evaluar_regla(sesion, cuenta, fila).evaluador_especial


def avance(sesion, regla):
    resultado = evaluador(sesion, regla)
    return resultado.cumplido, resultado.actual, resultado.requerido


def test_todas_las_batallas_cuenta_solo_las_completadas(cliente_contenido, sesion_contenido):
    assert avance(sesion_contenido, 'R-ins-sin-sombras') == (False, 0, len(BATALLAS))
    for codigo in BATALLAS[:-1]:
        evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', codigo)
    assert avance(sesion_contenido, 'R-ins-sin-sombras') == (False, len(BATALLAS) - 1, len(BATALLAS))
    evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', BATALLAS[-1])
    assert avance(sesion_contenido, 'R-ins-sin-sombras') == (True, len(BATALLAS), len(BATALLAS))


def test_todos_los_registros_y_casos_por_tipo(cliente_contenido, sesion_contenido):
    registros = [c for c, t in TIPOS.items() if t == 'REGISTRO' and BLOQUE[c] in ESTUDIANTE]
    assert avance(sesion_contenido, 'R-ins-bitacora') == (False, 0, len(registros))
    assert avance(sesion_contenido, 'R-ins-expediente') == (False, 0, len(CASOS))
    evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', registros[0])
    evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', CASOS[0])
    assert avance(sesion_contenido, 'R-ins-bitacora')[1] == 1
    assert avance(sesion_contenido, 'R-ins-expediente')[1] == 1


def test_la_isla_entera_no_cuenta_los_recuerdos_de_lumi(cliente_contenido, sesion_contenido):
    for codigo in contenido.RECUERDOS_LUMI:
        evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', codigo)
    assert avance(sesion_contenido, 'R-ins-isla') == (False, 0, len(ACTIVIDADES_ISLA))
    for codigo in ACTIVIDADES_ISLA:
        evento(cliente_contenido, 'COMPLETA_ACTIVIDAD', codigo)
    assert avance(sesion_contenido, 'R-ins-isla') == (True, len(ACTIVIDADES_ISLA), len(ACTIVIDADES_ISLA))


def test_una_batalla_perdida_no_cuenta(cliente_contenido, sesion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b1-4')
    _, destellos, _ = contenido.CONFIGURACION_BATALLAS['b1-5']
    pool = [p for p in contenido.PREGUNTAS_BATALLA if p[1] == 'b1-5']
    respuestas = [{'pregunta': p[0], 'opcion': (p[5] + 1) % len(p[4])} for p in pool[:destellos]]
    respuesta = pedir(cliente_contenido, 'POST', '/acciones/resolver-batalla', {
        'cuenta': 'est-ana', 'actividad': 'b1-5', 'fecha_hora': FECHA, 'respuestas': respuestas})
    assert respuesta['victoria'] is False
    assert avance(sesion_contenido, 'R-ins-sin-sombras')[1] == 0


def test_un_caso_fallido_no_cuenta(cliente_contenido, sesion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b1-3')
    respuesta = pedir(cliente_contenido, 'POST', '/acciones/resolver-caso', {
        'cuenta': 'est-ana', 'actividad': 'c1', 'puntaje': 0, 'ocupaciones': [], 'fecha_hora': FECHA})
    assert not any(e['tipo'] == 'COMPLETA_ACTIVIDAD' for e in respuesta['eventos_registrados'])
    assert avance(sesion_contenido, 'R-ins-expediente') == (False, 0, len(CASOS))


def test_todas_las_conversaciones(cliente_contenido, sesion_contenido):
    assert avance(sesion_contenido, 'R-ins-sobremesa') == (False, 0, len(CONVERSACIONES))
    for codigo in CONVERSACIONES[:-1]:
        evento(cliente_contenido, 'COMPLETA_CONVERSACION', codigo)
    assert avance(sesion_contenido, 'R-ins-sobremesa')[:2] == (False, len(CONVERSACIONES) - 1)
    evento(cliente_contenido, 'COMPLETA_CONVERSACION', CONVERSACIONES[-1])
    assert avance(sesion_contenido, 'R-ins-sobremesa') == (True, len(CONVERSACIONES), len(CONVERSACIONES))


def _institucion(sesion, carrera):
    return sesion.scalar(select(m.Institucion.codigo).join(
        m.InstitucionCarrera, m.InstitucionCarrera.institucion_id == m.Institucion.id).join(
        m.Carrera, m.Carrera.id == m.InstitucionCarrera.carrera_id).where(m.Carrera.codigo == carrera).limit(1))


def _abrir_planes(cliente):
    for codigo in ABREN_PLANES:
        evento(cliente, 'COMPLETA_ACTIVIDAD', codigo)


def _plan_completo(cliente, sesion, carrera, crearlo=True):
    if crearlo:
        crear(cliente, carrera)
    guardar(cliente, carrera, 'POR_QUE', por_que_lista())
    guardar(cliente, carrera, 'CONOCIMIENTO', CONOCIMIENTO)
    guardar(cliente, carrera, 'REALIDAD', realidad_lista(_institucion(sesion, carrera)))
    return guardar(cliente, carrera, 'PASOS', PASOS)


def test_planes_completos_con_uno_y_con_tres(cliente_contenido, sesion_contenido):
    _abrir_planes(cliente_contenido)
    crear(cliente_contenido, PSICOLOGIA)
    assert avance(sesion_contenido, 'R-ins-plan-completo') == (False, 0, 1)
    respuesta = _plan_completo(cliente_contenido, sesion_contenido, PSICOLOGIA, crearlo=False)
    assert 'ins-plan-completo' in {d['objetivo']['codigo'] for d in respuesta['nuevos_desbloqueos']}
    assert avance(sesion_contenido, 'R-ins-plan-completo') == (True, 1, 1)
    # Con uno solo guardado entero, «tres planes» no alcanza y no hay avance que mostrar.
    assert evaluador(sesion_contenido, 'R-ins-planes-completos').cumplido is False
    for carrera in (PERIODISMO, ENFERMERIA):
        _plan_completo(cliente_contenido, sesion_contenido, carrera)
    assert avance(sesion_contenido, 'R-ins-planes-completos') == (True, 3, 3)


def test_un_plan_eliminado_no_cuenta(cliente_contenido, sesion_contenido):
    _abrir_planes(cliente_contenido)
    _plan_completo(cliente_contenido, sesion_contenido, PSICOLOGIA)
    pedir(cliente_contenido, 'POST', '/acciones/planes/eliminar', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA})
    assert avance(sesion_contenido, 'R-ins-plan-completo') == (False, 0, 1)


def test_el_progreso_de_una_insignia_visible_trae_el_avance(cliente_contenido):
    progreso = pedir(cliente_contenido, 'GET', '/cuentas/est-ana/progreso/INSIGNIA/ins-sin-sombras')
    regla, = progreso['reglas']
    assert regla['evaluador_especial'] == {
        'nombre': 'todas_las_batallas', 'cumplido': False, 'actual': 0, 'requerido': len(BATALLAS)}
