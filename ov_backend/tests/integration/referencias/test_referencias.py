"""HU-009 y RNF-20: referencias resueltas por cuenta: ELECCION y TEXTO (B05), RESULTADO y COINCIDENCIAS (B06).

Los textos son DATO DE PRUEBA; las marcas (`[vaga]`, `[falla]`) las interpreta el evaluador falso.
"""

import pytest
from sqlalchemy import select

from app import models as m
from soporte_datos_ports import agregar_ocupaciones
from soporte_retiro import ciclo, medir, preparar_ultimo, reiniciar, resultado
from soporte_ruta import FECHA, INTERESES_FINAL, avanzar, completar, pedir, responder_registro, revelar


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
AMPLIADO = 'DATO DE PRUEBA: ahora cuento un ejemplo concreto y explico por qué lo creo.'
OPCIONES = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}
RUTA_ELEGIDA = [{'codigo': 'INSTITUTO', 'texto': 'Estudiar en un instituto'}]


def accion(cuenta='est-ana', actividad='t-expectativas'):
    return {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}


def guardar(cliente, cuenta='est-ana', opciones=None, **textos):
    avanzar(cliente, 't-cierre-inicio', cuenta)
    for item, elegidas in {**OPCIONES, **(opciones or {})}.items():
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(cuenta), 'item': item, 'texto': textos.get(item.replace('-', '_'), ADECUADO),
            'opciones': elegidas})


def entregar(cliente, cuenta='est-ana', opciones=None, **textos):
    guardar(cliente, cuenta, opciones, **textos)
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion(cuenta))


def omitir(cliente, item, cuenta='est-ana'):
    return pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder', {**accion(cuenta), 'item': item})


def editar(cliente, cuenta='est-ana', **textos):
    return pedir(cliente, 'POST', '/acciones/registro/editar', {
        **accion(cuenta), 'items': [{'item': i.replace('_', '-'), 'texto': t} for i, t in textos.items()]})


def referencias(cliente, cuenta='est-ana', actividad='t-eco', esperado=200):
    datos = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/referencias', esperado=esperado)
    return datos if esperado != 200 else {r['codigo']: r for r in datos['referencias']}


def estados(cliente, cuenta='est-ana'):
    return {codigo: r['estado'] for codigo, r in referencias(cliente, cuenta).items()}


def consolidada(cliente, item, cuenta='est-ana'):
    registro = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/t-expectativas/registro')
    return next(r['texto_consolidado'] for r in registro['respuestas'] if r['item'] == item)


def agregar_referencias(aplicacion, *filas):
    """DATO DE PRUEBA: referencias TEXTO extra de `t-eco`, para ítems que la ruta no cita."""
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        eco = sesion.scalar(select(m.Actividad.id).where(m.Actividad.codigo == 't-eco'))
        items = dict(sesion.execute(select(m.ItemRegistro.codigo, m.ItemRegistro.id)).all())
        sesion.add_all(m.Referencia(codigo=codigo, tipo=m.TipoReferencia.TEXTO, actividad_id=eco,
                                    item_registro_id=items[item]) for codigo, item in filas)


# --- Sin dato -------------------------------------------------------------------------------

def test_sin_respuesta_o_en_borrador_no_hay_dato(cliente):
    assert estados(cliente) == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'SIN_DATO'}
    guardar(cliente)
    resueltas = referencias(cliente)
    assert {c: r['estado'] for c, r in resueltas.items()} == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'SIN_DATO'}
    assert all(set(r) == {'codigo', 'tipo', 'estado', 'actividad'} for r in resueltas.values())


# --- TEXTO ----------------------------------------------------------------------------------

def test_se_cita_la_consolidada_tras_un_seguimiento(cliente):
    entregar(cliente, t_exp_espera='DATO DE PRUEBA [vaga]')
    pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
          {**accion(), 'item': 't-exp-espera', 'texto': AMPLIADO})
    espera = referencias(cliente)['t-ref-espera']
    assert espera == {'codigo': 't-ref-espera', 'tipo': 'TEXTO', 'estado': 'DISPONIBLE', 'actividad': 't-expectativas',
                      'texto': consolidada(cliente, 't-exp-espera')}
    assert AMPLIADO in espera['texto']


def test_poco_desarrollada_sale_por_desarrollar_y_se_cita_al_ampliarla(cliente):
    entregar(cliente, t_exp_espera='DATO DE PRUEBA [vaga]')
    # Mientras espera la respuesta de seguimiento, ya es poco desarrollada.
    assert estados(cliente) == {'t-ref-espera': 'POR_DESARROLLAR', 't-ref-rutas': 'DISPONIBLE'}
    omitir(cliente, 't-exp-espera')
    resueltas = referencias(cliente)
    assert resueltas['t-ref-espera'] == {'codigo': 't-ref-espera', 'tipo': 'TEXTO', 'estado': 'POR_DESARROLLAR',
                                         'actividad': 't-expectativas'}
    # La elección no depende de lo desarrollado de la justificación.
    assert resueltas['t-ref-rutas']['opciones'] == RUTA_ELEGIDA
    editar(cliente, t_exp_espera=AMPLIADO)
    assert referencias(cliente)['t-ref-espera']['texto'] == AMPLIADO == consolidada(cliente, 't-exp-espera')


def test_adecuada_que_al_editarse_queda_poco_desarrollada_sale_por_desarrollar(cliente):
    entregar(cliente)
    assert referencias(cliente)['t-ref-espera']['texto'] == ADECUADO
    editar(cliente, t_exp_espera='DATO DE PRUEBA editado [vaga]')
    assert estados(cliente)['t-ref-espera'] == 'POR_DESARROLLAR'
    omitir(cliente, 't-exp-espera')
    assert estados(cliente) == {'t-ref-espera': 'POR_DESARROLLAR', 't-ref-rutas': 'DISPONIBLE'}


