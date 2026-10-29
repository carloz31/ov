"""Ajuste leyenda · HU-064 y HU-065: una entrevista destacada con FAVORITOS_LEYENDA favoritos de estudiantes (en
cualquier orden) es Leyenda; cada autor registra ENTREVISTA_LEYENDA una sola vez y obtiene t-ins-leyenda, que no
pierde aunque la entrevista deje de serlo."""

import pytest

from app.core.parametros import FAVORITOS_LEYENDA
from soporte_investigaciones import (
    FICHA, abrir_investigaciones, accion, codigo_publicado, detalle, entrevistas, guia_lista, publicar,
)
from soporte_ruta import pedir


AUTORES = ('est-ana', 'est-luis')
# DATO DE PRUEBA: compañeros de 5A que no son autores (datos/ruta.py) y Beto, de 5B.
FANS = ('est-mia', 'est-teo', 'est-sol')
OTRO_SALON = 'est-beto'


def publicar_con_luis(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    return codigo_publicado(publicar(cliente, coautores=['est-luis']))


def abrir_fans(cliente, cuentas=FANS):
    for cuenta in cuentas:
        abrir_investigaciones(cliente, cuenta)


def favorito(cliente, codigo, cuenta, esperado=200, nombre='marcar-favorito'):
    return pedir(cliente, 'POST', f'/acciones/{nombre}', {'cuenta': cuenta, 'tipo': 'ENTREVISTA', 'codigo': codigo},
                 esperado)


def destacar(cliente, codigo, destacada=True, esperado=200):
    return accion(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': destacada}, esperado,
                  cuenta='ori-carmen')


def es_leyenda(cliente, codigo):
    return detalle(cliente, codigo)['leyenda']


def eventos_leyenda(cliente, cuenta, tipo='ENTREVISTA_LEYENDA'):
    return [e for e in pedir(cliente, 'GET', f'/cuentas/{cuenta}/eventos') if e['tipo'] == tipo]


def sello(cliente, cuenta):
    insignia, = [i for i in pedir(cliente, 'GET', f'/cuentas/{cuenta}/logros')['insignias']
                 if i['codigo'] == 't-ins-leyenda']
    return insignia


def desbloqueos_sello(cliente, cuenta, solo_no_vistos=False):
    return [d for d in pedir(cliente, 'GET', f'/cuentas/{cuenta}/desbloqueos?solo_no_vistos={str(solo_no_vistos).lower()}')
            if d['objetivo']['codigo'] == 't-ins-leyenda']


def leyenda_completa(cliente, orden):
    """Ana publica con Luis, y Carmen destaca antes o después de los N favoritos de 5A."""
    codigo = publicar_con_luis(cliente)
    abrir_fans(cliente)
    if orden == 'destacada_primero':
        destacar(cliente, codigo)
    for n, fan in enumerate(FANS[:FAVORITOS_LEYENDA], start=1):
        assert not es_leyenda(cliente, codigo)
        respuesta = favorito(cliente, codigo, fan)
        # El sello es de los autores: no llega en la respuesta de quien marca.
        assert 'R-t-ins-leyenda' not in {d['regla'] for d in respuesta['nuevos_desbloqueos']}
        assert detalle(cliente, codigo)['favoritos'] == n
    if orden == 'favoritos_primero':
        assert not es_leyenda(cliente, codigo)
        destacar(cliente, codigo)
    return codigo


@pytest.mark.parametrize('orden', ['destacada_primero', 'favoritos_primero'])
def test_caso_completo_en_los_dos_ordenes(cliente, orden):
    codigo = leyenda_completa(cliente, orden)
    assert es_leyenda(cliente, codigo)
    for autor in AUTORES:
        assert [e['referencia'] for e in eventos_leyenda(cliente, autor)] == [codigo]
        obtenido = sello(cliente, autor)
        assert obtenido['estado'] == 'OBTENIDA' and obtenido['obtenida_en'] is not None
        # El desbloqueo queda sin ver: el front lo muestra como aviso al ingresar.
        pendiente, = desbloqueos_sello(cliente, autor, solo_no_vistos=True)
        assert pendiente['regla'] == 'R-t-ins-leyenda' and not pendiente['visto']
    assert all(sello(cliente, fan)['estado'] == 'BLOQUEADA' for fan in FANS)


def test_regla_1_destacada_sin_favoritos_suficientes_no_es_leyenda(cliente):
    codigo = publicar_con_luis(cliente)
    abrir_fans(cliente)
    destacar(cliente, codigo)
    for fan in FANS[:FAVORITOS_LEYENDA - 1]:
        favorito(cliente, codigo, fan)
    assert detalle(cliente, codigo)['destacada'] and not es_leyenda(cliente, codigo)
    assert all(not eventos_leyenda(cliente, autor) for autor in AUTORES)
    assert sello(cliente, 'est-ana')['estado'] == 'BLOQUEADA'


def test_regla_1_favoritos_sin_destacado_no_es_leyenda(cliente):
    codigo = publicar_con_luis(cliente)
    abrir_fans(cliente)
    for fan in FANS:
        favorito(cliente, codigo, fan)
    assert detalle(cliente, codigo)['favoritos'] == FAVORITOS_LEYENDA and not es_leyenda(cliente, codigo)
    assert sello(cliente, 'est-luis')['estado'] == 'BLOQUEADA'


def test_regla_2_cada_autor_registra_el_evento_y_obtiene_el_sello(cliente):
    codigo = leyenda_completa(cliente, 'destacada_primero')
    for autor in AUTORES:
        assert len(eventos_leyenda(cliente, autor)) == 1
        assert len(desbloqueos_sello(cliente, autor)) == 1
    # Marcar vistos los deja fuera del aviso, pero el sello sigue obtenido.
    pedir(cliente, 'POST', '/cuentas/est-luis/desbloqueos/marcar-vistos')
    assert desbloqueos_sello(cliente, 'est-luis', solo_no_vistos=True) == []
    assert sello(cliente, 'est-luis')['estado'] == 'OBTENIDA'
    assert entrevistas(cliente, 'est-luis', vista='MIAS')['items'][0]['leyenda']


def test_regla_3_la_ve_otro_salon_solo_como_leyenda(cliente):
    codigo = publicar_con_luis(cliente)
    abrir_fans(cliente, (*FANS, OTRO_SALON))
    destacar(cliente, codigo)
    for fan in FANS[:FAVORITOS_LEYENDA - 1]:
        favorito(cliente, codigo, fan)
    # Destacada pero aún no Leyenda: 5B no la ve ni puede marcarla.
    assert entrevistas(cliente, OTRO_SALON, vista='LEYENDAS')['items'] == []
    detalle(cliente, codigo, OTRO_SALON, esperado=404)
    favorito(cliente, codigo, OTRO_SALON, esperado=404)
    favorito(cliente, codigo, FANS[FAVORITOS_LEYENDA - 1])
    leyendas = entrevistas(cliente, OTRO_SALON, vista='LEYENDAS')
    assert [t['codigo'] for t in leyendas['items']] == [codigo] and leyendas['items'][0]['leyenda']
    assert entrevistas(cliente, OTRO_SALON, vista='SALON')['items'] == []
    assert detalle(cliente, codigo, OTRO_SALON)['leyenda']


def test_regla_4_los_autores_no_marcan_ni_cuentan(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente))
    abrir_fans(cliente)
    favorito(cliente, codigo, 'est-ana', esperado=409)
    # Luis la marca antes de ser coautor; al sumarse como autor, su favorito deja de contar.
    favorito(cliente, codigo, 'est-luis')
    assert detalle(cliente, codigo)['favoritos'] == 1
    accion(cliente, 'editar-entrevista', {'entrevista': codigo, **FICHA, 'coautores_nuevos': ['est-luis']})
    assert detalle(cliente, codigo)['favoritos'] == 0
    favorito(cliente, codigo, 'est-luis', esperado=409)
    destacar(cliente, codigo)
    for fan in FANS[:FAVORITOS_LEYENDA - 1]:
        favorito(cliente, codigo, fan)
    assert not es_leyenda(cliente, codigo)
    favorito(cliente, codigo, FANS[FAVORITOS_LEYENDA - 1])
    assert es_leyenda(cliente, codigo)


