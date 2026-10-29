"""B13 · HU-057, HU-058, HU-059 y HU-100: investigación, lo que pienso, guion, sugerencias y aliados."""

from app import models as modelos
from soporte_investigaciones import (
    OCUPACION, OTRA_OCUPACION, PIENSO, abrir_investigaciones, accion, guia_lista, guion, investigaciones, pensar,
)
from soporte_ruta import avanzar, eventos, pedir


def test_seccion_cerrada_responde_409_y_otras_audiencias_404(cliente):
    avanzar(cliente)
    bloqueo = pedir(cliente, 'GET', '/cuentas/est-ana/investigaciones', esperado=409)
    assert bloqueo['detail']['mensaje'] == 'Completa la misión del investigador para investigar.'
    pensar(cliente, esperado=409)
    pedir(cliente, 'GET', '/cuentas/apo-rosa/investigaciones', esperado=404)
    pedir(cliente, 'GET', '/cuentas/ori-carmen/investigaciones', esperado=404)


def test_vista_inicial_con_catalogos_y_sin_investigacion(cliente):
    abrir_investigaciones(cliente)
    vista = investigaciones(cliente)
    assert vista['en_curso'] is None
    assert vista['aliados'] == {'misma_ocupacion': [], 'otras': []}
    assert [p['codigo'] for p in vista['preguntas_base']] == ['BASE-1', 'BASE-2', 'BASE-3']
    assert [(t['codigo'], t['comentario_obligatorio'], t['icono']) for t in vista['tipos_reaccion']] == [
        ('APRENDI', True, 'bombilla'), ('ME_GUSTO', False, 'estrella'), ('CURIOSIDAD', True, 'pregunta'),
        ('MI_CAMINO', True, 'caminos')]
    assert vista['favoritos_leyenda'] == 3
    assert vista['conteos'] == {'salon': 0, 'leyendas': 0, 'mias': 0}


def test_iniciar_editar_y_una_sola_en_curso(cliente):
    abrir_investigaciones(cliente)
    respuesta = pensar(cliente)
    assert [e['tipo'] for e in respuesta['eventos_registrados']] == ['INICIA_INVESTIGACION']
    assert respuesta['eventos_registrados'][0]['referencia'] == OCUPACION
    en_curso = investigaciones(cliente)['en_curso']
    assert en_curso['estado'] == 'EN_CURSO' and en_curso['ocupacion']['codigo'] == OCUPACION
    assert en_curso['lo_que_pienso'] == PIENSO and en_curso['preguntas'] == []
    # Guardar de nuevo edita la misma (cambia ocupación y textos), sin otro evento.
    otra = pensar(cliente, ocupacion=OTRA_OCUPACION, dia='Traduce documentos y conversa con clientes de otros países.')
    assert otra['eventos_registrados'] == []
    editada = investigaciones(cliente)['en_curso']
    assert editada['codigo'] == en_curso['codigo'] and editada['ocupacion']['codigo'] == OTRA_OCUPACION
    pensar(cliente, esperado=422, dia='   ')
    pensar(cliente, ocupacion='no-existe', esperado=404)


def test_guion_minimo_y_guia_lista(cliente, sesion):
    abrir_investigaciones(cliente)
    guion(cliente, esperado=409)
    pensar(cliente)
    guion(cliente, preguntas=[], esperado=422)
    guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': '¿Qué te gusta de tu trabajo?'}], terminar=False)
    assert investigaciones(cliente)['en_curso']['estado'] == 'EN_CURSO'
    lista = guion(cliente, preguntas=[{'origen': 'DUDA', 'texto': PIENSO['duda']},
                                      {'origen': 'PROPIA', 'texto': '¿Qué te gusta de tu trabajo?'}])
    assert [e['tipo'] for e in lista['eventos_registrados']] == ['TERMINA_GUION']
    en_curso = investigaciones(cliente)['en_curso']
    assert en_curso['estado'] == 'GUIA_LISTA' and en_curso['guia_lista_en'] is not None
    assert [p['origen'] for p in en_curso['preguntas']] == ['DUDA', 'PROPIA']
    # Editar el guion ya listo no repite el evento; quitar todas las propias no se permite.
    assert guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': '¿Cómo empezaste?'}])['eventos_registrados'] == []
    guion(cliente, preguntas=[], terminar=False, esperado=422)
    # Editar lo que pienso con la guía lista la mantiene lista.
    pensar(cliente, duda='¿Cuánto se gana al empezar en este oficio?')
    assert investigaciones(cliente)['en_curso']['estado'] == 'GUIA_LISTA'


def test_cancelar_borra_la_investigacion_y_deja_el_evento(cliente, sesion):
    abrir_investigaciones(cliente)
    accion(cliente, 'cancelar-investigacion', {}, esperado=409)
    guia_lista(cliente, abrir=False)
    accion(cliente, 'cancelar-investigacion', {})
    assert investigaciones(cliente)['en_curso'] is None
    for modelo in (modelos.Investigacion, modelos.PreguntaGuion, modelos.SugerenciaGuion):
        assert sesion.query(modelo).count() == 0
    assert {'INICIA_INVESTIGACION', 'TERMINA_GUION'} <= {e['tipo'] for e in eventos(cliente)}
    # Se puede iniciar otra.
    pensar(cliente, ocupacion=OTRA_OCUPACION)


