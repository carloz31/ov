"""Tarjetas del LLM de registros (lote 1): bases separadas dentro del texto y un hash por tarjeta."""

import hashlib
import re

from datos.tarjetas_registros import HASHES, TARJETAS

_TIPO = '(?:general|no_sabe|vacio|fuera_de_tema)'
# La regex con que el runner leía las bases del texto (`evaluar_tarjetas.BASE_DE`, v7.12c).
BASE_DE = re.compile(rf'^[ \t]*({_TIPO}(?: / {_TIPO})*) ·(?:.*\n){{0,3}}?.*?BASE: «(.+?)»', re.M)


def _todas():
    """(clave, ficha) de cada tarjeta: las del ítem y las de sus opciones (`codigo#OPCION`)."""
    for codigo, ficha in TARJETAS.items():
        yield codigo, ficha
        for opcion, propia in ficha.get('por_opcion', {}).items():
            yield f'{codigo}#{opcion}', propia


def test_cada_base_esta_tal_cual_en_su_tarjeta():
    for clave, ficha in _todas():
        for tipo, base in ficha['bases'].items():
            assert f'BASE: «{base}»' in ficha['tarjeta'], (clave, tipo)
        for opcion, base in ficha.get('general_por_opcion', {}).items():
            assert f'{opcion}: «{base}»' in ficha['tarjeta'], (clave, opcion)


def test_las_bases_separadas_son_las_que_leia_el_runner():
    for clave, ficha in _todas():
        leidas = {}
        for tipos, base in BASE_DE.findall(ficha['tarjeta']):
            leidas.update(dict.fromkeys(tipos.split(' / '), base))
        assert ficha['bases'] == leidas, clave


def test_toda_tarjeta_trae_las_bases_que_no_hereda():
    for clave, ficha in _todas():
        assert {'no_sabe', 'vacio'} <= set(ficha['bases']), clave
        assert 'general' in ficha['bases'] or 'general_por_opcion' in ficha, clave


def test_no_sabe_y_vacio_solo_difieren_en_gustos():
    distintas = [c for c, f in _todas() if f['bases']['no_sabe'] != f['bases']['vacio']]
    assert distintas == ['b1-1-gustos']


def test_general_por_opcion_solo_en_contraste_y_cruce():
    assert [c for c, f in _todas() if 'general_por_opcion' in f] == ['b1-3-contraste', 'b2-4-cruce']


def test_siete_tarjetas_de_opcion():
    # Ajuste registros llm (lote 2): entra la de b1-1-logro#NINGUNO.
    assert sorted(c for c, _ in _todas() if '#' in c) == sorted([
        'b1-1-logro#NINGUNO', 'b1-3-mia#AUN_NO', 'b1-6-mito#NINGUNO', 'b1-7-dia#CUESTA', 'b3-4-quien#NADIE', 'b4-1-menos#TODO', 'b5-3-cambio#IGUAL'])


def test_filtrar_etiqueta_solo_en_logro():
    assert [c for c, f in _todas() if f['filtrar_etiqueta']] == ['b1-1-logro']


def test_un_hash_por_tarjeta():
    calculados = {c: hashlib.sha256(f['tarjeta'].encode('utf-8')).hexdigest() for c, f in _todas()}
    assert calculados == HASHES
    assert len(HASHES) == 28  # lote 2: b1-1-logro#NINGUNO


def test_las_tarjetas_solo_guardan_lo_que_usa_el_llm():
    """Lote 2: la presentación (pregunta, ecos, podio) vive en el ítem del contenido, no en la tarjeta."""
    for clave, ficha in _todas():
        assert set(ficha) <= {'tarjeta', 'bases', 'general_por_opcion', 'filtrar_etiqueta', 'por_opcion'}, clave
