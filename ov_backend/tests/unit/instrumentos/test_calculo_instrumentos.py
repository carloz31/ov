"""Sección 9.1: pruebas puras, sin sesiones SQL ni lectura del Excel."""

import pytest

from app.services.instrumentos.calculo import (
    CodigoInteresCalculado, DimensionCalculada, ItemParaCalculo, OcupacionAfin, PerfilOcupacion,
    calcular_codigo_interes, calcular_coincidencias, calcular_dimension, calcular_dimensiones_destacadas,
    calcular_parecido, calcular_pearson, calcular_puntaje_item, clasificar_banda, puntaje_visual,
    recomendar_familias, seleccionar_afines,
)


VECTOR_A = (21, 9, 17, 20, 28, 15)
VECTOR_B = (27, 24, 18, 17, 23, 18)


@pytest.mark.parametrize("vector_ocupacion, esperado, banda", [
    ((4.2, 1.8, 3.4, 4.0, 5.6, 3.0), 1.000000, "MUY_AFIN"),
    ((5.0, 1.0, 2.0, 4.0, 6.0, 4.5), 0.845946, "MUY_AFIN"),
    ((3.0, 2.5, 3.5, 5.0, 4.5, 2.0), 0.681419, "AFIN"),
    ((1.00, 1.69, 3.87, 3.14, 7.00, 4.43), 0.584176, "AFIN"),
])
def test_pearson_y_banda_con_vectores_de_la_especificacion(vector_ocupacion, esperado, banda):
    # Ajuste resultados-intereses: la banda reemplaza al nivel de ajuste O*NET.
    correlacion = calcular_pearson(VECTOR_A, vector_ocupacion)
    assert correlacion == pytest.approx(esperado, abs=1e-6, rel=0)
    assert clasificar_banda(calcular_parecido(correlacion)) == banda


def test_correlacion_negativa_del_notebook_se_descarta():
    ocupacion = PerfilOcupacion("11-1021.00", "General and Operations Managers", (2.20, 2.37, 1.29, 3.38, 7, 5.34))
    correlacion = calcular_pearson(VECTOR_B, ocupacion.puntajes)
    assert correlacion == pytest.approx(-0.061193, abs=1e-6, rel=0)
    resultado = calcular_coincidencias(VECTOR_B, [ocupacion])
    assert resultado.perfil_plano is False
    assert resultado.coincidencias == ()


@pytest.mark.parametrize("correlacion, parecido, banda", [
    (1, 100, "MUY_AFIN"), (0.695, 70, "MUY_AFIN"), (0.6949, 69, "AFIN"), (0.5, 50, "AFIN"),
    (0.4951, 50, "AFIN"), (0.4949, 49, "CERCANA"), (0, 0, "CERCANA"),
])
def test_parecido_redondea_la_mitad_hacia_arriba_y_bandas_inclusivas(correlacion, parecido, banda):
    assert calcular_parecido(correlacion) == parecido
    assert clasificar_banda(parecido) == banda


@pytest.mark.parametrize("puntaje, minimo, maximo, inverso, esperado", [
    (1, 0, 1, True, 0), (0, 0, 1, True, 1), (1, 0, 4, True, 3),
    (4, 0, 4, True, 0), (0, 0, 4, True, 4), (3, 1, 4, True, 2),
    (0, 0, 4, False, 0), (3, 0, 4, False, 3),
])
def test_puntuacion_e_inversion_segun_limites_de_la_escala(puntaje, minimo, maximo, inverso, esperado):
    assert calcular_puntaje_item(puntaje, minimo, maximo, inverso) == esperado


@pytest.mark.parametrize("valor, minimo, maximo, esperado", [
    (0, 0, 40, 0), (40, 0, 40, 100), (21, 0, 40, 53), (27, 0, 40, 68), (1, 0, 8, 13), (4, 0, 7, 57),
    (1, 0, 3, 33), (2, 0, 3, 67), (1, 1, 7, 0), (7, 1, 7, 100), (4, 1, 7, 50), (5.54, 1, 7, 76), (1.6, 1, 7, 10),
    (2.5, 0, 5, 50),
])
def test_puntaje_visual_de_cero_a_cien_redondea_la_mitad_hacia_arriba(valor, minimo, maximo, esperado):
    # Ajuste carga-instrumentos: 21/40 = 52,5 → 53 y 1/8 = 12,5 → 13, no al par como round().
    assert puntaje_visual(valor, minimo, maximo) == esperado


