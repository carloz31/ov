"""Ajuste registros llm (lote 2), §10: carga de los 19 registros del conjunto `contenido` (12 requeridos y 7
opcionales), sus tarjetas, lo que sale (§9) y su coherencia con los JSON del front fuera de los registros."""

import re
from pathlib import Path

import pytest
from sqlalchemy import select

from app import models as m
from datos import contenido, tarjetas_registros
from datos.cargador import marcadores_de
from scripts import verificar_contenido_front


REQUERIDOS = {'b1-1': 3, 'b1-3': 3, 'b1-6': 1, 'b1-7': 3, 'b2-3': 1, 'b2-4': 3, 'b3-4': 2, 'b4-1': 2, 'b4-2': 1,
              'b4-5': 1, 'b5-1': 1, 'b5-3': 1}
OPCIONALES = {'h1': 'h1-reto', 'h2': 'h2-reconozco', 'h3': 'h3-curiosidad', 'ma3': 'ma3-hoy', 'ma4': 'ma4-modelo',
              'b3-a': 'b3-a-comparo', 'ma8': 'ma8-respuesta'}
RETIRADOS = {'b2-6', 'ma6', 'b4-a', 'ma9'}
ITEMS_QUE_SALEN = {
    'b2-4-antes', 'b3-4-dato', 'b3-4-cambia', 'b4-1-familia', 'b4-2-criterios', 'b4-2-linea-roja', 'b4-5-orden',
    'b4-5-debil', 'b4-5-plan-b', 'b5-1-decision', 'b5-1-senal', 'b5-1-apoyo', 'b5-3-inicial', 'b5-3-explorar',
    'h1-habilidad', 'h1-accion', 'h2-no-refleja', 'h3-sorprende', 'h3-descarto', 'ma4-probe', 'ma4-sigo',
    'ma3-pasos', 'ma3-falta', 'b3-a-testimonio', 'b3-a-identifico', 'ma8-motivos'}
LISTAS_QUE_SALEN = {'AREAS_VIDA', 'ASPECTOS_CARRERA', 'DIMENSIONES_PERFIL', 'CRITERIOS', 'POR_EXPLORAR', 'LUGARES',
                    'DIMENSIONES_INTELIGENCIAS', 'DIMENSIONES_HABILIDADES'}
REFERENCIAS_QUE_SALEN = {
    'b3-4-ref-planes', 'b3-4-ref-datos-carrera', 'b3-4-ref-plan', 'b4-1-ref-intereses', 'b4-1-ref-inteligencias',
    'b4-1-ref-habilidades', 'b4-1-ref-logro', 'b4-1-ref-valores', 'b4-1-ref-bien', 'b4-1-ref-antes',
    'b4-1-ref-habilidad', 'b4-1-ref-reconozco', 'b4-1-ref-familias', 'b4-1-ref-gustos', 'b4-1-ref-no-refleja',
    'b4-2-ref-valores', 'b4-5-ref-criterios', 'b4-5-ref-linea-roja', 'b4-5-ref-respalda', 'b4-5-ref-plan',
    'b5-1-ref-inicial', 'b5-1-ref-respalda', 'b5-1-ref-criterios', 'b5-1-ref-orden', 'b5-3-ref-inicial',
    'b5-3-ref-dia', 'b5-3-ref-freno', 'b5-3-ref-mia', 'b5-3-ref-mito', 'h3-ref-inicial', 'ma4-ref-accion'}
SIN_LLM = {'b2-4-cuesta', *OPCIONALES.values()}


@pytest.fixture
def items(sesion_contenido):
    return {i.codigo: i for i in sesion_contenido.scalars(select(m.ItemRegistro))}


@pytest.fixture
def actividades(sesion_contenido):
    return {a.codigo: a for a in sesion_contenido.scalars(select(m.Actividad))}


def test_doce_requeridos_con_22_items_y_siete_opcionales_con_uno(items, actividades):
    registros = {c for c, a in actividades.items() if a.tipo == m.TipoActividad.REGISTRO}
    assert registros == set(REQUERIDOS) | set(OPCIONALES)
    por_actividad = {}
    for item in items.values():
        por_actividad.setdefault(item.actividad_id, []).append(item.codigo)
    assert {c: len(por_actividad[actividades[c].id]) for c in REQUERIDOS} == REQUERIDOS
    assert sum(REQUERIDOS.values()) == 22
    assert {c: por_actividad[actividades[c].id] for c in OPCIONALES} == {c: [i] for c, i in OPCIONALES.items()}
    assert all(actividades[c].requerida for c in REQUERIDOS) and not any(actividades[c].requerida for c in OPCIONALES)
    assert not RETIRADOS & set(actividades)


