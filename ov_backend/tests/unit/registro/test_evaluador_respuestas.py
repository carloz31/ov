"""Registro B03 (contrato v5 del ajuste registros): evaluación pura de la entrega y del seguimiento, sin sesiones,
HTTP ni red. Las pruebas del contrato anterior se adaptaron al nuevo (autorizado por el ajuste)."""

import json
import subprocess
import sys
from dataclasses import asdict, fields

import pytest

from app.core.parametros import (
    FACTOR_MAXIMO_CONSOLIDADA, MARGEN_CONSOLIDADA, MAXIMO_CARACTERES_PREGUNTA, MAXIMO_SEGUIMIENTOS_POR_REGISTRO, VERSION_PROMPT_REGISTRO,
)
from app.models.enums import ClasificacionRespuesta, OrigenEvaluacion
from app.services.registro.evaluacion import (
    ContextoEntrega, ContextoSeguimiento, CriterioEvaluacion, EcoEvaluacion, ErrorResultadoEvaluacion, EvaluadorFalso,
    GuiaSeguimiento, ItemEntrega, ItemPorEvaluar, ResultadoEntrega, ResultadoItemEntrega, ResultadoSeguimiento,
    TurnoEvaluacion, concatenar, consolidada_o_concatenacion, pregunta_o_base, pregunta_valida, procesar_entrega,
    procesar_seguimiento, validar_entrega, validar_seguimiento,
)


EJEMPLO = CriterioEvaluacion("C1", "EJEMPLO", "Un ejemplo concreto", "¿Podrías darme un ejemplo concreto?")
RAZON = CriterioEvaluacion("C2", "RAZON", "Por qué lo piensa", "¿Por qué lo piensas así?")
GENERICA = "¿Podrías contarme un poco más?"
LARGO = "Una respuesta suficientemente larga para superar el mínimo de respaldo."


GUIA = GuiaSeguimiento("Un ejemplo propio", "¿Recuerdas una vez concreta?", ("Cuando armé…",), ("Siempre (sin vez)",))


def item(codigo="I1", texto=LARGO, criterios=(EJEMPLO, RAZON), minimo=None, opciones=(), guia=None, ecos=()):
    return ItemPorEvaluar(codigo, f"Consigna de {codigo}", criterios, opciones, texto, minimo, GENERICA, guia, ecos)


class EvaluadorDePrueba:
    def __init__(self, entrega=None, seguimiento=None, error=None):
        self.entrega, self.seguimiento, self.error = entrega, seguimiento, error
        self.contextos = []

    def evaluar_entrega(self, contexto):
        self.contextos.append(contexto)
        if self.error:
            raise self.error
        return self.entrega

    def evaluar_seguimiento(self, contexto):
        self.contextos.append(contexto)
        if self.error:
            raise self.error
        return self.seguimiento


def resultado_item(codigo="I1", cumple=True, abierto=False, sensible=False, falta=None, repregunta=None, emocional=False):
    return ResultadoItemEntrega(item=codigo, cumple=cumple, abierto=abierto, emocional=emocional, sensible=sensible,
                                falta=falta, repregunta=repregunta)


def test_interfaz_no_importa_sqlalchemy_fastapi_ni_modelos():
    codigo = (
        "import sys; import app.services.registro.evaluacion; "
        "assert not any(nombre == raiz or nombre.startswith(raiz + '.') "
        "for nombre in sys.modules for raiz in ('sqlalchemy', 'fastapi')); "
        "assert 'app.models.base' not in sys.modules"
    )
    resultado = subprocess.run([sys.executable, "-c", codigo], capture_output=True, text=True, check=False)
    assert resultado.returncode == 0, resultado.stderr


def test_constantes_de_registro_centralizadas():
    assert VERSION_PROMPT_REGISTRO == "v6.7"
    assert MAXIMO_SEGUIMIENTOS_POR_REGISTRO == 2


