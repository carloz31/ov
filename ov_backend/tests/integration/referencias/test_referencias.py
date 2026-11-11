"""HU-009 y RNF-20: referencias resueltas por cuenta: ELECCION y TEXTO (B05), RESULTADO y COINCIDENCIAS (B06).

Los textos son DATO DE PRUEBA. Ajuste registros llm (lote 2): siempre se lee el intento vigente; la entrega provisional
no deja texto citable, así que un TEXTO citable se escribe directamente en el intento vigente (`citar`).
"""

from datetime import datetime

import pytest
from sqlalchemy import select

from app import models as m
from app.models.enums import EstadoRespuestaRegistro
from app.services.registro.acciones import guardar_intento
from soporte_datos_ports import agregar_ocupaciones
from soporte_retiro import ciclo, medir, preparar_ultimo, reiniciar, resultado
from soporte_ruta import (FECHA, INTERESES_FINAL, actividades, avanzar, completar, pedir, responder_item, revelar,
                          terminar)


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
AMPLIADO = 'DATO DE PRUEBA: ahora cuento un ejemplo concreto y explico por qué lo creo.'
OPCIONES = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}


def entregar(cliente, cuenta='est-ana', opciones=None):
    avanzar(cliente, 't-cierre-inicio', cuenta)
    # Ajuste registros llm (lote 3): ítem por ítem y terminar.
    for item, elegidas in {**OPCIONES, **(opciones or {})}.items():
        responder_item(cliente, 't-expectativas', item, elegidas, ADECUADO, cuenta)
    return terminar(cliente, 't-expectativas', cuenta)


def citar(aplicacion, *lineas, cuenta='est-ana', item='t-exp-espera', **columnas):
    """DATO DE PRUEBA: un intento vigente nuevo del ítem entregado, con texto citable, como lo dejaría el LLM."""
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        vigente = sesion.scalar(select(m.RespuestaRegistro).join(
            m.ProgresoActividad, m.ProgresoActividad.id == m.RespuestaRegistro.progreso_id).join(
            m.Cuenta, m.Cuenta.id == m.ProgresoActividad.cuenta_id).join(
            m.ItemRegistro, m.ItemRegistro.id == m.RespuestaRegistro.item_registro_id).where(
            m.Cuenta.codigo == cuenta, m.ItemRegistro.codigo == item, m.RespuestaRegistro.vigente))
        guardar_intento(sesion, vigente.progreso_id, vigente.item_registro_id, dict(
            opciones_elegidas=vigente.opciones_elegidas, primera_respuesta=' '.join(lineas),
            estado=EstadoRespuestaRegistro.CERRADO, tipo_final='propio', texto_citable=list(lineas),
            **columnas), datetime(2026, 10, 7, 11))


def referencias(cliente, cuenta='est-ana', actividad='t-eco', esperado=200):
    datos = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/referencias', esperado=esperado)
    return datos if esperado != 200 else {r['codigo']: r for r in datos['referencias']}


def estados(cliente, cuenta='est-ana'):
    return {codigo: r['estado'] for codigo, r in referencias(cliente, cuenta).items()}


def agregar_referencias(aplicacion, *filas):
    """DATO DE PRUEBA: referencias TEXTO extra de `t-eco`, para ítems que la ruta no cita."""
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        eco = sesion.scalar(select(m.Actividad.id).where(m.Actividad.codigo == 't-eco'))
        items = dict(sesion.execute(select(m.ItemRegistro.codigo, m.ItemRegistro.id)).all())
        sesion.add_all(m.Referencia(codigo=codigo, tipo=m.TipoReferencia.TEXTO, actividad_id=eco,
                                    item_registro_id=items[item]) for codigo, item in filas)


# --- Sin dato -------------------------------------------------------------------------------

def test_sin_respuesta_no_hay_dato(cliente):
    resueltas = referencias(cliente)
    assert {c: r['estado'] for c, r in resueltas.items()} == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'SIN_DATO'}
    assert all(set(r) == {'codigo', 'tipo', 'estado', 'actividad'} for r in resueltas.values())


