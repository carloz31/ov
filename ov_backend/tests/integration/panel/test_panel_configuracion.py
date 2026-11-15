"""Ajuste panel-entrevistas-configuracion: la configuración del colegio de la orientadora (cuestionarios que ve el
apoderado y registros destacados), una sola para todos sus salones y fuera de la caché de definiciones.
DATO DE PRUEBA."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.core.definiciones import CacheDefiniciones, obtener_definiciones
from app.database import crear_motor_bd
from app.schemas.panel import ConfigurarColegioEntrada
from app.services.panel.configuracion import configurar_colegio, consultar_configuracion
from soporte_consultas import ContadorConsultas
from soporte_ruta import INTERESES, INTERESES_FINAL, avanzar, completar, pedir, reglas, responder, revelar

def configuracion(cliente, cuenta='ori-carmen', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/panel/configuracion', esperado=esperado)


def configurar(cliente, visibles=(), destacados=(), cuenta='ori-carmen', esperado=200):
    return pedir(cliente, 'POST', '/acciones/configurar-colegio',
                 {'cuenta': cuenta, 'visibles': list(visibles), 'destacados': list(destacados)}, esperado=esperado)


def visibles(datos):
    return {c['codigo']: c['visible'] for c in datos['cuestionarios']}


def destacados(datos):
    return [r['codigo'] for b in datos['registros'] for r in b['registros'] if r['destacado']]


def cuestionarios_del_hijo(cliente):
    hijo = next(e for e in pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')['estudiantes'] if e['codigo'] == 'est-ana')
    return [c['instrumento'] for c in hijo['cuestionarios']]


def dar_salon(sesion, salon='5B'):
    ori = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'ori-carmen'))
    salon_id = sesion.scalar(select(m.Salon.id).where(m.Salon.codigo == salon))
    sesion.add(m.OrientadoraSalon(orientadora_id=ori.id, salon_id=salon_id, es_principal=False))
    sesion.commit()


def test_la_lectura_trae_los_cuatro_cuestionarios_con_su_visibilidad_efectiva(cliente):
    datos = configuracion(cliente)
    assert [(c['codigo'], c['obligatorio'], c['visibilidad_apoderado'], c['visible']) for c in datos['cuestionarios']] == [
        ('TEST-PARTIDA-LLEGADA', True, 'NUNCA', False), ('TEST-RIASEC', True, 'SIEMPRE', True),
        ('TEST-HABILIDADES', False, 'SEGUN_COLEGIO', False), ('TEST-INTELIGENCIAS', False, 'SEGUN_COLEGIO', False)]
    assert all(c['nombre'] and c['descripcion'] for c in datos['cuestionarios'])
    registros = [r for b in datos['registros'] for r in b['registros']]
    assert {'t-expectativas', 't-valores'} <= {r['codigo'] for r in registros}
    assert all(r['titulo'] and isinstance(r['requerida'], bool) for r in registros)
    assert destacados(datos) == ['t-expectativas']
    assert 'colegio' not in str(datos)


def test_guardar_reemplaza_todo_y_otro_salon_ve_lo_mismo(cliente, sesion):
    nuevo = configurar(cliente, visibles=['TEST-INTELIGENCIAS'], destacados=['t-valores'])
    assert visibles(nuevo)['TEST-INTELIGENCIAS'] is True and destacados(nuevo) == ['t-valores']
    assert configuracion(cliente) == nuevo
    vacio = configurar(cliente)
    assert visibles(vacio)['TEST-INTELIGENCIAS'] is False and destacados(vacio) == []
    # Con un segundo salón, la configuración es la misma: es del colegio.
    configurar(cliente, visibles=['TEST-HABILIDADES'], destacados=['t-expectativas'])
    dar_salon(sesion)
    assert destacados(configuracion(cliente)) == ['t-expectativas']
    beto = pedir(cliente, 'GET', '/cuentas/ori-carmen/panel/estudiantes/est-beto/respuestas')
    assert [r['actividad'] for r in beto['registros'] if r['destacado']] == ['t-expectativas']


def test_rechaza_lo_que_no_se_configura_sin_escribir_nada(cliente):
    antes = configuracion(cliente)
    for instrumento in ('TEST-RIASEC', 'TEST-PARTIDA-LLEGADA', 'TEST-NO-EXISTE'):
        configurar(cliente, visibles=[instrumento], esperado=422)
    for actividad in ('t-inicio', 't-nula'):
        configurar(cliente, destacados=[actividad], esperado=422)
    assert configuracion(cliente) == antes


def test_otro_rol_recibe_404(cliente):
    for cuenta in ('est-ana', 'apo-rosa'):
        configuracion(cliente, cuenta, esperado=404)
        configurar(cliente, cuenta=cuenta, esperado=404)


def test_salones_de_mas_de_un_colegio_no_estan_soportados(cliente, sesion):
    otro = m.Colegio(codigo='col-otro', nombre='DATO DE PRUEBA')
    sesion.add(otro)
    sesion.flush()
    salon = m.Salon(codigo='5Z', promocion=2026, seccion='Z', colegio_id=otro.id)
    sesion.add(salon)
    sesion.commit()
    dar_salon(sesion, '5Z')
    assert configuracion(cliente, esperado=422)['detail']['mensaje'] == 'Sus salones pertenecen a más de un colegio'
    configurar(cliente, esperado=422)


def test_el_apoderado_ve_un_opcional_solo_mientras_esta_marcado(cliente):
    assert cuestionarios_del_hijo(cliente) == ['TEST-RIASEC']
    configurar(cliente, visibles=['TEST-INTELIGENCIAS'])
    assert cuestionarios_del_hijo(cliente) == ['TEST-INTELIGENCIAS', 'TEST-RIASEC']
    configurar(cliente)
    # Partida y llegada nunca; intereses siempre.
    assert cuestionarios_del_hijo(cliente) == ['TEST-RIASEC']


def test_el_perfil_filtra_por_los_destacados_y_sin_ellos_usa_los_requeridos(cliente):
    def resumen():
        return pedir(cliente, 'GET', '/cuentas/ori-carmen/panel/estudiantes/est-ana')['respuestas']
    assert (resumen()['destacados'], resumen()['total']) == (True, 1)
    configurar(cliente, destacados=['t-expectativas', 't-valores'])
    assert (resumen()['destacados'], resumen()['total']) == (True, 2)
    configurar(cliente)
    requeridos = pedir(cliente, 'GET', '/cuentas/ori-carmen/panel/estudiantes/est-ana/respuestas')
    assert resumen()['destacados'] is False and requeridos['hay_destacados'] is False


def test_t2_sigue_pidiendo_la_partida_y_el_de_intereses(cliente):
    configurar(cliente, visibles=['TEST-INTELIGENCIAS', 'TEST-HABILIDADES'])
    avanzar(cliente)
    assert 'R-T2' not in reglas(revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA'))
    for mision in (INTERESES, INTERESES_FINAL):
        responder(cliente, mision)
        completar(cliente, mision)
    assert 'R-T2' in reglas(revelar(cliente))


def test_el_guardado_se_ve_desde_otro_motor_sin_recargar_la_cache(aplicacion, cliente):
    """La prueba de que la configuración ya no está en `MODELOS_FIJOS`: otro motor (otro worker) con su caché de
    definiciones ya armada lee el cambio sin recargarla."""
    otro = crear_motor_bd(aplicacion.state.configuracion.url_bd)
    otro.cache_definiciones = CacheDefiniciones(otro)
    try:
        with Session(otro) as sesion:
            cache = obtener_definiciones(sesion)
            assert destacados(consultar_configuracion(sesion, 'ori-carmen').model_dump()) == ['t-expectativas']
        configurar(cliente, visibles=['TEST-HABILIDADES'], destacados=['t-valores'])
        with Session(otro) as sesion:
            assert obtener_definiciones(sesion) is cache
            datos = consultar_configuracion(sesion, 'ori-carmen').model_dump()
            assert destacados(datos) == ['t-valores'] and visibles(datos)['TEST-HABILIDADES'] is True
        # Y al revés: lo que guarda el otro motor lo ve la aplicación.
        with Session(otro) as sesion, sesion.begin():
            configurar_colegio(sesion, ConfigurarColegioEntrada(cuenta='ori-carmen', visibles=[], destacados=[]))
        assert destacados(configuracion(cliente)) == []
    finally:
        otro.dispose()


def test_la_lectura_hace_un_numero_fijo_de_consultas(aplicacion, cliente):
    configuracion(cliente)
    with ContadorConsultas(aplicacion.state.motor_bd) as pocas:
        configuracion(cliente)
    configurar(cliente, visibles=['TEST-INTELIGENCIAS', 'TEST-HABILIDADES'], destacados=['t-expectativas', 't-valores'])
    with ContadorConsultas(aplicacion.state.motor_bd) as muchas:
        configuracion(cliente)
    assert muchas.cantidad == pocas.cantidad <= 6, muchas.diagnostico