def test_dimension_suma_puntajes_y_maximos_con_escalas_distintas():
    # Máximos 1+4+4=9; puntajes 1+(4-1)+(4+1-4)=5.
    items = [ItemParaCalculo(1, 0, 1), ItemParaCalculo(1, 0, 4, inverso=True),
             ItemParaCalculo(4, 1, 4, inverso=True)]
    assert calcular_dimension("DIM-DEMO", iter(items)) == DimensionCalculada("DIM-DEMO", 5, 9)


@pytest.mark.parametrize("valores, esperadas", [
    ([(3, 4), (3, 4), (2, 4)], ("D-2", "D-1")),
    ([(4, 7), (1, 2)], ("D-2",)),
    ([(0, 7), (0, 4), (0, 5)], ("D-2", "D-1", "D-0")),
    ([(4, 7), (5714, 10000)], ("D-2",)),
    ([(4, 7), (8, 14)], ("D-2", "D-1")),
])
def test_dimensiones_destacadas_compara_proporciones_exactas_y_conserva_empates(valores, esperadas):
    dimensiones = [DimensionCalculada(f"D-{2 - n}", puntaje, maximo) for n, (puntaje, maximo) in enumerate(valores)]
    assert calcular_dimensiones_destacadas(dimensiones) == esperadas


@pytest.mark.parametrize("numeros, puntaje, maximo, visual", [
    ([1, 8, 11, 17, 21, 24, 27, 36, 41, 43], 7, 10, 70),
    ([3, 6, 13, 20, 25, 28, 37], 4, 7, 57),
    ([7, 18, 26, 29], 2, 4, 50), ([2, 14, 19, 30, 38], 1, 5, 20),
    ([5, 10, 31, 39], 3, 4, 75), ([4, 9, 16, 22, 32, 34, 40, 42], 1, 8, 13),
    ([12, 15, 23, 33, 35], 4, 5, 80),
])
def test_calculo_de_inteligencias_con_si_en_impares(numeros, puntaje, maximo, visual):
    items = [ItemParaCalculo(1 if numero % 2 else 0, 0, 1) for numero in numeros]
    resultado = calcular_dimension("INT", items)
    assert (resultado.puntaje, resultado.puntaje_maximo) == (puntaje, maximo)
    assert puntaje_visual(resultado.puntaje, 0, resultado.puntaje_maximo) == visual


@pytest.mark.parametrize("codigo, numeros, inversos, puntaje, maximo, visual", [
    ("HAB-ASE", [1, 10, 15, 19, 21], set(), 2, 5, 40),
    ("HAB-EMP", [4, 7, 16, 22], set(), 2, 4, 50),
    ("HAB-LID", [5, 14, 20], {5, 20}, 1, 3, 33),
    ("HAB-RES", [6, 13, 17, 24], set(), 1, 4, 25),
    ("HAB-EXP", [3, 8, 23], {3, 8}, 0, 3, 0),
    ("HAB-VAL", [2, 9, 11, 12, 18], set(), 4, 5, 80),
])
def test_calculo_de_habilidades_con_items_inversos(codigo, numeros, inversos, puntaje, maximo, visual):
    items = [ItemParaCalculo(1 if numero <= 12 else 0, 0, 1, inverso=numero in inversos) for numero in numeros]
    assert calcular_dimension(codigo, items) == DimensionCalculada(codigo, puntaje, maximo)
    assert puntaje_visual(puntaje, 0, maximo) == visual


@pytest.mark.parametrize("cadena, puntajes, visuales, codigo", [
    ("511222115515411122551525542552114321231141335215514152553521",
     (21, 9, 17, 20, 28, 15), (53, 23, 43, 50, 70, 38), "ERS"),
    ("333322223322343333233333443333333333444433333433444433334433",
     (27, 24, 18, 17, 23, 18), (68, 60, 45, 43, 58, 45), "RIE"),
])
def test_puntuacion_de_las_cadenas_riasec_completas(cadena, puntajes, visuales, codigo):
    resultados = []
    for dimension in "RIASEC":
        items = [ItemParaCalculo(int(opcion) - 1, 0, 4) for indice, opcion in enumerate(cadena)
                 if "RRIIAASSEECC"[indice % 12] == dimension]
        resultados.append(calcular_dimension(dimension, items))
    assert tuple(r.puntaje for r in resultados) == puntajes
    assert tuple(r.puntaje_maximo for r in resultados) == (40,) * 6
    assert tuple(puntaje_visual(r.puntaje, 0, r.puntaje_maximo) for r in resultados) == visuales
    assert calcular_codigo_interes(puntajes) == CodigoInteresCalculado(codigo, hay_empate=False)