# --- TEXTO ----------------------------------------------------------------------------------

def test_se_cita_el_texto_citable_del_intento_vigente(cliente, aplicacion):
    entregar(cliente)
    citar(aplicacion, ADECUADO)
    citar(aplicacion, AMPLIADO, 'DATO DE PRUEBA: segunda línea.')
    assert referencias(cliente)['t-ref-espera'] == {
        'codigo': 't-ref-espera', 'tipo': 'TEXTO', 'estado': 'DISPONIBLE', 'actividad': 't-expectativas',
        'texto': f'{AMPLIADO} DATO DE PRUEBA: segunda línea.'}


# --- ELECCION -------------------------------------------------------------------------------

def test_eleccion_cita_lo_elegido_con_su_texto_y_la_opcion_otra(cliente):
    otra = {'codigo': 'OTRA-1', 'texto': 'DATO DE PRUEBA: trabajar en el taller familiar'}
    entregar(cliente, opciones={'t-exp-ruta': [{'codigo': 'UNIVERSIDAD'}, otra]})
    assert referencias(cliente)['t-ref-rutas'] == {
        'codigo': 't-ref-rutas', 'tipo': 'ELECCION', 'estado': 'DISPONIBLE', 'actividad': 't-expectativas',
        'opciones': [{'codigo': 'UNIVERSIDAD', 'texto': 'Estudiar en una universidad'}, otra]}


# --- Actividad de origen (F02) -------------------------------------------------------------

def test_eleccion_y_texto_nombran_su_actividad_en_todo_estado(cliente):
    def actividades():
        return {c: r.get('actividad') for c, r in referencias(cliente).items()}
    origen = {'t-ref-espera': 't-expectativas', 't-ref-rutas': 't-expectativas'}
    assert actividades() == origen  # SIN_DATO
    entregar(cliente)
    # Entregada sin texto citable: el TEXTO sigue sin dato y la ELECCION ya está disponible.
    assert estados(cliente) == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'DISPONIBLE'}
    assert actividades() == origen


def test_otros_tipos_no_llevan_actividad(cliente):
    for actividad in ('t-contraste', 't-comparar', 't-proyecto', 't-lee-cuestionario'):
        assert all('actividad' not in r for r in referencias(cliente, actividad=actividad).values())


# --- Aislamiento ----------------------------------------------------------------------------

def test_nunca_hay_datos_de_otra_cuenta(cliente, aplicacion):
    entregar(cliente)
    citar(aplicacion, ADECUADO)
    assert estados(cliente)['t-ref-espera'] == 'DISPONIBLE'
    for cuenta in ('est-luis', 'est-beto'):
        assert estados(cliente, cuenta) == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'SIN_DATO'}
    entregar(cliente, 'est-luis')
    citar(aplicacion, 'DATO DE PRUEBA de Luis', cuenta='est-luis')
    assert referencias(cliente, 'est-luis')['t-ref-espera']['texto'] == 'DATO DE PRUEBA de Luis'
    assert referencias(cliente)['t-ref-espera']['texto'] == ADECUADO


@pytest.mark.parametrize(('cuenta', 'actividad'), [
    ('apo-rosa', 't-eco'), ('ori-carmen', 't-eco'), ('est-nadie', 't-eco'),
    ('est-ana', 't-apo-1'), ('est-ana', 't-nada')])
def test_cuenta_o_actividad_ajena_responde_404(cliente, cuenta, actividad):
    referencias(cliente, cuenta, actividad, esperado=404)


def test_actividad_sin_referencias_devuelve_lista_vacia(cliente):
    assert referencias(cliente, actividad='t-inicio') == {}