def test_contextos_solo_llevan_lo_que_pide_rnf13():
    assert {c.name for c in fields(ContextoEntrega)} == {"titulo_actividad", "items"}
    assert {c.name for c in fields(ItemEntrega)} == {
        "item", "consigna", "criterios", "guia", "opciones_elegidas", "ecos", "texto"}
    assert {c.name for c in fields(ContextoSeguimiento)} == {
        "titulo_actividad", "consigna", "criterios", "guia", "opciones_elegidas", "ecos", "texto_inicial", "turnos"}
    assert {c.name for c in fields(EcoEvaluacion)} == {"nombre", "texto"}
    assert {c.name for c in fields(CriterioEvaluacion)} == {"codigo", "tipo", "descripcion", "repregunta"}


# --- Pregunta y consolidada ------------------------------------------------------------------

@pytest.mark.parametrize("pregunta,valida", [
    ("¿Qué ejemplo de apoyo de tu mamá recuerdas?", True),
    ("¿Cómo evalúas tus opciones?", True),
    ("¿Es correcto lo que piensas?", True),
    ("Cuéntame un ejemplo.", False),
    ("¿Por qué? ¿Y cuándo?", False),
    ("¿Qué falta en C2?", False),
    ("¿Por qué tu respuesta está incompleta?", False),
    ("¿Podrías ampliar tu respuesta INSUFICIENTE?", False),
    ("¿Cumpliste el CRITERIO?", False),
    ("¿Tu respuesta es ADECUADA?", False),
    ("¿Está poco desarrollada?", False),
    ("¿" + "a" * MAXIMO_CARACTERES_PREGUNTA + "?", False),
    ("", False), (None, False), (9, False),
])
def test_pregunta_valida(pregunta, valida):
    assert pregunta_valida(pregunta) is valida


def test_pregunta_compara_sin_tildes_ni_mayusculas():
    assert not pregunta_valida("¿Sientes que quedó INCOMPLÉTA?")


def test_pregunta_invalida_se_reemplaza_por_el_texto_base():
    assert pregunta_o_base("Falta C2", item(guia=GUIA)) == GUIA.texto_base
    # Sin campos de seguimiento (ruta): la repregunta de su primer criterio.
    assert pregunta_o_base(None, item()) == EJEMPLO.repregunta
    assert pregunta_o_base("  ¿Qué te dijo tu mamá?  ", item()) == "¿Qué te dijo tu mamá?"


def test_consolidada_valida_o_concatenacion():
    turnos = (TurnoEvaluacion("¿Por qué?", "Porque me gusta"), TurnoEvaluacion("¿Cuándo?", None))
    assert concatenar(" Inicial ", turnos) == "Inicial\n\nPorque me gusta"
    concatenacion = concatenar("Inicial", turnos)
    limite = int(FACTOR_MAXIMO_CONSOLIDADA * len(concatenacion) + MARGEN_CONSOLIDADA)  # ajuste pruebas llm
    assert consolidada_o_concatenacion("Inicial, porque me gusta", "Inicial", turnos) == "Inicial, porque me gusta"
    assert consolidada_o_concatenacion("x" * limite, "Inicial", turnos) == "x" * limite
    assert consolidada_o_concatenacion("x" * (limite + 1), "Inicial", turnos) == concatenacion
    assert consolidada_o_concatenacion("   ", "Inicial", turnos) == concatenacion
    assert consolidada_o_concatenacion(None, "Inicial", turnos) == concatenacion


# --- Validación de esquemas ------------------------------------------------------------------

def contexto_entrega(*items):
    return ContextoEntrega("Actividad", tuple(ItemEntrega(i.codigo, i.consigna, i.criterios, None, (), (), i.texto)
                                              for i in (items or (item(),))))


