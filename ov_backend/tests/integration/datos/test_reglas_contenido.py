"""Ajuste carga-actividades: invariantes de las reglas de desbloqueo del conjunto `contenido` (principios de
`docs/sistema/motor.md`, «Reglas del contenido»)."""

from sqlalchemy import select

from app import models as m
from datos import contenido


# Principio 7: objetivos abiertos desde el inicio a propósito. El nivel 1 es el de partida y las preguntas DIARIA
# entran al sorteo del día: no se desbloquean.
SIN_REGLA = {('BLOQUE', 'B0'), ('ACTIVIDAD', 'b0-1'), ('BLOQUE', 'LUMI'), ('BLOQUE', 'FAMILIA'), ('ACTIVIDAD', 'p1'),
             ('NIVEL', 1)}
# R-B4 pide además el punto de partida y los instrumentos prioritarios revelados (las misiones de Helena, opcionales):
# la única excepción declarada a «la última requerida abre el siguiente tramo».
EXCEPCIONES_OPCIONALES = {'R-B4'}
CAMINO = ('B0', 'B1', 'B2', 'B3', 'B4', 'B5')
EVENTOS_DE_ACTIVIDAD = ('COMPLETA_ACTIVIDAD', 'REGISTRO_ADECUADO', 'SUPERA_BATALLA', 'SUPERA_CASO')
# Ajuste registros (adaptación autorizada para `contenido`): b4-1 y b4-5 piden planes con evaluadores parametrizados.
EVALUADORES_DE_PLANES = ('planes_listos_para_comparar', 'planes_con_por_que', 'planes_creados', 'pasos_plan_a')
APERTURA_CONVERSACIONES = {'conv-1': 'b1-3', 'conv-2': 'b1-3', 'conv-3': 'b1-6', 'conv-4': 'b1-7', 'conv-5': 'b2-3',
                           'conv-6': 'b2-4', 'conv-7': 'b3-3', 'conv-8': 'b3-10', 'conv-9': 'b4-3', 'conv-10': 'b5-1'}


def _datos(sesion):
    bloques = {b.id: b for b in sesion.scalars(select(m.Bloque))}
    actividades = {a.id: a for a in sesion.scalars(select(m.Actividad))}
    reglas = sesion.scalars(select(m.ReglaDesbloqueo)).all()
    condiciones = {}
    for c in sesion.scalars(select(m.CondicionDesbloqueo)):
        condiciones.setdefault(c.regla_id, []).append(c)
    return bloques, actividades, reglas, condiciones


def _objetivos(sesion, bloques, actividades):
    objetivos = {('BLOQUE', b.codigo): b.id for b in bloques.values()}
    objetivos |= {('ACTIVIDAD', a.codigo): a.id for a in actividades.values()}
    for tipo, modelo in (('FICHA', m.Ficha), ('TESTIMONIO', m.Testimonio), ('CONVERSACION', m.Conversacion),
                         ('INSIGNIA', m.Insignia), ('SECCION', m.Seccion), ('SECCION_PLAN', m.SeccionTarjeta)):
        objetivos |= {(tipo, o.codigo): o.id for o in sesion.scalars(select(modelo))}
    objetivos |= {('NIVEL', n.numero): n.id for n in sesion.scalars(select(m.Nivel))}
    objetivos |= {('PREGUNTA_DIARIO', p.codigo): p.id for p in sesion.scalars(select(m.PreguntaDiario))
                  if p.uso == m.UsoPreguntaDiario.DESBLOQUEABLE}
    return objetivos


def test_todo_objetivo_tiene_regla_salvo_los_abiertos_a_proposito(sesion_contenido):
    bloques, actividades, reglas, _ = _datos(sesion_contenido)
    objetivos = _objetivos(sesion_contenido, bloques, actividades)
    con_regla = {(r.tipo_objetivo.value, r.id_objetivo) for r in reglas}
    # Principio 2: la primera actividad de un tramo no lleva regla propia; la cubre la de su bloque.
    cubiertas = {('ACTIVIDAD', a.id) for a in actividades.values() if ('BLOQUE', a.bloque_id) in con_regla}
    sin_regla = {clave for clave, id_ in objetivos.items() if (clave[0], id_) not in con_regla | cubiertas}
    assert sin_regla == SIN_REGLA
    primeras = {a.codigo for a in actividades.values() if ('ACTIVIDAD', a.id) not in con_regla
                and bloques[a.bloque_id].codigo in CAMINO}
    # Ajuste registros (adaptación autorizada para `contenido`): b4-1 lleva regla propia (pide el Plan A con «Por qué», además del bloque).
    assert primeras == {'b0-1', 'b1-1', 'b2-1', 'b3-1'}


def test_ninguna_requerida_depende_de_una_opcional(sesion_contenido):
    bloques, actividades, reglas, condiciones = _datos(sesion_contenido)
    requeridas = {a.id for a in actividades.values() if a.requerida}
    bloques_con_requeridas = {a.bloque_id for a in actividades.values() if a.requerida}
    infracciones = []
    for regla in reglas:
        tipo = regla.tipo_objetivo
        de_requerida = (tipo == m.TipoObjetivo.ACTIVIDAD and regla.id_objetivo in requeridas) or (
            tipo == m.TipoObjetivo.BLOQUE and regla.id_objetivo in bloques_con_requeridas)
        if not de_requerida or regla.codigo in EXCEPCIONES_OPCIONALES:
            continue
        for c in condiciones[regla.id]:
            if (c.tipo_evento.value in EVENTOS_DE_ACTIVIDAD and c.id_referencia is not None
                    and not actividades[c.id_referencia].requerida):
                infracciones.append((regla.codigo, actividades[c.id_referencia].codigo))
    assert infracciones == []