@pytest.mark.parametrize("puntajes, codigo, hay_empate", [
    (VECTOR_A, "ERS", False), (VECTOR_B, "RIE", False), ((20,) * 6, "RIA", True),
    ((10, 10, 30, 30, 20, 20), "ASE", True), ((30, 30, 20, 10, 5, 0), "RIA", False),
])
def test_codigo_de_interes_y_empate_solo_en_el_corte(puntajes, codigo, hay_empate):
    assert calcular_codigo_interes(puntajes) == CodigoInteresCalculado(codigo, hay_empate)


def test_guarda_todas_sin_tope_desempata_por_codigo_y_asigna_posiciones():
    # Ajuste resultados-intereses: se guardan todas las de r ≥ 0, sin el tope de 10.
    ocupaciones = [PerfilOcupacion(f"O-{numero:02}", f"Ocupación {numero}", VECTOR_A) for numero in range(12, 0, -1)]
    resultado = calcular_coincidencias(VECTOR_A, iter(ocupaciones))
    assert resultado.perfil_plano is False
    assert [c.codigo_onet for c in resultado.coincidencias] == [f"O-{numero:02}" for numero in range(1, 13)]
    assert [c.posicion for c in resultado.coincidencias] == list(range(1, 13))
    assert all(c.correlacion == pytest.approx(1) for c in resultado.coincidencias)
    assert [o.codigo_onet for o in ocupaciones] == [f"O-{numero:02}" for numero in range(12, 0, -1)]


def test_top_ordena_por_pearson_y_conserva_precision_y_titulos():
    ocupaciones = [
        PerfilOcupacion("01-GOOD", "Advertising and Promotions Managers", (1, 1.69, 3.87, 3.14, 7, 4.43)),
        PerfilOcupacion("02-GREAT", "GREAT", (3, 2.5, 3.5, 5, 4.5, 2)),
        PerfilOcupacion("03-BEST", "BEST", (5, 1, 2, 4, 6, 4.5)),
    ]
    coincidencias = calcular_coincidencias(VECTOR_A, ocupaciones).coincidencias
    assert [c.codigo_onet for c in coincidencias] == ["03-BEST", "02-GREAT", "01-GOOD"]
    assert [c.posicion for c in coincidencias] == [1, 2, 3]
    assert coincidencias[-1].titulo == "Advertising and Promotions Managers"
    for coincidencia, esperado in zip(coincidencias, (0.845946, 0.681419, 0.584176), strict=True):
        assert coincidencia.correlacion == pytest.approx(esperado, abs=1e-6, rel=0)
        assert coincidencia.correlacion != round(coincidencia.correlacion, 6)


def test_perfil_plano_no_evalua_ocupaciones():
    def ocupaciones():
        raise AssertionError("Un perfil plano no debe consultar ni calcular ocupaciones")
        yield

    resultado = calcular_coincidencias((20,) * 6, ocupaciones())
    assert resultado.perfil_plano is True
    assert resultado.coincidencias == ()
    assert calcular_codigo_interes((20,) * 6) == CodigoInteresCalculado("RIA", True)