@pytest.mark.parametrize("resultado", [
    ResultadoEntrega(items=[]),
    ResultadoEntrega(items=[resultado_item(), resultado_item()]),
    ResultadoEntrega(items=[resultado_item("OTRO")]),
    {"items": [{"item": "I1", "cumple": "sí", "abierto": False, "sensible": False, "falta": None,
                "repregunta": None}]},
    {"items": [{"item": "I1", "cumple": True, "abierto": False, "falta": None, "repregunta": None}]},
    {"items": [{"item": "I1", "clasificacion": "ADECUADA", "criterios_faltantes": [], "pregunta": None}]},
    {"items": [], "extra": 1},
])
def test_entrega_invalida_es_error(resultado):
    with pytest.raises(ErrorResultadoEvaluacion):
        validar_entrega(resultado, contexto_entrega())


def test_seguimiento_fuera_del_esquema_es_error():
    contexto = ContextoSeguimiento("A", "C", (EJEMPLO, RAZON), None, (), (), "Inicial",
                                   (TurnoEvaluacion("¿Por qué?", "Porque sí"),))
    for resultado in ({"cumple": "DATO DE PRUEBA"}, {"clasificacion": "ADECUADA", "criterios_faltantes": [],
                                                     "pregunta": None, "consolidada": "x"}):
        with pytest.raises(ErrorResultadoEvaluacion):
            validar_seguimiento(resultado, contexto)


# --- Entrega ---------------------------------------------------------------------------------

def test_entrega_hace_una_sola_llamada_y_solo_con_items_con_criterios():
    falso = EvaluadorFalso()
    evaluaciones = procesar_entrega("Actividad", (
        item("I1", f"{LARGO} [vaga]", opciones=("Mi familia",)), item("I2", "Corto", criterios=()),
        item("I3", "Corto", criterios=(), minimo=10), item("I4"),
    ), falso, modelo="m")
    assert falso.llamadas_entrega == 1
    contexto, = falso.contextos
    assert [i.item for i in contexto.items] == ["I1", "I4"]
    assert contexto.items[0].opciones_elegidas == ("Mi familia",)
    i1 = evaluaciones["I1"]
    assert (i1.origen, i1.clasificacion, i1.criterios_faltantes) == (
        OrigenEvaluacion.LLM, ClasificacionRespuesta.POCO_DESARROLLADA, ("C1", "C2"))
    assert i1.pregunta == f"Sobre lo que contaste: {EJEMPLO.repregunta}"
    assert (i1.modelo, i1.version_prompt) == ("m", "v6.7")
    # Sin criterios: en código, con extensión mínima como único criterio.
    i2, i3 = evaluaciones["I2"], evaluaciones["I3"]
    assert (i2.origen, i2.clasificacion, i2.pregunta, i2.error) == (
        OrigenEvaluacion.EXTENSION_MINIMA, ClasificacionRespuesta.ADECUADA, None, None)
    assert (i3.origen, i3.clasificacion, i3.pregunta) == (
        OrigenEvaluacion.EXTENSION_MINIMA, ClasificacionRespuesta.POCO_DESARROLLADA, GENERICA)
    assert evaluaciones["I4"].clasificacion == ClasificacionRespuesta.ADECUADA
    assert json.loads(i1.texto_evaluado) == {"texto_inicial": f"{LARGO} [vaga]", "turnos": []}


def test_entrega_sin_items_con_criterios_no_llama():
    falso = EvaluadorFalso()
    procesar_entrega("A", (item(criterios=()),), falso)
    assert falso.llamadas_entrega == 0


@pytest.mark.parametrize("marca,base", [
    ("[falta:C2]", RAZON.repregunta), ("[falta:RAZON]", RAZON.repregunta), ("[falta:EJEMPLO,RAZON]", EJEMPLO.repregunta),
    ("[vaga]", EJEMPLO.repregunta),
])
def test_falso_marcas_por_codigo_y_por_tipo(marca, base):
    evaluacion = procesar_entrega("A", (item(texto=f"{LARGO} {marca}"),), EvaluadorFalso())["I1"]
    # El contrato v5 no distingue criterios: si no cumple, faltan todos los del ítem.
    assert evaluacion.criterios_faltantes == ("C1", "C2") and evaluacion.pregunta.endswith(base)


