"""Auditoría del panel: el número de consultas de cada ruta del panel no crece con los estudiantes del salón ni con
los elementos de cada estudiante (planes, dudas, pasos, complicaciones, señales, diario, cuestionarios con resultado,
registros respondidos). Patrón pocos frente a muchos: se cuenta cada ruta con el salón de `ruta` poblado, después de
sumar doce estudiantes con lo mismo y después de duplicar lo de cada estudiante; las tres cuentas son iguales. La
pestaña Respuestas con los registros de `contenido` (ecos y piezas) se mide en `test_panel_contexto_lectura.py`."""

from datetime import timedelta

import pytest
from sqlalchemy import select

from app import models as m
from app.models import TipoEventoUso
from soporte_acceso import token_de
from soporte_catalogo_ruta import ENFERMERIA, INST_PRIVADA, INST_UNI, PERIODISMO, PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_panel import (
    AHORA, complicacion, conocimiento, cuenta, evento, fijar_ahora, medicion, nuevo_estudiante, responder_autopercepcion,
    senales, tarjeta,
)
from soporte_retiro import ciclo
from soporte_ruta import avanzar, responder_registro

ESTUDIANTES_RUTA = ('est-ana', 'est-luis', 'est-mia', 'est-sol', 'est-teo')
EXTRAS = 12
BASE = '/cuentas/ori-carmen/panel'
PERFIL = f'{BASE}/estudiantes/est-ana'


# --- Datos de prueba -------------------------------------------------------------------------------------
# DATO DE PRUEBA: todo lo que siembran estas funciones.

def _copiar_intereses(sesion, origen, destino):
    """El resultado de intereses de `origen` (con sus dimensiones y coincidencias), copiado como vigente de `destino`."""
    fuente = sesion.scalar(select(m.ResultadoInstrumento).where(
        m.ResultadoInstrumento.cuenta_id == origen.id, m.ResultadoInstrumento.anulado_en.is_(None),
        m.ResultadoInstrumento.aplicacion_id == _aplicacion(sesion, 'APL-RIASEC')))
    copia = m.ResultadoInstrumento(cuenta_id=destino.id, aplicacion_id=fuente.aplicacion_id, calculado_en=AHORA,
                                   perfil_plano=fuente.perfil_plano)
    sesion.add(copia)
    sesion.flush()
    sesion.add_all(m.ResultadoDimension(resultado_id=copia.id, dimension_id=d.dimension_id, puntaje=d.puntaje,
                                        puntaje_maximo=d.puntaje_maximo) for d in sesion.scalars(
        select(m.ResultadoDimension).where(m.ResultadoDimension.resultado_id == fuente.id)))
    sesion.add_all(m.Coincidencia(resultado_id=copia.id, ocupacion_id=c.ocupacion_id, posicion=c.posicion,
                                  correlacion=c.correlacion) for c in sesion.scalars(
        select(m.Coincidencia).where(m.Coincidencia.resultado_id == fuente.id)))


def _aplicacion(sesion, codigo):
    return sesion.scalar(select(m.Aplicacion.id).where(m.Aplicacion.codigo == codigo))


def _destacadas(sesion, estudiante, aplicacion):
    """Un resultado de un cuestionario de dimensiones destacadas, con puntajes distintos por dimensión."""
    apl = _aplicacion(sesion, aplicacion)
    instrumento = sesion.scalar(select(m.Aplicacion.instrumento_id).where(m.Aplicacion.id == apl))
    fila = m.ResultadoInstrumento(cuenta_id=estudiante.id, aplicacion_id=apl, calculado_en=AHORA, perfil_plano=False)
    sesion.add(fila)
    sesion.flush()
    for orden, dimension in enumerate(sesion.scalars(select(m.Dimension).where(
            m.Dimension.instrumento_id == instrumento).order_by(m.Dimension.orden))):
        sesion.add(m.ResultadoDimension(resultado_id=fila.id, dimension_id=dimension.id, puntaje=float(orden % 5),
                                        puntaje_maximo=4.0))


def _opcion(sesion, lista, posicion=0):
    return sesion.scalars(select(m.OpcionLista.id).join(m.ListaOpciones).where(
        m.ListaOpciones.codigo == lista).order_by(m.OpcionLista.orden)).all()[posicion]


def _detalle_plan(sesion, plan, desde, cantidad):
    """`cantidad` dudas, pasos (el primero hecho, con hallazgo) y complicaciones más en el plan, desde `desde`."""
    tipo = _opcion(sesion, 'PASOS')
    for n in range(desde, desde + cantidad):
        sesion.add(m.DudaTarjeta(tarjeta_id=plan.id, numero=n, origen=m.OrigenDuda.PROPIA, texto=f'Duda {n}',
                                 estado=m.EstadoDuda.ABIERTA, creada_en=AHORA))
        hecho = n == 1
        sesion.add(m.PasoTarjeta(tarjeta_id=plan.id, numero=n, posicion=n, tipo_opcion_id=tipo, texto=f'Paso {n}',
                                 estado=m.EstadoPaso.HECHO if hecho else m.EstadoPaso.PENDIENTE,
                                 hallazgo='Hallazgo' if hecho else None, hecho_en=AHORA if hecho else None))
        complicacion(sesion, plan, otro=f'Complicación {n}', numero=n)