def test_regla_5_quitar_favoritos_no_la_quita(cliente):
    codigo = leyenda_completa(cliente, 'destacada_primero')
    for fan in FANS:
        favorito(cliente, codigo, fan, nombre='desmarcar-favorito')
    ficha = detalle(cliente, codigo)
    assert ficha['leyenda'] and ficha['favoritos'] == 0


@pytest.mark.parametrize('como', ['quitar_destacado', 'retirar', 'eliminar'])
def test_regla_5_se_pierde_al_quitar_destacado_retirar_o_eliminar(cliente, como):
    codigo = leyenda_completa(cliente, 'favoritos_primero')
    abrir_fans(cliente, (OTRO_SALON,))
    assert entrevistas(cliente, OTRO_SALON, vista='LEYENDAS')['total'] == 1
    if como == 'quitar_destacado':
        destacar(cliente, codigo, destacada=False)
        assert not es_leyenda(cliente, codigo)
    elif como == 'retirar':
        accion(cliente, 'retirar-entrevista', {'entrevista': codigo}, cuenta='est-luis')
    else:
        accion(cliente, 'eliminar-entrevista', {'entrevista': codigo}, cuenta='ori-carmen')
    assert entrevistas(cliente, OTRO_SALON, vista='LEYENDAS')['total'] == 0
    detalle(cliente, codigo, OTRO_SALON, esperado=404)
    # Regla 7: el sello ya obtenido se conserva.
    for autor in AUTORES:
        assert sello(cliente, autor)['estado'] == 'OBTENIDA'


def test_regla_6_volver_a_destacar_no_duplica_evento_ni_sello(cliente):
    codigo = leyenda_completa(cliente, 'destacada_primero')
    obtenido = sello(cliente, 'est-ana')['obtenida_en']
    destacar(cliente, codigo, destacada=False)
    destacar(cliente, codigo)
    assert es_leyenda(cliente, codigo)
    for autor in AUTORES:
        assert len(eventos_leyenda(cliente, autor)) == 1
        assert len(eventos_leyenda(cliente, autor, 'ENTREVISTA_DESTACADA')) == 1
        assert len(desbloqueos_sello(cliente, autor)) == 1
    assert sello(cliente, 'est-ana')['obtenida_en'] == obtenido


def test_regla_7_el_sello_no_se_pierde(cliente):
    codigo = leyenda_completa(cliente, 'destacada_primero')
    destacar(cliente, codigo, destacada=False)
    assert not es_leyenda(cliente, codigo)
    for autor in AUTORES:
        insignia = sello(cliente, autor)
        assert insignia['estado'] == 'OBTENIDA' and insignia['obtenida_en'] is not None
