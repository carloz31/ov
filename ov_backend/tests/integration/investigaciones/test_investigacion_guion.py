"""B13 · HU-057, HU-058, HU-059 y HU-100: investigación, lo que pienso, guion, sugerencias y aliados."""

from app import models as modelos
from app.services.investigaciones.prompt_guion_v4_haiku import PROMPT
from soporte_investigaciones import (
    FAMILIA, OTRA_FAMILIA, PIENSO, abrir_investigaciones, accion, guia_lista, guion, investigaciones, pensar,
)
from soporte_llm import fallo, salida_guion
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
    assert vista['aliados'] == {'misma_familia': [], 'otras': []}
    assert [p['codigo'] for p in vista['preguntas_base']] == ['BASE-1', 'BASE-2', 'BASE-3', 'BASE-4']
    assert [(t['codigo'], t['comentario_obligatorio'], t['icono']) for t in vista['tipos_reaccion']] == [
        ('APRENDI', True, 'bombilla'), ('ME_GUSTO', False, 'estrella'), ('CURIOSIDAD', True, 'pregunta'),
        ('MI_CAMINO', True, 'caminos')]
    assert vista['favoritos_leyenda'] == 3
    assert vista['conteos'] == {'salon': 0, 'leyendas': 0, 'mias': 0}


def test_iniciar_editar_y_una_sola_en_curso(cliente):
    abrir_investigaciones(cliente)
    respuesta = pensar(cliente)
    assert [e['tipo'] for e in respuesta['eventos_registrados']] == ['INICIA_INVESTIGACION']
    assert respuesta['eventos_registrados'][0]['referencia'] == FAMILIA
    en_curso = investigaciones(cliente)['en_curso']
    assert en_curso['estado'] == 'EN_CURSO' and en_curso['familia']['codigo'] == FAMILIA
    assert en_curso['lo_que_pienso'] == PIENSO and en_curso['preguntas'] == []
    # Guardar de nuevo edita la misma (cambia ocupación y textos), sin otro evento.
    otra = pensar(cliente, familia=OTRA_FAMILIA, dia='Traduce documentos y conversa con clientes de otros países.')
    assert otra['eventos_registrados'] == []
    editada = investigaciones(cliente)['en_curso']
    assert editada['codigo'] == en_curso['codigo'] and editada['familia']['codigo'] == OTRA_FAMILIA
    pensar(cliente, esperado=422, dia='   ')
    pensar(cliente, familia='no-existe', esperado=404)


def test_guion_minimo_y_guia_lista(cliente, sesion):
    abrir_investigaciones(cliente)
    guion(cliente, esperado=409)
    pensar(cliente)
    guion(cliente, preguntas=[], esperado=422)
    guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': '¿Qué te gusta de tu trabajo?'}], terminar=False)
    assert investigaciones(cliente)['en_curso']['estado'] == 'EN_CURSO'
    # Ajuste llm-sugerencias: una sugerida aceptada no basta para terminar; hace falta una propia.
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': '¿Cómo son tus horarios?'}], esperado=422)
    guion(cliente, preguntas=[{'origen': 'DUDA', 'texto': PIENSO['duda']}], esperado=422)
    lista = guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': '¿Cómo son tus horarios?'},
                                      {'origen': 'PROPIA', 'texto': '¿Qué te gusta de tu trabajo?'}])
    assert [e['tipo'] for e in lista['eventos_registrados']] == ['TERMINA_GUION']
    en_curso = investigaciones(cliente)['en_curso']
    assert en_curso['estado'] == 'GUIA_LISTA' and en_curso['guia_lista_en'] is not None
    assert [p['origen'] for p in en_curso['preguntas']] == ['SUGERIDA', 'PROPIA']
    # Editar el guion ya listo no repite el evento; quitar todas las propias no se permite.
    assert guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': '¿Cómo empezaste?'}])['eventos_registrados'] == []
    guion(cliente, preguntas=[], terminar=False, esperado=422)
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': '¿Cómo son tus horarios?'}], terminar=False,
          esperado=422)
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
    pensar(cliente, familia=OTRA_FAMILIA)