def _diario(sesion, estudiante, desde, cantidad):
    for n in range(desde, desde + cantidad):
        sesion.add(m.EntradaDiario(cuenta_id=estudiante.id, origen=m.OrigenEntrada.LIBRE, numero=n, numero_libre=n,
                                   texto='Entrada privada', fecha_hora=AHORA - timedelta(days=n)))


def _poblar(sesion, codigo, intereses_de):
    """Lo de cada estudiante: ingreso, apoderado que ingresó, señales, diario, partida y llegada respondidas, intereses,
    inteligencias y dos planes con conocimiento, dudas, pasos y complicaciones."""
    estudiante = cuenta(sesion, codigo)
    evento(sesion, codigo, TipoEventoUso.INGRESO, 1)
    if not sesion.scalar(select(m.VinculoFamiliar.id).where(m.VinculoFamiliar.estudiante_id == estudiante.id)):
        apoderado = m.Cuenta(codigo=f'apo-{codigo}', nombre=f'Apoderado de {codigo}', rol=m.Rol.APODERADO)
        sesion.add(apoderado)
        sesion.flush()
        sesion.add(m.VinculoFamiliar(codigo=f'VIN-{codigo}', estudiante_id=estudiante.id, apoderado_id=apoderado.id,
                                     parentesco='madre'))
        sesion.add(m.EventoUso(cuenta_id=apoderado.id, tipo=TipoEventoUso.INGRESO, fecha_hora=AHORA))
    senales(sesion, codigo, 2, 1, 2)
    _diario(sesion, estudiante, 1, 2)
    for actividad, por_item in (('t-partida', {1: 1, 2: 4}), ('t-llegada', {1: 4, 2: 1})):
        hecha = sesion.scalar(select(m.ProgresoActividad.id).join(m.Actividad).where(
            m.ProgresoActividad.cuenta_id == estudiante.id, m.Actividad.codigo == actividad))
        if hecha is None:  # el ciclo de intereses de est-ana ya pasó por la partida
            responder_autopercepcion(sesion, codigo, actividad, por_item)
    medicion(sesion, codigo, 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=10)
    medicion(sesion, codigo, 'APL-LLEGADA', {'AUTO-B': 'POR_TRABAJAR'})
    if estudiante.id != intereses_de.id:
        _copiar_intereses(sesion, intereses_de, estudiante)
    _destacadas(sesion, estudiante, 'APL-INTELIGENCIAS')
    plan_a = tarjeta(sesion, codigo, PSICOLOGIA, 1, INST_UNI)
    plan_a.idea_origen = m.OrigenIdea.FAMILIA
    conocimiento(sesion, plan_a, DIA_NORMAL='NO', CURSOS='NO', INGRESO='NO')
    _detalle_plan(sesion, plan_a, 1, 2)
    plan_b = tarjeta(sesion, codigo, PERIODISMO, 2, INST_PRIVADA)
    _detalle_plan(sesion, plan_b, 1, 1)
    sesion.add(m.Favorito(cuenta_id=estudiante.id, tipo=m.TipoFavorito.INSTITUCION, fecha_hora=AHORA,
                          id_referencia=sesion.scalar(select(m.Institucion.id).where(m.Institucion.codigo == INST_UNI))))


def _duplicar(sesion, codigo):
    """El doble de lo de cada estudiante: más señales, diario, dudas, pasos y complicaciones, un tercer plan y otro
    cuestionario con resultado."""
    estudiante = cuenta(sesion, codigo)
    for atras, nivel in enumerate((1, 2, 1, 3, 2, 1), start=10):
        sesion.add(m.CheckIn(cuenta_id=estudiante.id, fecha=AHORA.date() - timedelta(days=atras), nivel_seguridad=nivel))
    _diario(sesion, estudiante, 3, 4)
    planes = {t.prioridad: t for t in sesion.scalars(select(m.TarjetaCarrera).where(
        m.TarjetaCarrera.cuenta_id == estudiante.id, m.TarjetaCarrera.activa))}
    _detalle_plan(sesion, planes[1], 3, 4)
    _detalle_plan(sesion, planes[2], 2, 3)
    tercero = tarjeta(sesion, codigo, ENFERMERIA, 3)
    _detalle_plan(sesion, tercero, 1, 2)
    _destacadas(sesion, estudiante, 'APL-HABILIDADES')


