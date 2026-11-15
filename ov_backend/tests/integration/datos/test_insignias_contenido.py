"""Ajuste logros: las insignias y los niveles de `contenido`, sus páginas, textos y reglas."""

import re

import pytest
from sqlalchemy import select

from app import models as m
from datos import cargar, contenido


TITULOS = {codigo: titulo for codigo, _bloque, titulo, *_ in contenido.ACTIVIDADES}
TRAMOS = {codigo: nombre for codigo, _numero, nombre, *_ in contenido.BLOQUES}
REGLAS = {r[0]: r for r in contenido.REGLAS}
INSIGNIAS = {codigo: (nombre, descripcion, requisito, oculta)
             for codigo, nombre, descripcion, requisito, oculta in contenido.INSIGNIAS}
# Pasan a opcionales con el recorte del volcán y del puerto: ningún logro puede pedirlas.
OPCIONALES_RECORTADAS = {'b2-1', 'b2-2', 'b3-6', 'b3-7', 'b3-9'}
CODIGO_ACTIVIDAD = re.compile(r'\b(b\d-\d+|b\d-[a-z]|c\d|lumi-\d|h-[a-z]+-\d|conv-\d+|APL-[A-Z]+|t-[a-z])')


def _reglas_de(tipo):
    return [r for r in contenido.REGLAS if r[1] == tipo]


def test_veinticinco_insignias_en_cuatro_paginas():
    assert len(INSIGNIAS) == 25
    assert sum(oculta for *_, oculta in INSIGNIAS.values()) == 9
    assert [codigo for codigo, *_ in contenido.GRUPOS_INSIGNIA] == ['G-camino', 'G-ciudad', 'G-planes', 'G-oculto']
    assert contenido.PAGINAS_INSIGNIAS.keys() == INSIGNIAS.keys() == contenido.TEXTOS_INSIGNIAS.keys()
    por_pagina = {}
    for codigo, (pagina, orden) in contenido.PAGINAS_INSIGNIAS.items():
        por_pagina.setdefault(pagina, []).append(orden)
    assert {p: sorted(o) for p, o in por_pagina.items()} == {
        'G-camino': list(range(1, 9)), 'G-ciudad': list(range(1, 8)), 'G-planes': list(range(1, 6)),
        'G-oculto': list(range(1, 6))}


def test_pista_solo_en_las_ocultas():
    assert contenido.PISTAS_INSIGNIAS.keys() == {c for c, (*_, oculta) in INSIGNIAS.items() if oculta}


def test_cada_insignia_tiene_una_sola_regla_propia():
    reglas = _reglas_de('INSIGNIA')
    assert sorted(r[2] for r in reglas) == sorted(INSIGNIAS)
    assert all(r[0] == f'R-{r[2]}' for r in reglas)
    assert not any(r[0].startswith('R-t-') or str(r[2]).startswith('t-') for r in contenido.REGLAS)


def test_ningun_texto_nombra_codigos_de_actividad():
    textos = [t for nombre, descripcion, requisito, _ in INSIGNIAS.values() for t in (nombre, descripcion, requisito)]
    textos += [t for par in contenido.TEXTOS_INSIGNIAS.values() for t in par]
    textos += list(contenido.PISTAS_INSIGNIAS.values())
    textos += [r[3] for r in _reglas_de('INSIGNIA') + _reglas_de('NIVEL')]
    textos += [t for r in _reglas_de('INSIGNIA') + _reglas_de('NIVEL') for t in contenido.TEXTOS_CONDICIONES[r[0]]]
    textos += [t for _, titulo, descripcion in contenido.NIVELES for t in (titulo, descripcion)]
    assert [t for t in textos if CODIGO_ACTIVIDAD.search(t)] == []


def test_mensajes_nombran_el_titulo_de_su_referencia():
    faltan = [(r[0], referencia) for r in _reglas_de('INSIGNIA')
              for evento, referencia, *_ in r[4]
              if evento == 'COMPLETA_ACTIVIDAD' and referencia and f'«{TITULOS[referencia]}»' not in r[3]]
    assert faltan == []
    helena = REGLAS['R-ins-helena'][3]
    assert all(f'«{t}»' in helena for t in ('Lo que te atrae hacer', 'Cómo te relacionas', 'Tus formas de ser inteligente'))


def test_cada_condicion_tiene_su_texto():
    for r in _reglas_de('INSIGNIA') + _reglas_de('NIVEL'):
        assert len(contenido.TEXTOS_CONDICIONES[r[0]]) == len(r[4]), r[0]


def test_ningun_logro_pide_las_opcionales_del_recorte():
    assert [r[0] for r in _reglas_de('INSIGNIA')
            if {referencia for _, referencia, *_ in r[4]} & OPCIONALES_RECORTADAS] == []