def test_nunca_devuelve_la_clasificacion(cliente, aplicacion):
    entregar(cliente)
    citar(aplicacion, ADECUADO, primera_tipo='propio', conjunto_tipo='propio')
    texto = str(pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias'))
    assert not any(clave in texto for clave in ('tipo_final', 'primera_tipo', 'propio', 'texto_citable', 'sensible',
                                                'CERRADO', 'COMPLETADO'))


# --- Presupuesto ----------------------------------------------------------------------------

def test_presupuesto_de_referencias_no_crece_con_su_numero(cliente, aplicacion):
    entregar(cliente)
    ruta = '/cuentas/est-ana/actividades/t-eco/referencias'
    basal = medir(cliente, aplicacion, 'GET', ruta)[1].cantidad
    # DATO DE PRUEBA: muchas referencias extra para medir pocas contra muchas.
    agregar_referencias(aplicacion, *((f't-ref-extra-{n}', 't-exp-apoyo') for n in range(60)))
    for _ in range(2):
        assert medir(cliente, aplicacion, 'GET', ruta)[1].cantidad == basal
    assert len(referencias(cliente)) == 62


# --- RESULTADO y COINCIDENCIAS (B06) --------------------------------------------------------

def contraste(cliente, cuenta='est-ana'):
    return referencias(cliente, cuenta, actividad='t-contraste')


def test_resultado_y_coincidencias_solo_despues_de_revelar(cliente):
    preparar_ultimo(cliente)
    completar(cliente, INTERESES_FINAL)
    vacias = {'t-ref-coincidencias': 'SIN_DATO', 't-ref-resultado': 'SIN_DATO'}
    assert {c: r['estado'] for c, r in contraste(cliente).items()} == vacias
    assert all('opciones' not in r for r in contraste(cliente).values())
    revelar(cliente)
    obtenido = resultado(cliente)
    citadas = contraste(cliente)
    assert citadas['t-ref-resultado'] == {
        'codigo': 't-ref-resultado', 'tipo': 'RESULTADO', 'estado': 'DISPONIBLE',
        'opciones': [{'codigo': d['codigo'], 'texto': d['nombre']} for codigo in 'IRA'
                     for d in obtenido['dimensiones'] if d['codigo'] == codigo]}
    assert citadas['t-ref-coincidencias']['estado'] == 'DISPONIBLE'
    assert citadas['t-ref-coincidencias']['opciones'] == [
        {'codigo': c['codigo'], 'texto': c['titulo']} for c in obtenido['ocupaciones']]
    # Ajuste resultados-intereses: las afines mostradas, de 10 a 30.
    assert 10 <= len(citadas['t-ref-coincidencias']['opciones']) <= 30


def test_perfil_plano_disponible_sin_opciones_y_tras_reiniciar_sin_dato(cliente):
    ciclo(cliente, opcion=3)
    # F03: revelar un perfil plano también abre t-contraste; el registro se hace sin cita.
    assert actividades(cliente)['t-contraste'] == 'DISPONIBLE'
    assert {c: (r['estado'], r['opciones']) for c, r in contraste(cliente).items()} == {
        't-ref-coincidencias': ('DISPONIBLE', []), 't-ref-resultado': ('DISPONIBLE', [])}
    reiniciar(cliente)
    # Los desbloqueos persisten tras el reinicio: t-contraste sigue abierto y su eco queda sin dato.
    assert actividades(cliente)['t-contraste'] == 'DISPONIBLE'
    assert {r['estado'] for r in contraste(cliente).values()} == {'SIN_DATO'}


def test_resultado_de_otra_cuenta_nunca_se_cita(cliente):
    ciclo(cliente)
    assert {r['estado'] for r in contraste(cliente).values()} == {'DISPONIBLE'}
    for cuenta in ('est-luis', 'est-beto'):
        assert {r['estado'] for r in contraste(cliente, cuenta).values()} == {'SIN_DATO'}
    ciclo(cliente, cuenta='est-luis', opcion=3)
    assert contraste(cliente, 'est-luis')['t-ref-resultado']['opciones'] == []
    assert contraste(cliente)['t-ref-resultado']['opciones']


def test_presupuesto_de_contraste_no_crece_con_las_ocupaciones(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'contraste-{extra}') as (aplicacion, cliente):
            if extra:
                with aplicacion.state.fabrica_sesiones.begin() as sesion:
                    agregar_ocupaciones(sesion, extra)
            ciclo(cliente)
            conteos.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/actividades/t-contraste/referencias')[1].cantidad)
    assert conteos[0] == conteos[1]