@pytest.mark.parametrize("operacion", [
    lambda: calcular_puntaje_item(5, 0, 4), lambda: calcular_puntaje_item(1, 4, 0),
    lambda: calcular_puntaje_item(float("nan"), 0, 4),
    lambda: calcular_dimension("SIN-MAXIMO", [ItemParaCalculo(0, 0, 0)]),
    lambda: puntaje_visual(0, 0, 0), lambda: puntaje_visual(2, 3, 1),
    lambda: puntaje_visual(float("inf"), 0, 40), lambda: puntaje_visual(41, 0, 40), lambda: puntaje_visual(0, 1, 7),
    lambda: calcular_dimension("VACIA", []), lambda: calcular_codigo_interes((1, 2)),
    lambda: calcular_pearson(VECTOR_A, (1, 2, 3)),
    lambda: calcular_pearson(VECTOR_A, (1, 2, 3, 4, 5, float("nan"))),
    lambda: calcular_parecido(float("nan")), lambda: calcular_parecido(1.01),
    lambda: seleccionar_afines([("A", 0.4), ("B", 0.6)]), lambda: seleccionar_afines([("A", 1.2)]),
])
def test_calculo_rechaza_datos_invalidos_en_lugar_de_generar_resultados(operacion):
    with pytest.raises(ValueError):
        operacion()


def test_ocupacion_constante_provoca_error_identificando_su_codigo():
    ocupacion = PerfilOcupacion("O-PLANA", "Vector constante", (2,) * 6)
    with pytest.raises(ValueError, match="O-PLANA.*vector constante"):
        calcular_coincidencias(VECTOR_A, [ocupacion])


def _coincidencias(*correlaciones):
    return [(f"O-{n:02}", r) for n, r in enumerate(correlaciones, start=1)]


def test_afines_umbral_de_medio_y_tope_de_treinta():
    coincidencias = _coincidencias(*[0.9 - n * 0.01 for n in range(45)])
    afines = seleccionar_afines(coincidencias)
    # 0,9 … 0,5: 41 pasan el umbral; se muestran las 30 primeras.
    assert len(afines.ocupaciones) == 30 and afines.poco_marcado is False
    assert afines.ocupaciones[0] == OcupacionAfin("O-01", 0.9, 90, "MUY_AFIN")
    assert afines.ocupaciones[-1].parecido == 61 and afines.ocupaciones[-1].banda == "AFIN"
    medio = seleccionar_afines(_coincidencias(*[0.8] * 12, 0.5, 0.49, 0.3))
    assert [o.codigo for o in medio.ocupaciones] == [f"O-{n:02}" for n in range(1, 14)]


def test_afines_minimo_de_diez_marca_perfil_poco_marcado():
    afines = seleccionar_afines(_coincidencias(0.8, 0.6, 0.55, *[0.4 - n * 0.02 for n in range(12)]))
    assert afines.poco_marcado is True and len(afines.ocupaciones) == 10
    assert [o.banda for o in afines.ocupaciones[:4]] == ["MUY_AFIN", "AFIN", "AFIN", "CERCANA"]
    pocas = seleccionar_afines(_coincidencias(0.7, 0.2))
    assert pocas.poco_marcado is True and len(pocas.ocupaciones) == 2
    assert seleccionar_afines([]) .ocupaciones == ()


def _afines(**correlaciones):
    return [OcupacionAfin(codigo, r, calcular_parecido(r), clasificar_banda(calcular_parecido(r)))
            for codigo, r in sorted(correlaciones.items(), key=lambda par: -par[1])]


def test_familias_media_de_las_dos_mejores_con_relleno_y_desempate():
    afines = _afines(a1=0.9, a2=0.6, b1=0.85, c1=0.8, c2=0.79, c3=0.78, d1=0.7, sin=0.95)
    principal = {"a1": "300", "a2": "300", "b1": "200", "c1": "100", "c2": "100", "c3": "100", "d1": "400"}
    familias = recomendar_familias(afines, principal)
    # c: (0,8 + 0,79)/2 = 0,795; a: 0,75; b: (0,85 + 0,5)/2 = 0,675; d: 0,6. «sin» no tiene familia.
    assert [f.codigo for f in familias] == ["100", "300", "200", "400"]
    assert [o.codigo for o in familias[0].ocupaciones] == ["c1", "c2", "c3"]
    assert [f.unica_ocupacion for f in familias] == [False, False, True, True]
    empate = recomendar_familias(_afines(x=0.8, y=0.8), {"x": "900", "y": "050"})
    assert [f.codigo for f in empate] == ["050", "900"]


def test_familias_solo_las_cinco_mejores():
    afines = _afines(**{f"o{n}": 0.9 - n * 0.05 for n in range(7)})
    familias = recomendar_familias(afines, {f"o{n}": f"{n:03}" for n in range(7)})
    assert [f.codigo for f in familias] == ["000", "001", "002", "003", "004"]
