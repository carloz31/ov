"""Ajuste desbloqueos: las misiones que piden la carta, un caso o el guion no suman consultas.

Los límites son los medidos antes del ajuste (est-ana sobre `contenido`). La única subida aceptada es `guardar-guion`
la primera vez que deja el guion listo con `b3-2` pendiente: el evento tiene una regla que evaluar y el motor carga
los conteos de la cuenta, una sola consulta por petición (antes Investigaciones se abría después de `b3-2`).
"""

from soporte_consultas import ContadorConsultas
from soporte_contenido import accion, avanzar, completar
from soporte_ruta import pedir

from app.core.definiciones import obtener_definiciones
from app.models import TipoEventoUso

PIENSO = {'familia': '524', 'dia': 'Creo que revisa instalaciones.', 'necesita': 'Creo que necesita estudiar.',
          'duda': '¿Es peligroso trabajar con electricidad?'}
GUION = {'preguntas': [{'origen': 'PROPIA', 'texto': PIENSO['duda']}], 'descartadas': [], 'terminar': True}


def medir(aplicacion, hacer):
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        hacer()
    return contador.cantidad


def test_las_acciones_de_los_desbloqueos_no_suman_consultas(cliente_contenido, aplicacion_contenido):
    c, a = cliente_contenido, aplicacion_contenido
    avanzar(c, 'b0-1', 'b1-2')
    medidas = {'completar b1-3': medir(a, lambda: completar(c, 'b1-3')),
               'GET actividades': medir(a, lambda: pedir(c, 'GET', '/cuentas/est-ana/actividades')),
               'escribir-carta': medir(a, lambda: accion(c, 'escribir-carta', {'texto': 'Carta'}))}
    avanzar(c, 'b1-4', 'b1-6')
    medidas['resolver-caso'] = medir(a, lambda: accion(c, 'resolver-caso', {'actividad': 'c1', 'puntaje': 8}))
    medidas['completar b1-7'] = medir(a, lambda: completar(c, 'b1-7'))
    completar(c, 'investigador')
    medidas['guardar-lo-que-pienso'] = medir(a, lambda: accion(c, 'guardar-lo-que-pienso', PIENSO))
    medidas['guardar-guion con b3-2 pendiente'] = medir(a, lambda: accion(c, 'guardar-guion', GUION))
    accion(c, 'cancelar-investigacion', {})
    avanzar(c, 'b2-3', 'b3-1')
    accion(c, 'guardar-lo-que-pienso', PIENSO)
    medidas['guardar-guion'] = medir(a, lambda: accion(c, 'guardar-guion', GUION))
    limites = {'completar b1-3': 87, 'GET actividades': 6, 'escribir-carta': 9, 'resolver-caso': 13,
               'completar b1-7': 76, 'guardar-lo-que-pienso': 5, 'guardar-guion con b3-2 pendiente': 9,
               'guardar-guion': 8}
    assert all(medidas[accion_] <= limite for accion_, limite in limites.items()), medidas


def test_las_reglas_nuevas_solo_se_evaluan_con_los_eventos_de_sus_condiciones(sesion_contenido):
    """Pendientes por mucho tiempo, no son candidatas en acciones frecuentes (plan, catálogo, diario, check-in)."""
    indice = obtener_definiciones(sesion_contenido).reglas_evento
    esperadas = {'R-b1-4': {TipoEventoUso.COMPLETA_ACTIVIDAD, TipoEventoUso.ESCRIBE_CARTA},
                 'R-b1-7': {TipoEventoUso.COMPLETA_ACTIVIDAD, TipoEventoUso.SUPERA_CASO},
                 'R-b3-2': {TipoEventoUso.COMPLETA_ACTIVIDAD, TipoEventoUso.TERMINA_GUION}}
    for codigo, tipos in esperadas.items():
        assert {tipo for tipo, reglas in indice.items() if any(r.codigo == codigo for r in reglas)} == tipos
