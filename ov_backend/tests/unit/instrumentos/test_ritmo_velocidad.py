"""HU-096: la regla pura del aviso de velocidad."""

from types import SimpleNamespace

from app.services.instrumentos.calculo import EstadoRitmo, evaluar_ritmo, umbral_ms


INSTRUMENTO = SimpleNamespace(ms_por_palabra=150, ms_respuesta=1200, racha_aviso=4)
ITEM = SimpleNamespace(enunciado='Me gusta trabajar con números y figuras.')  # 7 palabras: 2250 ms
RAPIDO, LENTO = 2249, 2250


def recorrer(tiempos, estado=EstadoRitmo()):
    avisos = []
    for tiempo in tiempos:
        estado, aviso = evaluar_ritmo(estado, ITEM, tiempo, INSTRUMENTO)
        avisos.append(aviso)
    return estado, avisos


def test_umbral_por_palabras_y_opciones_de_la_escala():
    assert umbral_ms(ITEM.enunciado, 150, 1200) == 2250
    assert umbral_ms(' '.join(['palabra'] * 17), 150, 1200) == 3750
    assert umbral_ms(ITEM.enunciado, 150, 800) == 1850


def test_el_umbral_mismo_no_es_rapido():
    assert recorrer([RAPIDO])[0].racha_rapida == 1
    assert recorrer([LENTO])[0].racha_rapida == 0


def test_primer_aviso_en_el_cuarto_rapido_y_deja_los_contadores_en_cero():
    estado, avisos = recorrer([RAPIDO] * 4)
    assert avisos == [None, None, None, 1]
    assert estado == EstadoRitmo(racha_rapida=0, items_desde_aviso=0, avisos_velocidad=1)


def test_un_item_lento_rompe_la_racha_pero_suma_items():
    estado, avisos = recorrer([RAPIDO, RAPIDO, RAPIDO, LENTO, RAPIDO, RAPIDO, RAPIDO])
    assert avisos == [None] * 7
    assert estado == EstadoRitmo(racha_rapida=3, items_desde_aviso=7, avisos_velocidad=0)


def test_el_segundo_aviso_respeta_los_diez_items_de_separacion():
    # Primer aviso en el ítem 4; el segundo solo es posible desde el ítem 14, con otra racha de 4.
    _, avisos = recorrer([RAPIDO] * 14)
    assert avisos[:13] == [None, None, None, 1] + [None] * 9
    assert avisos[13] == 2


def test_tras_diez_items_el_segundo_aun_exige_la_racha():
    _, avisos = recorrer([RAPIDO] * 4 + [LENTO] * 10 + [RAPIDO] * 4)
    assert avisos[4:] == [None] * 13 + [2]


def test_tope_de_dos_avisos():
    estado, avisos = recorrer([RAPIDO] * 40)
    assert [aviso for aviso in avisos if aviso] == [1, 2]
    assert estado.avisos_velocidad == 2


def test_sin_tiempo_no_cambia_ningun_contador():
    estado, avisos = recorrer([RAPIDO, RAPIDO, RAPIDO, None])
    assert avisos == [None] * 4
    assert estado == EstadoRitmo(racha_rapida=3, items_desde_aviso=3, avisos_velocidad=0)
    assert recorrer([RAPIDO], estado)[1] == [1]


def test_sin_permiso_no_avisa_aunque_cumpla():
    estado = EstadoRitmo(racha_rapida=3, items_desde_aviso=3)
    nuevo, aviso = evaluar_ritmo(estado, ITEM, RAPIDO, INSTRUMENTO, permitir_aviso=False)
    assert aviso is None
    assert nuevo == EstadoRitmo(racha_rapida=4, items_desde_aviso=4)