def test_reglas_con_evaluador_de_planes_se_reevaluan_al_actualizar_un_plan(sesion_contenido):
    _, _, reglas, condiciones = _datos(sesion_contenido)
    de_planes = [r for r in reglas if r.evaluador_especial in EVALUADORES_DE_PLANES]
    assert {r.codigo for r in de_planes} == {'R-b4-1', 'R-b4-5', 'R-b5-1'}
    for regla in de_planes:
        assert 'ACTUALIZA_PLAN' in {c.tipo_evento.value for c in condiciones[regla.id]}, regla.codigo


def test_toda_conversacion_pide_la_carta(sesion_contenido):
    _, _, reglas, condiciones = _datos(sesion_contenido)
    conversaciones = [r for r in reglas if r.tipo_objetivo == m.TipoObjetivo.CONVERSACION]
    assert conversaciones
    for regla in conversaciones:
        assert 'ESCRIBE_CARTA' in {c.tipo_evento.value for c in condiciones[regla.id]}, regla.codigo


def test_cada_conversacion_se_abre_con_la_carta_y_una_requerida(sesion_contenido):
    _, actividades, reglas, condiciones = _datos(sesion_contenido)
    codigos = {c.id: c.codigo for c in sesion_contenido.scalars(select(m.Conversacion))}
    apertura = {}
    for regla in reglas:
        if regla.tipo_objetivo == m.TipoObjetivo.CONVERSACION:
            assert codigos[regla.id_objetivo] not in apertura, regla.codigo
            eventos = {c.tipo_evento.value: c.id_referencia for c in condiciones[regla.id]}
            assert set(eventos) == {'ESCRIBE_CARTA', 'COMPLETA_ACTIVIDAD'}, regla.codigo
            actividad = actividades[eventos['COMPLETA_ACTIVIDAD']]
            assert actividad.requerida, regla.codigo
            apertura[codigos[regla.id_objetivo]] = actividad.codigo
    assert apertura == APERTURA_CONVERSACIONES


def test_ninguna_regla_nombra_lo_retirado_de_ruta():
    for codigo, _, objetivo, _, condiciones in contenido.REGLAS:
        nombrados = {codigo, objetivo, *(c[1] for c in condiciones)}
        assert not any(str(n).startswith(('t-conv', 'R-t-conv')) or 'tras-conversar' in str(n) for n in nombrados), codigo


def test_ninguna_regla_nombra_una_actividad_de_prueba_del_camino(sesion_contenido):
    bloques, actividades, reglas, condiciones = _datos(sesion_contenido)
    de_prueba = {a.id for a in actividades.values()
                 if a.codigo.startswith('t-') and bloques[a.bloque_id].codigo in CAMINO}
    assert de_prueba == set()
    for regla in reglas:
        # SUPERA_CASO sin referencia (b3-a: cualquier caso) no nombra actividad.
        nombradas = {c.id_referencia for c in condiciones[regla.id]
                     if c.tipo_evento.value in EVENTOS_DE_ACTIVIDAD and c.id_referencia is not None}
        if regla.tipo_objetivo == m.TipoObjetivo.ACTIVIDAD:
            nombradas.add(regla.id_objetivo)
        assert all(not actividades[a].codigo.startswith('t-') or bloques[actividades[a].bloque_id].codigo
                   not in CAMINO for a in nombradas), regla.codigo


def test_las_fichas_de_una_batalla_se_obtienen_antes_de_abrirla(sesion_contenido):
    bloques, actividades, reglas, condiciones = _datos(sesion_contenido)
    reglas_de = {}
    for regla in reglas:
        reglas_de.setdefault((regla.tipo_objetivo, regla.id_objetivo), []).append(regla)

    def requisitos(actividad_id, vistos):
        """Actividades que deben completarse antes de abrir esta: su cadena de reglas hacia atrás."""
        actividad = actividades[actividad_id]
        pendientes = [*reglas_de.get((m.TipoObjetivo.ACTIVIDAD, actividad_id), []),
                      *reglas_de.get((m.TipoObjetivo.BLOQUE, actividad.bloque_id), [])]
        for regla in pendientes:
            for c in condiciones[regla.id]:
                if (c.tipo_evento.value in EVENTOS_DE_ACTIVIDAD and c.id_referencia is not None
                        and c.id_referencia not in vistos):
                    vistos.add(c.id_referencia)
                    requisitos(c.id_referencia, vistos)
                elif c.tipo_evento.value == 'COMPLETA_BLOQUE':
                    for otra in actividades.values():
                        if otra.bloque_id == c.id_referencia and otra.requerida and otra.id not in vistos:
                            vistos.add(otra.id)
                            requisitos(otra.id, vistos)
        return vistos

    fichas = {f.id: f.codigo for f in sesion_contenido.scalars(select(m.Ficha))}
    ficha_de = {}
    for regla in reglas:
        if regla.tipo_objetivo == m.TipoObjetivo.FICHA:
            ficha_de[regla.id_objetivo] = {c.id_referencia for c in condiciones[regla.id]
                                           if c.tipo_evento.value == 'COMPLETA_ACTIVIDAD'}
    preguntas = sesion_contenido.execute(select(m.PreguntaBatalla.actividad_id, m.PreguntaBatalla.ficha_id)).all()
    batallas = {a for a, _ in preguntas}
    assert len(batallas) == 8
    for batalla in batallas:
        previas = requisitos(batalla, set())
        for ficha in {f for a, f in preguntas if a == batalla}:
            assert ficha_de[ficha] & previas, (actividades[batalla].codigo, fichas[ficha])