@pytest.fixture
def escenario(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    ciclo(cliente, cuenta='est-ana')  # un resultado de intereses real (con coincidencias), que copian los demás
    sesion.expire_all()
    ana = cuenta(sesion, 'est-ana')
    for codigo in ESTUDIANTES_RUTA:
        _poblar(sesion, codigo, ana)
    sesion.commit()

    def mas_estudiantes():
        for i in range(EXTRAS):
            nuevo_estudiante(sesion, f'est-extra-{i}', f'Extra {i}')
            _poblar(sesion, f'est-extra-{i}', ana)
        sesion.commit()

    def mas_elementos():
        for codigo in (*ESTUDIANTES_RUTA, *(f'est-extra-{i}' for i in range(EXTRAS))):
            _duplicar(sesion, codigo)
        sesion.commit()

    return mas_estudiantes, mas_elementos


# --- Rutas -----------------------------------------------------------------------------------------------

def _notas(cliente):
    """Escribir, editar y borrar una nota (la orientadora firma su token, como en el perfil)."""
    cabeceras = {'Authorization': f'Bearer {token_de(cliente.app, "ori-carmen")}'}
    cuerpo = {'cuenta': 'ori-carmen', 'estudiante': 'est-ana'}
    nota = cliente.post('/acciones/escribir-nota', json={**cuerpo, 'texto': 'DATO DE PRUEBA'}, headers=cabeceras)
    assert nota.status_code == 200, nota.text
    numero = nota.json()['numero']
    for accion, extra in (('editar-nota', {'texto': 'DATO DE PRUEBA: editada'}), ('borrar-nota', {})):
        respuesta = cliente.post(f'/acciones/{accion}', json={**cuerpo, 'nota': numero, **extra}, headers=cabeceras)
        assert respuesta.status_code == 200, respuesta.text


RUTAS = {
    'seguimiento': f'{BASE}/seguimiento?salon=5A',
    'seguimiento todos': f'{BASE}/seguimiento',
    **{f'estudiantes {c}': f'{BASE}/estudiantes?salon=5A&conjunto={c}' + (f'&valor={v}' if v else '')
       for c, v in (('avisos', None), ('alerta', 'seguridad-baja'), ('test', 'LISTO'), ('tramo', 'SIN_EMPEZAR'),
                    ('detenidos', None), ('seguridad_baja', None), ('plan_fuera_test', None),
                    ('institucion', None))},
    'intereses': f'{BASE}/intereses?salon=5A',
    'areas': f'{BASE}/areas?salon=5A',
    'instituciones': f'{BASE}/instituciones?salon=5A',
    'lista-estudiantes': f'{BASE}/lista-estudiantes?salon=5A',
    'lista-estudiantes filtrada': f'{BASE}/lista-estudiantes?salon=5A&acceso=con_avisos&test=LISTO&orden=-tramo',
    'perfil': PERFIL,
    'tests': f'{PERFIL}/tests',
    'partida-llegada': f'{PERFIL}/tests/partida-llegada',
    'resultado intereses': f'{PERFIL}/tests/APL-RIASEC/resultado',
    'resultado inteligencias': f'{PERFIL}/tests/APL-INTELIGENCIAS/resultado',
    'planes': f'{PERFIL}/planes',
    'plan completo': f'{PERFIL}/planes/1',
    'respuestas': f'{PERFIL}/respuestas',
    'avance': f'{PERFIL}/avance',
    'notas': _notas,
}


def _medir(aplicacion, cliente, ruta):
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        if callable(ruta):
            ruta(cliente)
        else:
            respuesta = cliente.get(ruta)
            assert respuesta.status_code == 200, respuesta.text
    return contador


@pytest.mark.parametrize('nombre', list(RUTAS))
def test_las_consultas_no_crecen_con_los_estudiantes_ni_con_sus_elementos(nombre, escenario, aplicacion, cliente):
    ruta = RUTAS[nombre]
    if nombre == 'estudiantes institucion':
        ruta = f'{ruta}&valor={INST_UNI}'
    mas_estudiantes, mas_elementos = escenario
    pocos = _medir(aplicacion, cliente, ruta)
    mas_estudiantes()
    con_estudiantes = _medir(aplicacion, cliente, ruta)
    assert con_estudiantes.cantidad == pocos.cantidad, f'{nombre}: con {EXTRAS} estudiantes más\n' \
                                                       f'{con_estudiantes.diagnostico}'
    mas_elementos()
    con_elementos = _medir(aplicacion, cliente, ruta)
    assert con_elementos.cantidad == pocos.cantidad, f'{nombre}: con el doble de elementos\n{con_elementos.diagnostico}'


def test_respuestas_no_crecen_con_los_registros_respondidos(aplicacion, cliente, sesion):
    """Los registros de `ruta` respondidos de a uno: la pestaña y cada registro desplegado cuestan lo mismo."""
    fijar_ahora(aplicacion)
    avanzar(cliente, cuenta='est-ana')  # abre el camino
    registros = [f['actividad'] for f in cliente.get(f'{PERFIL}/respuestas').json()['registros']]
    respondidos, cuentas = [], []
    for actividad in registros:
        try:
            responder_registro(cliente, actividad, 'est-ana')
        except AssertionError:  # aún cerrado en `ruta` (pide una batalla o una vista)
            continue
        respondidos.append(actividad)
        cuentas.append(_medir(aplicacion, cliente, f'{PERFIL}/respuestas').cantidad)
    assert len(respondidos) >= 3, respondidos
    assert len(set(cuentas[1:])) == 1, cuentas
    detalle = {a: _medir(aplicacion, cliente, f'{PERFIL}/respuestas/{a}').cantidad for a in respondidos}
    assert len(set(detalle.values())) == 1, detalle