def test_sugerencias_se_piden_una_vez_y_se_agregan_o_descartan(cliente, aplicacion):
    llm = aplicacion.state.cliente_llm
    abrir_investigaciones(cliente)
    pensar(cliente)
    primera = accion(cliente, 'pedir-sugerencias-guion', {})
    assert primera['estado'] == 'LISTAS' and [s['campo'] for s in primera['sugerencias']] == ['DIA', 'NECESITA', 'DUDA']
    [(sistema, mensaje, _)] = llm.llamadas
    assert sistema == PROMPT and f'<duda>{PIENSO["duda"]}</duda>' in mensaje and mensaje.count('\n¿') == 4
    # Reabrir el paso no vuelve a llamar.
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == primera and len(llm.llamadas) == 1
    agregada, descartada, _ = (s['codigo'] for s in primera['sugerencias'])
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'Editada por mí', 'sugerencia': agregada},
                              {'origen': 'PROPIA', 'texto': PIENSO['duda']}], descartadas=[descartada])
    en_curso = investigaciones(cliente)['en_curso']
    assert [s['campo'] for s in en_curso['sugerencias']] == ['DUDA']
    assert en_curso['preguntas'][0] == {'origen': 'SUGERIDA', 'texto': 'Editada por mí'}
    # F09: el front reenvía la sugerida ya agregada sin código (la consulta no lo devuelve); no cambia sugerencias.
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'Editada otra vez'},
                              {'origen': 'PROPIA', 'texto': PIENSO['duda']}], terminar=True)
    assert investigaciones(cliente)['en_curso']['preguntas'][0] == {'origen': 'SUGERIDA', 'texto': 'Editada otra vez'}
    assert len(investigaciones(cliente)['en_curso']['sugerencias']) == 1
    guion(cliente, preguntas=[{'origen': 'PROPIA', 'texto': 'x', 'sugerencia': agregada}], esperado=422)
    # Una descartada no se puede agregar después; una inexistente tampoco.
    guion(cliente, preguntas=[{'origen': 'SUGERIDA', 'texto': 'x', 'sugerencia': descartada},
                              {'origen': 'PROPIA', 'texto': 'y'}], esperado=404)
    # Cambiar lo que pienso borra las pendientes y la próxima petición llama de nuevo, sin repetir las usadas: el
    # cliente de prueba repite la de día (agregada), que el filtro descarta, y vuelve a ofrecer la de la duda, que
    # estaba pendiente y se borró.
    pensar(cliente, necesita='Creo que necesita un certificado técnico y cuidado con la seguridad.')
    assert investigaciones(cliente)['en_curso']['sugerencias'] == []
    segunda = accion(cliente, 'pedir-sugerencias-guion', {})
    assert len(llm.llamadas) == 2 and segunda['estado'] == 'LISTAS'
    assert [s['campo'] for s in segunda['sugerencias']] == ['NECESITA', 'DUDA']
    usadas = {s['texto'] for s in primera['sugerencias'][:2]} | {'Editada por mí'}
    assert not usadas & {s['texto'] for s in segunda['sugerencias']}


def test_sugerencias_con_texto_pobre_fallo_o_ninguna_util(cliente, aplicacion, sesion):
    llm = aplicacion.state.cliente_llm
    abrir_investigaciones(cliente)
    pensar(cliente, dia='No sé', necesita='Nada', duda='¿?')
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == {'estado': 'SIN_SUGERENCIAS', 'sugerencias': []}
    assert llm.llamadas == []
    pensar(cliente)
    for falla in (fallo(), fallo('tiempo_agotado'), '{"preguntas": []}'):
        llm.encolar(falla)
        assert accion(cliente, 'pedir-sugerencias-guion', {}) == {'estado': 'ERROR', 'sugerencias': []}
        assert investigaciones(cliente)['en_curso']['sugerencias_vigentes'] is False
    # Tres null: SIN_SUGERENCIAS y no se vuelve a llamar.
    llm.encolar(salida_guion())
    assert accion(cliente, 'pedir-sugerencias-guion', {}) == {'estado': 'SIN_SUGERENCIAS', 'sugerencias': []}
    assert investigaciones(cliente)['en_curso']['sugerencias_vigentes'] is True
    llamadas = len(llm.llamadas)
    accion(cliente, 'pedir-sugerencias-guion', {})
    assert len(llm.llamadas) == llamadas
    # Una que no pasa el filtro se descarta y la otra se guarda con su campo y su motivo.
    pensar(cliente, duda='¿Cuánto gana alguien que recién empieza en esto?')
    llm.encolar(salida_guion(dia='¿Una? ¿Dos?', duda='¿Cuánto gana alguien que recién empieza en tu campo?',
                             motivo='De su duda sobre el sueldo'))
    assert [s['campo'] for s in accion(cliente, 'pedir-sugerencias-guion', {})['sugerencias']] == ['DUDA']
    fila = sesion.query(modelos.SugerenciaGuion).one()
    assert (fila.campo, fila.motivo) == (modelos.CampoLoQuePienso.DUDA, 'De su duda sobre el sueldo')


def test_aliados_del_mismo_salon_con_guia_lista(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente, 'est-beto')
    abrir_investigaciones(cliente)
    # Sin investigación propia, Luis está entre los que investigan otra cosa; Beto es de otro salón.
    sin_propia = investigaciones(cliente)['aliados']
    assert sin_propia['misma_familia'] == [] and [a['codigo'] for a in sin_propia['otras']] == ['est-luis']
    pensar(cliente)
    aliados = investigaciones(cliente)['aliados']
    luis, = aliados['misma_familia']
    assert luis['codigo'] == 'est-luis' and luis['familia']['codigo'] == FAMILIA
    assert luis['nivel'] == {'numero': 2, 'titulo': 'Recolector de pistas'} and luis['vitrina'] == []
    assert aliados['otras'] == []
    pensar(cliente, familia=OTRA_FAMILIA)
    assert [a['codigo'] for a in investigaciones(cliente)['aliados']['otras']] == ['est-luis']
    # Un aliado desaparece al cancelar.
    accion(cliente, 'cancelar-investigacion', {}, cuenta='est-luis')
    assert investigaciones(cliente)['aliados'] == {'misma_familia': [], 'otras': []}