def test_falso_pregunta_invalida_cae_en_el_texto_base():
    evaluacion = procesar_entrega("A", (item(texto=f"{LARGO} [falta:RAZON] [pregunta-invalida]"),),
                                  EvaluadorFalso())["I1"]
    assert evaluacion.pregunta == EJEMPLO.repregunta
    con_guia = procesar_entrega("A", (item(texto=f"{LARGO} [vaga] [pregunta-invalida]", guia=GUIA),),
                                EvaluadorFalso())["I1"]
    assert con_guia.pregunta == GUIA.texto_base


def test_sensible_gana_sobre_cumple_y_en_la_entrega_abierto_se_ignora():
    evaluaciones = procesar_entrega("A", (item("S", f"{LARGO} [sensible] [vaga]"), item("B", f"{LARGO} [abierto]")),
                                    EvaluadorFalso())
    sensible, abierto = evaluaciones["S"], evaluaciones["B"]
    assert (sensible.clasificacion, sensible.sensible, sensible.pregunta) == (
        ClasificacionRespuesta.ADECUADA, True, None)
    # En la entrega aún no hubo repregunta: la propuesta del modelo no cuenta.
    assert (abierto.clasificacion, abierto.abierto) == (ClasificacionRespuesta.POCO_DESARROLLADA, False)
    assert abierto.falta == EJEMPLO.descripcion


def test_el_contexto_lleva_guia_y_ecos():
    falso = EvaluadorFalso()
    eco = EcoEvaluacion("PLAN", "DATO DE PRUEBA: Enfermería")
    procesar_entrega("A", (item(guia=GUIA, ecos=(eco,)),), falso)
    enviado, = falso.contextos[0].items
    assert enviado.guia == GUIA and enviado.ecos == (eco,)


def test_json_invalido_aplica_respaldo_sin_sensible():
    evaluacion = procesar_entrega("A", (item("I1", "Breve [json-invalido] [sensible]", guia=GUIA),),
                                  EvaluadorFalso())["I1"]
    assert (evaluacion.clasificacion, evaluacion.pregunta, evaluacion.sensible) == (
        ClasificacionRespuesta.POCO_DESARROLLADA, GUIA.texto_base, False)


@pytest.mark.parametrize("error,mensaje", [
    (RuntimeError("secreto"), "Falló el evaluador"), (TimeoutError("secreto"), "tiempo máximo"),
])
def test_entrega_con_fallo_aplica_respaldo_por_item(error, mensaje):
    evaluaciones = procesar_entrega("A", (item("CORTO", "Breve"), item("LARGO"), item("MIN", "Doce letras", minimo=5),
                                          item("SIN", "x", criterios=())), EvaluadorDePrueba(error=error))
    corto, largo, minimo, sin = (evaluaciones[c] for c in ("CORTO", "LARGO", "MIN", "SIN"))
    assert (corto.origen, corto.clasificacion, corto.pregunta, corto.criterios_faltantes) == (
        OrigenEvaluacion.EXTENSION_MINIMA, ClasificacionRespuesta.POCO_DESARROLLADA, GENERICA, ("C1", "C2"))
    assert (largo.clasificacion, largo.pregunta) == (ClasificacionRespuesta.NO_EVALUADA, None)
    assert minimo.clasificacion == ClasificacionRespuesta.NO_EVALUADA
    assert mensaje in corto.error and "secreto" not in corto.error
    assert sin.error is None and sin.clasificacion == ClasificacionRespuesta.ADECUADA


def test_entrega_invalida_aplica_respaldo():
    evaluacion = procesar_entrega("A", (item(),), EvaluadorDePrueba(ResultadoEntrega(items=[])))["I1"]
    assert evaluacion.origen == OrigenEvaluacion.EXTENSION_MINIMA and "esquema" in evaluacion.error