def test_titulos_y_duraciones(actividades):
    assert {c: actividades[c].titulo for c in ('b3-4', 'b4-2', 'ma4', 'ma3')} == {
        'b3-4': 'Lo que necesito saber', 'b4-2': 'Cómo decido', 'ma4': 'Alguien que ya lo hace',
        'ma3': 'Lo que ya tengo de ese día'}
    assert {actividades[c].duracion_estimada_min for c in OPCIONALES} == {4}
    assert {c: actividades[c].duracion_estimada_min for c in ('b4-5', 'b5-1', 'b5-3')} == {'b4-5': 8, 'b5-1': 8,
                                                                                       'b5-3': 5}


def test_nada_de_lo_que_sale_queda_cargado(sesion_contenido, items):
    assert not ITEMS_QUE_SALEN & set(items)
    listas = {lista.codigo for lista in sesion_contenido.scalars(select(m.ListaOpciones))}
    assert not LISTAS_QUE_SALEN & listas
    # DIFICULTADES y VALORES se quedan: las usan los planes.
    assert {'DIFICULTADES', 'VALORES', 'ESTILOS'} <= listas
    referencias = {r.codigo: r for r in sesion_contenido.scalars(select(m.Referencia))}
    assert not REFERENCIAS_QUE_SALEN & set(referencias)
    # Ninguna referencia apunta a un ítem que no existe (la FK lo exige; aquí, que sea de un ítem cargado).
    ids = {i.id for i in items.values()}
    assert all(r.item_registro_id is None or r.item_registro_id in ids for r in referencias.values())


def test_tarjetas_en_su_item_u_opcion_con_sus_bases(items):
    tarjetas = 0
    for codigo, item in items.items():
        ficha = tarjetas_registros.TARJETAS.get(codigo)
        if codigo in SIN_LLM:
            assert item.tarjeta is None and ficha is None, codigo
            continue
        assert item.tarjeta == {k: ficha[k] for k in ('tarjeta', 'bases', 'general_por_opcion', 'filtrar_etiqueta')
                                if k in ficha}, codigo
        tarjetas += 1
        for base in (*item.tarjeta['bases'].values(), *item.tarjeta.get('general_por_opcion', {}).values()):
            assert base in item.tarjeta['tarjeta'], codigo
        propias = {o['codigo']: o for o in item.opciones_propias or ()}
        for opcion, ficha_opcion in ficha.get('por_opcion', {}).items():
            assert propias[opcion]['tarjeta']['tarjeta'] == ficha_opcion['tarjeta'], (codigo, opcion)
            tarjetas += 1
        # Ninguna presentación del runner queda en la tarjeta guardada.
        assert not {'pregunta', 'pregunta_por_opcion', 'ecos', 'lista_ecos', 'podio'} & set(item.tarjeta), codigo
    assert tarjetas == len(tarjetas_registros.HASHES) == 27
    assert sum(1 for c in items if c not in SIN_LLM) == 21


def test_podios_y_listas(items):
    podios = {c: i for c, i in items.items() if i.eleccion_ordenada}
    assert set(podios) == {'b2-3-valores', 'b2-4-bien'}
    assert all((i.eleccion_minima, i.eleccion_maxima) == (3, 3) for i in podios.values())
    assert not podios['b2-3-valores'].permite_otra and podios['b2-4-bien'].permite_otra
    cuesta = items['b2-4-cuesta']
    assert (cuesta.fuente_opciones, cuesta.eleccion_minima, cuesta.eleccion_maxima, cuesta.eleccion_ordenada,
            cuesta.permite_otra) == (m.FuenteOpciones.LISTA, 1, 2, False, False)
    assert items['b4-2-estilo'].eleccion_maxima == 1
    assert items['b1-3-contraste'].premarcar_si == {'item': 'b1-3-voz', 'opcion': 'NADIE', 'marca': 'SIN_COMPARAR'}
    assert {c: i.fuente_opciones for c, i in items.items() if i.fuente_opciones and i.fuente_opciones.startswith(
        'PIEZAS')} == {'b4-1-respalda': m.FuenteOpciones.PIEZAS_PERFIL,
                       'b4-1-menos': m.FuenteOpciones.PIEZAS_PERFIL_MENOS, 'b5-3-cambio': m.FuenteOpciones.PIEZAS_INICIO}
    assert (items['b4-1-respalda'].etiqueta_otra, items['b5-3-cambio'].etiqueta_otra) == (
        'Otra cosa mía', 'Otra cosa que cambió')
    sin_llm = {(c, o['codigo']) for c, i in items.items() for o in i.opciones_propias or () if o.get('sin_llm')}
    assert sin_llm == {('b1-3-voz', 'NADIE'), ('b1-3-contraste', 'SIN_COMPARAR'), ('b2-4-cuesta', 'NADA')}