def test_edicion_con_seguimiento_pendiente_cita_lo_demas(cliente, aplicacion):
    agregar_referencias(aplicacion, ('t-ref-apoyo-prueba', 't-exp-apoyo'))
    entregar(cliente)
    editar(cliente, t_exp_apoyo=AMPLIADO, t_exp_espera='DATO DE PRUEBA editado [vaga]')
    registro = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    assert {r['item']: r['estado'] for r in registro['respuestas']}['t-exp-espera'] == 'PENDIENTE_SEGUIMIENTO'
    resueltas = referencias(cliente)
    assert resueltas['t-ref-espera']['estado'] == 'POR_DESARROLLAR'
    assert resueltas['t-ref-apoyo-prueba']['texto'] == AMPLIADO
    assert resueltas['t-ref-rutas']['opciones'] == RUTA_ELEGIDA


def test_lo_que_quedo_sin_evaluar_por_un_fallo_se_cita(cliente):
    texto = 'DATO DE PRUEBA: una respuesta larga que el evaluador no pudo leer. [falla]'
    entregar(cliente, t_exp_ruta=texto, t_exp_apoyo=texto, t_exp_espera=texto)
    assert referencias(cliente)['t-ref-espera'] == {'codigo': 't-ref-espera', 'tipo': 'TEXTO',
                                                    'estado': 'DISPONIBLE', 'actividad': 't-expectativas',
                                                    'texto': texto}


def test_item_sin_criterios_se_cita_y_su_extension_minima_decide(cliente, aplicacion):
    agregar_referencias(aplicacion, ('t-ref-libre-prueba', 't-val-libre'), ('t-ref-breve-prueba', 't-val-breve'))
    avanzar(cliente, 't-cierre-inicio')
    for item, texto in (('t-val-orden', ADECUADO), ('t-val-libre', 'DATO DE PRUEBA breve'),
                        ('t-val-breve', 'DATO DE PRUEBA corto')):
        opciones = [{'codigo': c} for c in ('SERVIR', 'CREAR', 'LIBERTAD')] if item == 't-val-orden' else []
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(actividad='t-valores'), 'item': item, 'texto': texto, 'opciones': opciones})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion(actividad='t-valores'))
    resueltas = referencias(cliente)
    # Sin criterios ni mínimo: adecuada sin LLM. Con mínimo no alcanzado: poco desarrollada.
    assert resueltas['t-ref-libre-prueba']['texto'] == 'DATO DE PRUEBA breve'
    assert resueltas['t-ref-breve-prueba']['estado'] == 'POR_DESARROLLAR'


# --- ELECCION -------------------------------------------------------------------------------

def test_eleccion_cita_lo_elegido_con_su_texto_y_la_opcion_otra(cliente):
    otra = {'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA: trabajar en el taller familiar'}
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
    entregar(cliente, t_exp_espera='DATO DE PRUEBA [vaga]')
    assert estados(cliente)['t-ref-espera'] == 'POR_DESARROLLAR'
    assert actividades() == origen


def test_otros_tipos_no_llevan_actividad(cliente):
    for actividad in ('t-contraste', 't-comparar', 't-proyecto', 't-lee-cuestionario'):
        assert all('actividad' not in r for r in referencias(cliente, actividad=actividad).values())


# --- Aislamiento ----------------------------------------------------------------------------

def test_nunca_hay_datos_de_otra_cuenta(cliente):
    entregar(cliente)
    assert estados(cliente)['t-ref-espera'] == 'DISPONIBLE'
    for cuenta in ('est-luis', 'est-beto'):
        assert estados(cliente, cuenta) == {'t-ref-espera': 'SIN_DATO', 't-ref-rutas': 'SIN_DATO'}
    entregar(cliente, 'est-luis', t_exp_espera='DATO DE PRUEBA de Luis [vaga]')
    assert estados(cliente, 'est-luis')['t-ref-espera'] == 'POR_DESARROLLAR'
    assert referencias(cliente)['t-ref-espera']['texto'] == ADECUADO


@pytest.mark.parametrize(('cuenta', 'actividad'), [
    ('apo-rosa', 't-eco'), ('ori-carmen', 't-eco'), ('est-nadie', 't-eco'),
    ('est-ana', 't-apo-1'), ('est-ana', 't-nada')])
def test_cuenta_o_actividad_ajena_responde_404(cliente, cuenta, actividad):
    referencias(cliente, cuenta, actividad, esperado=404)


def test_actividad_sin_referencias_devuelve_lista_vacia(cliente):
    assert referencias(cliente, actividad='t-inicio') == {}


def test_nunca_devuelve_la_clasificacion(cliente):
    entregar(cliente, t_exp_espera='DATO DE PRUEBA [vaga]')
    texto = str(pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias'))
    assert not any(clave in texto for clave in ('clasificacion', 'POCO_DESARROLLADA', 'ADECUADA', 'NO_EVALUADA'))


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
        {'codigo': c['codigo'], 'texto': c['titulo']} for c in obtenido['coincidencias']]
    assert len(citadas['t-ref-coincidencias']['opciones']) == 10


def test_perfil_plano_disponible_sin_opciones_y_tras_reiniciar_sin_dato(cliente):
    ciclo(cliente, opcion=3)
    assert {c: (r['estado'], r['opciones']) for c, r in contraste(cliente).items()} == {
        't-ref-coincidencias': ('DISPONIBLE', []), 't-ref-resultado': ('DISPONIBLE', [])}
    reiniciar(cliente)
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