def test_entrega_tardia_se_descarta(monkeypatch):
    tiempos = iter([0.0, 10.0])
    monkeypatch.setattr("app.services.registro.evaluacion.perf_counter", lambda: next(tiempos))
    evaluacion = procesar_entrega("A", (item(),), EvaluadorFalso(), tiempo_maximo_segundos=8)["I1"]
    assert evaluacion.origen == OrigenEvaluacion.EXTENSION_MINIMA and "tiempo máximo" in evaluacion.error


@pytest.mark.parametrize("tiempo", [0, -1, float("inf"), True])
def test_tiempo_maximo_invalido_no_llama(tiempo):
    falso = EvaluadorFalso()
    with pytest.raises(ValueError):
        procesar_entrega("A", (item(),), falso, tiempo_maximo_segundos=tiempo)
    assert falso.llamadas_entrega == 0


# --- Seguimiento -----------------------------------------------------------------------------

def seguir(respuesta, evaluador=None, generica=False, criterios=(EJEMPLO, RAZON), minimo=None):
    turnos = (TurnoEvaluacion("¿Por qué?", respuesta),)
    return procesar_seguimiento("A", item(texto="Inicial", criterios=criterios, minimo=minimo), turnos,
                                evaluador or EvaluadorFalso(), pregunta_generica=generica)


def test_seguimiento_reevalua_y_consolida():
    falso = EvaluadorFalso()
    evaluacion = seguir("Porque me gusta", falso)
    assert falso.llamadas_seguimiento == 1
    contexto, = falso.contextos
    # Solo lo declarado en `ecos_llm` (aquí nada): nunca las demás respuestas de la actividad.
    assert contexto.texto_inicial == "Inicial" and contexto.ecos == ()
    assert (evaluacion.origen, evaluacion.clasificacion, evaluacion.pregunta) == (
        OrigenEvaluacion.LLM, ClasificacionRespuesta.ADECUADA, None)
    assert evaluacion.consolidada == "Inicial\n\nPorque me gusta"


def test_seguimiento_sigue_poco_desarrollado_con_nueva_pregunta():
    evaluacion = seguir("Porque sí [vaga]")
    assert evaluacion.clasificacion == ClasificacionRespuesta.POCO_DESARROLLADA
    assert evaluacion.criterios_faltantes == ("C1", "C2") and evaluacion.pregunta.endswith(EJEMPLO.repregunta)


def test_seguimiento_consolidada_invalida_usa_concatenacion():
    assert seguir("Porque sí [consolidada-invalida]").consolidada == "Inicial\n\nPorque sí [consolidada-invalida]"


def test_seguimiento_con_fallo_queda_no_evaluada_con_concatenacion():
    evaluacion = seguir("Porque sí [falla]")
    assert (evaluacion.origen, evaluacion.clasificacion, evaluacion.pregunta) == (
        OrigenEvaluacion.EXTENSION_MINIMA, ClasificacionRespuesta.NO_EVALUADA, None)
    assert evaluacion.error and evaluacion.consolidada == "Inicial\n\nPorque sí [falla]"


def test_seguimiento_tras_la_generica_no_llama():
    falso = EvaluadorFalso()
    evaluacion = seguir("Algo más", falso, generica=True)
    assert falso.llamadas_seguimiento == 0
    assert (evaluacion.clasificacion, evaluacion.error, evaluacion.consolidada) == (
        ClasificacionRespuesta.NO_EVALUADA, None, "Inicial\n\nAlgo más")


def test_seguimiento_de_item_sin_criterios_mide_la_concatenacion():
    falso = EvaluadorFalso()
    assert seguir("abc", falso, criterios=(), minimo=40).clasificacion == ClasificacionRespuesta.POCO_DESARROLLADA
    adecuada = seguir("Ahora sí, con bastante más detalle", falso, criterios=(), minimo=40)
    assert adecuada.clasificacion == ClasificacionRespuesta.ADECUADA and falso.llamadas_seguimiento == 0