def test_evaluadores_de_insignias():
    assert {r: v for r, v in contenido.EVALUADORES_REGLAS.items() if r.startswith('R-ins-')} == {
        'R-ins-sin-sombras': ('todas_las_batallas', None), 'R-ins-bitacora': ('todos_los_registros', None),
        'R-ins-isla': ('todas_las_actividades', None), 'R-ins-expediente': ('todos_los_casos', None),
        'R-ins-puertas': ('instituciones_tipos_distintos', None), 'R-ins-plan-completo': ('planes_completos', 1),
        'R-ins-planes-completos': ('planes_completos', 3), 'R-ins-sobremesa': ('todas_las_conversaciones', None)}


def test_cinco_niveles_con_texto_y_cita():
    assert [(n, t) for n, t, _ in contenido.NIVELES] == [
        (1, 'Visitante del muelle'), (2, 'Caminante sin apuro'), (3, 'Detective de pistas propias'),
        (4, 'Navegante de oficios'), (5, 'Timonel de rumbo propio')]
    assert all(descripcion for _, _, descripcion in contenido.NIVELES)
    assert sorted(contenido.CITAS_LUMI) == [1, 2, 3, 4, 5]


def _ultima_requerida(bloque):
    requeridas = [codigo for codigo, b, *_ in contenido.ACTIVIDADES
                  if b == bloque and contenido.PROPIEDADES.get(codigo, {}).get('requerida', True)]
    return requeridas[-1]


def test_niveles_dos_a_cinco_cierran_un_tramo():
    reglas = sorted(_reglas_de('NIVEL'), key=lambda r: r[2])
    assert [(r[0], r[2], r[4]) for r in reglas] == [
        (f'R-NIV-{n}', n, (('COMPLETA_BLOQUE', bloque, 'EVENTOS', 1),))
        for n, bloque in ((2, 'B0'), (3, 'B2'), (4, 'B3'), (5, 'B5'))]
    assert not any(r[0] in contenido.EVALUADORES_REGLAS for r in reglas)
    for r in reglas:
        bloque = r[4][0][1]
        assert f'«{TITULOS[_ultima_requerida(bloque)]}»' in r[3] and f'«{TRAMOS[bloque]}»' in r[3], r[0]
        assert contenido.TEXTOS_CONDICIONES[r[0]] == (f'Termina el tramo «{TRAMOS[bloque]}»',)


def test_la_carga_deja_insignias_y_niveles(sesion_contenido):
    insignias = {i.codigo: i for i in sesion_contenido.scalars(select(m.Insignia))}
    assert insignias.keys() == INSIGNIAS.keys()
    assert all(i.frase and i.logro and i.descripcion and i.requisito for i in insignias.values())
    assert {c for c, i in insignias.items() if i.pista} == contenido.PISTAS_INSIGNIAS.keys()
    grupos = {g.codigo for g in sesion_contenido.scalars(select(m.GrupoInsignia))}
    assert grupos == {'G-camino', 'G-ciudad', 'G-planes', 'G-oculto'}
    niveles = sesion_contenido.scalars(select(m.Nivel).order_by(m.Nivel.numero)).all()
    assert [(n.numero, n.titulo, n.cita_lumi) for n in niveles] == [
        (n, t, contenido.CITAS_LUMI[n]) for n, t, _ in contenido.NIVELES]
    reglas = sesion_contenido.scalars(select(m.ReglaDesbloqueo).where(
        m.ReglaDesbloqueo.tipo_objetivo.in_((m.TipoObjetivo.INSIGNIA, m.TipoObjetivo.NIVEL)))).all()
    assert len(reglas) == 25 + 4
    assert all(c.texto for r in reglas for c in r.condiciones)


@pytest.mark.parametrize('regla', [
    ('R-b0-2-lumi', 'ACTIVIDAD', 'b0-2', 'Escucha «De dónde vengo».', (('COMPLETA_ACTIVIDAD', 'lumi-1', 'EVENTOS', 1),)),
    ('R-ins-bloque-lumi', 'INSIGNIA', 'ins-lumi', 'Termina la historia de Lumi.',
     (('COMPLETA_BLOQUE', 'LUMI', 'EVENTOS', 1),)),
], ids=['actividad-con-recuerdo', 'insignia-con-bloque-lumi'])
def test_los_recuerdos_solo_los_puede_pedir_una_insignia(tmp_path, monkeypatch, regla):
    """Ajuste logros: la excepción cubre solo los recuerdos en reglas INSIGNIA; nada depende del bloque LUMI."""
    monkeypatch.setattr(contenido, 'REGLAS', (*contenido.REGLAS, regla))
    with pytest.raises(ValueError, match=f'La regla {regla[0]} depende de un recuerdo de Lumi o de su bloque'):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "contenido.db").as_posix()}', 'contenido', crear_tablas=True)
