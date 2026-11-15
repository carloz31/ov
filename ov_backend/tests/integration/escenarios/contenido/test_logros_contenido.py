"""Ajuste logros: insignias y niveles de `contenido` con las peticiones del front."""

from sqlalchemy import select

from soporte_catalogo_ruta import PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar, completar
from soporte_planes import crear
from soporte_ruta import pedir, reglas

from app import models as m


def _nivel(cliente):
    return pedir(cliente, 'GET', '/cuentas/est-ana/resumen')['nivel_actual']['numero']


def test_la_primera_chispa_llega_con_la_primera_mision(cliente_contenido):
    assert 'R-ins-chispa' in reglas(completar(cliente_contenido, 'b0-1'))


def test_la_primera_sombra_llega_con_la_primera_batalla_ganada(cliente_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b1-4')
    respuesta = completar(cliente_contenido, 'b1-5')
    assert {'R-ins-primera-sombra'} <= reglas(respuesta)


def test_el_plan_a_llega_al_crear_el_primer_plan(cliente_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b0-4')
    assert 'R-ins-plan-a' in reglas(crear(cliente_contenido, PSICOLOGIA))


def test_diez_carreras_distintas_y_una_repetida_no_suma(cliente_contenido, sesion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b0-4')
    carreras = sesion_contenido.scalars(select(m.Carrera.codigo).order_by(m.Carrera.codigo).limit(10)).all()

    def ver(carrera):
        return pedir(cliente_contenido, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': carrera})

    for carrera in carreras[:9]:
        assert 'R-ins-carreras' not in reglas(ver(carrera))
    assert 'R-ins-carreras' not in reglas(ver(carreras[0]))
    assert 'R-ins-carreras' in reglas(ver(carreras[9]))


def test_cinco_dias_de_check_in_y_dos_el_mismo_dia_no_suman(cliente_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b0-6')

    def check_in(dia, hora='10'):
        return pedir(cliente_contenido, 'POST', '/acciones/check-in', {
            'cuenta': 'est-ana', 'nivel_seguridad': 3, 'fecha_hora': f'2026-10-{dia:02d}T{hora}:00:00'})

    for dia in (8, 9, 10, 11):
        assert 'R-ins-brujula' not in reglas(check_in(dia))
    assert 'R-ins-brujula' not in reglas(check_in(11, hora='18'))
    assert 'R-ins-brujula' in reglas(check_in(12))


def test_cada_nivel_llega_al_cerrar_su_tramo(cliente_contenido, sesion_contenido):
    assert _nivel(cliente_contenido) == 1
    # Ver carreras ya no sube de nivel (en `ruta`, el nivel 3 pide tres carreras).
    avanzar(cliente_contenido, 'b0-1', 'b0-5')
    for codigo in sesion_contenido.scalars(select(m.Carrera.codigo).limit(3)):
        pedir(cliente_contenido, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': codigo})
    assert _nivel(cliente_contenido) == 1
    cierres = {'b0-6': ('R-NIV-2', 2), 'b2-5': ('R-NIV-3', 3), 'b3-10': ('R-NIV-4', 4), 'b5-5': ('R-NIV-5', 5)}
    nivel = 1
    for codigo in REQUERIDAS[REQUERIDAS.index('b0-6'):]:
        respuesta = _avanzar_uno(cliente_contenido, codigo)
        if codigo in cierres:
            regla, nivel = cierres[codigo]
            assert regla in reglas(respuesta), codigo
        else:
            assert not {r for r in reglas(respuesta) if r.startswith('R-NIV-')}, codigo
        assert _nivel(cliente_contenido) == nivel, codigo
    assert nivel == 5


def _avanzar_uno(cliente, codigo):
    """Lo que `avanzar` hace con una requerida, devolviendo la respuesta de completarla."""
    respuestas = []
    avanzar(cliente, codigo, codigo, completar_con=lambda c, a: respuestas.append(completar(c, a)))
    return respuestas[0]