def test_contexto_sin_datos_de_la_cuenta():
    falso = EvaluadorFalso()
    procesar_entrega("A", (item(),), falso)
    serializado = json.dumps(asdict(falso.contextos[0]), ensure_ascii=False)
    assert "est-ana" not in serializado and "Ana" not in serializado


# --- Ajuste pruebas llm: respuesta emocional ------------------------------------------------

def test_emocional_queda_sin_pregunta_y_una_repregunta_nula_sin_emocional_usa_el_texto_base():
    evaluador = EvaluadorDePrueba(entrega=ResultadoEntrega(items=[
        resultado_item("I1", cumple=False, emocional=True, falta="Te faltó contar qué hiciste tú."),
        resultado_item("I2", cumple=False, emocional=True, repregunta="Dices que te cansa. ¿Qué hiciste?"),
        resultado_item("I3", cumple=False, repregunta="Falta C1"),
        resultado_item("I4", cumple=False),
        resultado_item("I5", cumple=False, abierto=True)]))
    evaluaciones = procesar_entrega("A", tuple(item(f"I{n}", guia=GUIA) for n in range(1, 6)), evaluador)
    assert (evaluaciones["I1"].clasificacion, evaluaciones["I1"].pregunta, evaluaciones["I1"].falta) == (
        ClasificacionRespuesta.POCO_DESARROLLADA, None, "Te faltó contar qué hiciste tú.")
    # `emocional` manda aunque el modelo escriba una repregunta.
    assert evaluaciones["I2"].pregunta is None
    # Inválida o nula sin `emocional`, también con el `abierto` que se ignora en la entrega: el texto base.
    assert [evaluaciones[c].pregunta for c in ("I3", "I4", "I5")] == [GUIA.texto_base] * 3
    assert evaluaciones["I5"].abierto is False


def test_falso_emocional_no_cumple_con_falta_y_sin_repregunta():
    evaluacion = procesar_entrega("A", (item(texto=f"{LARGO} [emocional]", guia=GUIA),), EvaluadorFalso())["I1"]
    assert (evaluacion.clasificacion, evaluacion.pregunta, evaluacion.falta) == (
        ClasificacionRespuesta.POCO_DESARROLLADA, None, GUIA.que_busca)
    seguimiento = procesar_seguimiento("A", item(texto="Inicial", guia=GUIA),
                                       (TurnoEvaluacion("¿Cuándo?", "No quiero [emocional]"),), EvaluadorFalso(),
                                       pregunta_generica=False)
    assert (seguimiento.clasificacion, seguimiento.pregunta) == (ClasificacionRespuesta.POCO_DESARROLLADA, None)


def test_seguimiento_repregunta_nula_sin_emocional_usa_el_texto_base_y_conserva_abierto():
    evaluador = EvaluadorDePrueba(seguimiento=ResultadoSeguimiento(
        cumple=False, abierto=True, emocional=False, sensible=False, falta=None, repregunta=None, consolidada="Inicial"))
    evaluacion = procesar_seguimiento("A", item(texto="Inicial", guia=GUIA), (TurnoEvaluacion("¿Cuándo?", "No sé"),),
                                      evaluador, pregunta_generica=False)
    assert (evaluacion.abierto, evaluacion.pregunta) == (True, GUIA.texto_base)


def test_consolidada_con_margen_para_respuestas_cortas():
    corto = (TurnoEvaluacion("¿Con quién?", "x" * 20),)
    assert len(concatenar("y" * 14, corto)) == 36
    assert consolidada_o_concatenacion("z" * 72, "y" * 14, corto) == "z" * 72  # 72 <= 1.5 × 36 + 60
    largo = (TurnoEvaluacion("¿Con quién?", "x" * 48),)
    assert len(concatenar("y" * 50, largo)) == 100
    assert consolidada_o_concatenacion("z" * 300, "y" * 50, largo) == concatenar("y" * 50, largo)  # 300 > 210