def test_lista_estilos_en_su_orden(sesion_contenido):
    lista = sesion_contenido.scalar(select(m.ListaOpciones).where(m.ListaOpciones.codigo == 'ESTILOS'))
    opciones = sesion_contenido.scalars(select(m.OpcionLista).where(m.OpcionLista.lista_id == lista.id)
                                        .order_by(m.OpcionLista.orden)).all()
    assert [(o.codigo, o.texto) for o in opciones] == [
        ('CALMA', 'Lo pienso con calma y comparo'), ('ULTIMO_MOMENTO', 'Lo dejo para el último momento'),
        ('LO_QUE_SIENTO', 'Me guío por lo que siento'), ('PREGUNTO', 'Pregunto a varias personas'),
        ('LO_QUE_ESPERAN', 'Termino haciendo lo que otros esperan'), ('BUSCO_INFO', 'Busco información antes'),
        ('RAPIDO_DUDO', 'Decido rápido y después dudo'), ('CUESTA_DESCARTAR', 'Me cuesta descartar opciones'),
        ('MIEDO', 'Me da miedo equivocarme')]


def test_consignas_marcadores_y_ecos(items):
    assert items['b2-4-cruce'].pregunta_eleccion == 'Lo que mejor te sale es {primera}. ¿Te gusta?'
    assert marcadores_de(items['b3-4-necesito'].pregunta_texto) == {'valor 1'}
    assert marcadores_de(items['b4-5-moneda'].dialogo) == {'plan_b'}
    assert marcadores_de(items['ma4-modelo'].pregunta_eleccion) == {'habilidad'}
    # El «…» de un arranque no es un marcador.
    assert marcadores_de(items['b2-3-valores'].arranque) == set()
    assert not any('paso' in (texto or '').lower() for texto in (
        items['b5-1-seguridad'].dialogo, items['b5-1-seguridad'].pregunta_eleccion,
        items['b5-1-seguridad'].pregunta_texto, items['b5-1-seguridad'].arranque))
    assert items['b3-4-necesito'].ecos_mostrar is None
    assert items['b3-4-quien'].ecos_mostrar == items['b3-4-quien'].ecos_llm
    assert items['b5-3-cambio'].ecos_llm is None


def test_cero_cartas_personalizadas_y_ninguna_regla_r_c(sesion_contenido):
    preguntas = {p.codigo: p for p in sesion_contenido.scalars(select(m.PreguntaDiario))}
    assert not {'C1', 'C2', 'C3', 'C4', 'C5', 'C6'} & set(preguntas)
    assert all(p.respaldo_si is None for p in preguntas.values())
    assert not any(re.fullmatch(r'R-C[1-6]', r[0]) for r in contenido.REGLAS)


def test_reglas_con_su_condicion_nueva(sesion_contenido):
    reglas = {r.codigo: r for r in sesion_contenido.scalars(select(m.ReglaDesbloqueo))}
    assert (reglas['R-b4-1'].evaluador_especial, reglas['R-b4-1'].parametro_evaluador) == ('por_que_en_planes', 1)
    assert (reglas['R-b4-5'].evaluador_especial, reglas['R-b4-5'].parametro_evaluador) == ('por_que_en_planes', 2)
    assert (reglas['R-b5-1'].evaluador_especial, reglas['R-b5-1'].parametro_evaluador) == ('pasos_plan_a', 1)
    assert reglas['R-b4-5'].mensaje_bloqueo == 'Calla al Eco y cuenta por qué elegiste tus dos primeros planes.'
    assert {c.tipo_evento for c in reglas['R-b4-5'].condiciones} == {m.TipoEventoUso.SUPERA_BATALLA,
                                                                     m.TipoEventoUso.ACTUALIZA_PLAN}


def test_coherencia_con_los_json_del_front_fuera_de_los_registros():
    # El front de los registros se ajusta aparte (lote 2, «No entra»): sus errores quedan en pendientes-interfaz.md.
    front = Path(__file__).resolve().parents[4] / 'ov_frontend'
    errores, _ = verificar_contenido_front.verificar(front)
    assert [e for e in errores if e.split(':')[0] not in {*REQUERIDOS, *OPCIONALES}] == []