def test_sugerencias_se_piden_una_vez_y_se_agregan_o_descartan(cliente, aplicacion):
    evaluador = aplicacion.state.evaluador_respuestas
    abrir_investigaciones(cliente)
    pensar(cliente)
    primera = accion(cliente, 'pedir-sugerencias-guion', {})
    assert primera['estado'] == 'LISTAS' and len(primera['sugerencias']) == 3
    assert evaluador.llamadas_guion == 1
    contexto = evaluador.contextos_guion[0]
    assert contexto.ocupacion and contexto.duda == PIENSO['duda'] and len(contexto.preguntas_base) == 3
    # Reabrir el paso no vuelve a llamar.
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == primera and evaluador.llamadas_guion == 1
    agregada, descartada, _ = (s['codigo'] for s in primera['sugerencias'])
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'Editada por mí', 'sugerencia': agregada},
                              {'origen': 'DUDA', 'texto': PIENSO['duda']}], descartadas=[descartada])
    en_curso = investigaciones(cliente)['en_curso']
    assert len(en_curso['sugerencias']) == 1
    assert en_curso['preguntas'][0] == {'origen': 'SUGERIDA', 'texto': 'Editada por mí'}
    # F09: el front reenvía la sugerida ya agregada sin código (la consulta no lo devuelve); no cambia sugerencias.
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'Editada otra vez'},
                              {'origen': 'DUDA', 'texto': PIENSO['duda']}], terminar=True)
    assert investigaciones(cliente)['en_curso']['preguntas'][0] == {'origen': 'SUGERIDA', 'texto': 'Editada otra vez'}
    assert len(investigaciones(cliente)['en_curso']['sugerencias']) == 1
    guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': 'x', 'sugerencia': agregada}], esperado=422)
    # Una descartada no se puede agregar después; una inexistente tampoco.
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'x', 'sugerencia': descartada},
                              {'origen': 'DUDA', 'texto': 'y'}], esperado=404)
    # Cambiar lo que pienso invalida las pendientes y la próxima petición llama de nuevo, sin repetir las usadas.
    pensar(cliente, necesita='Creo que necesita un certificado técnico y cuidado con la seguridad.')
    assert investigaciones(cliente)['en_curso']['sugerencias'] == []
    segunda = accion(cliente, 'pedir-sugerencias-guion', {})
    assert evaluador.llamadas_guion == 2 and segunda['estado'] == 'LISTAS'
    usadas = {s['texto'] for s in primera['sugerencias']} | {'Editada por mí'}
    assert not usadas & {s['texto'] for s in segunda['sugerencias']}


def test_sugerencias_con_texto_pobre_o_fallo_del_llm(cliente, aplicacion):
    evaluador = aplicacion.state.evaluador_respuestas
    abrir_investigaciones(cliente)
    pensar(cliente, dia='No sé', necesita='Nada', duda='¿?')
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == {'estado': 'SIN_SUGERENCIAS', 'sugerencias': []}
    assert evaluador.llamadas_guion == 0
    pensar(cliente, duda='[falla] ¿Es peligroso trabajar con electricidad?')
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == {'estado': 'ERROR', 'sugerencias': []}
    assert investigaciones(cliente)['en_curso']['sugerencias_vigentes'] is False
    pensar(cliente, duda='[vacio] ¿Es peligroso trabajar con electricidad?')
    assert accion(cliente, 'pedir-sugerencias-guion', {})['estado'] == 'SIN_SUGERENCIAS'
    assert investigaciones(cliente)['en_curso']['sugerencias_vigentes'] is True
    llamadas = evaluador.llamadas_guion
    accion(cliente, 'pedir-sugerencias-guion', {})
    assert evaluador.llamadas_guion == llamadas


def test_aliados_del_mismo_salon_con_guia_lista(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente, 'est-beto')
    abrir_investigaciones(cliente)
    # Sin investigación propia, Luis está entre los que investigan otra cosa; Beto es de otro salón.
    sin_propia = investigaciones(cliente)['aliados']
    assert sin_propia['misma_ocupacion'] == [] and [a['codigo'] for a in sin_propia['otras']] == ['est-luis']
    pensar(cliente)
    aliados = investigaciones(cliente)['aliados']
    luis, = aliados['misma_ocupacion']
    assert luis['codigo'] == 'est-luis' and luis['ocupacion']['codigo'] == OCUPACION
    assert luis['nivel'] == {'numero': 2, 'titulo': 'Recolector de pistas'} and luis['vitrina'] == []
    assert aliados['otras'] == []
    pensar(cliente, ocupacion=OTRA_OCUPACION)
    assert [a['codigo'] for a in investigaciones(cliente)['aliados']['otras']] == ['est-luis']
    # Un aliado desaparece al cancelar.
    accion(cliente, 'cancelar-investigacion', {}, cuenta='est-luis')
    assert investigaciones(cliente)['aliados'] == {'misma_ocupacion': [], 'otras': []}
