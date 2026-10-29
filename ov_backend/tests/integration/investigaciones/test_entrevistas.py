"""B13 · HU-060, HU-061, HU-062 y HU-065: publicar con coautores, editar, retirar, listados, detalle y favoritos."""

import pytest
from sqlalchemy import func, select

from app import models as modelos
from app.services import comun
from soporte_investigaciones import (
    ENLACE, FICHA, OCUPACION, OTRA_OCUPACION, accion, codigo_publicado, detalle, entrevistas, guia_lista,
    guias_listas_directas, guion, investigaciones, pensar, publicar,
)
from soporte_retiro import medir
from soporte_ruta import actividades, eventos, pedir


def favorito(cliente, codigo, cuenta, esperado=200, accion_favorito='marcar-favorito'):
    return pedir(cliente, 'POST', f'/acciones/{accion_favorito}',
                 {'cuenta': cuenta, 'tipo': 'ENTREVISTA', 'codigo': codigo}, esperado)


def test_publicar_exige_guia_lista_y_cierra_la_de_cada_autor(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    pensar(cliente, 'est-luis', OTRA_OCUPACION)
    # Luis cambió de ocupación: no puede ser coautor de la de Ana.
    publicar(cliente, coautores=['est-luis'], esperado=409)
    pensar(cliente, 'est-luis', OCUPACION)
    publicar(cliente, coautores=['est-beto'], esperado=409)
    publicar(cliente, coautores=['est-ana'], esperado=409)
    publicar(cliente, coautores=['no-existe'], esperado=404)
    publicada = publicar(cliente, coautores=['est-luis'])
    assert set(publicada['por_cuenta']) == {'est-ana', 'est-luis'}
    codigo = codigo_publicado(publicada)
    assert codigo == codigo_publicado(publicada, 'est-luis') and codigo.startswith('ENT-')
    # El investigador vuelve al publicar: la misión de cierre se abre para los dos.
    for cuenta in ('est-ana', 'est-luis'):
        assert 'R-t-investigador-cierre' in {d['regla'] for d in publicada['por_cuenta'][cuenta]['nuevos_desbloqueos']}
        assert actividades(cliente, cuenta)['t-investigador-cierre'] == 'DISPONIBLE'
        assert investigaciones(cliente, cuenta)['en_curso'] is None
    assert investigaciones(cliente)['conteos'] == {'salon': 1, 'leyendas': 0, 'mias': 1}
    # Sin investigación activa no hay nada que publicar; otra investigación sí se puede iniciar.
    publicar(cliente, esperado=409)
    pensar(cliente, ocupacion=OTRA_OCUPACION)
    publicar(cliente, esperado=409)


def test_validacion_del_enlace_y_del_permiso(cliente):
    guia_lista(cliente)
    publicar(cliente, enlace='https://vimeo.com/12345', esperado=422)
    publicar(cliente, permiso=False, esperado=422)
    publicar(cliente, titulo='  ', esperado=422)
    publicar(cliente, enlace='https://www.youtube.com/watch?v=dQw4w9WgXcQ')


def test_editar_suma_coautores_y_cualquier_autor_retira(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente))
    nueva = {**FICHA, 'titulo': 'Lo que no se ve de la electricidad', 'enlace': 'https://youtu.be/aaaaaaaaaaa'}
    nueva.pop('permiso')
    editada = accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo, 'coautores_nuevos': ['est-luis']})
    assert [e['tipo'] for e in editada['por_cuenta']['est-ana']['eventos_registrados']] == ['EDITA_ENTREVISTA']
    assert [e['tipo'] for e in editada['por_cuenta']['est-luis']['eventos_registrados']] == ['PUBLICA_ENTREVISTA']
    ficha = detalle(cliente, codigo, 'est-luis')
    assert ficha['titulo'] == nueva['titulo'] and ficha['enlace'] == 'https://youtu.be/aaaaaaaaaaa'
    assert [a['codigo'] for a in ficha['autores']] == ['est-ana', 'est-luis'] and ficha['propia']
    assert ficha['editada_en'] is not None
    # Un coautor que no cumple responde 409, y quien no es autor no edita.
    accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo, 'coautores_nuevos': ['est-beto']}, 409)
    guia_lista(cliente, 'est-beto')
    accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo}, 404, cuenta='est-beto')
    # Luis la retira: desaparece para todos, también el detalle para sus autores.
    accion(cliente, 'retirar-entrevista', {'entrevista': codigo}, cuenta='est-luis')
    for cuenta in ('est-ana', 'est-luis'):
        assert entrevistas(cliente, cuenta, vista='MIAS')['total'] == 0
        assert entrevistas(cliente, cuenta)['total'] == 0
        detalle(cliente, codigo, cuenta, esperado=404)
    accion(cliente, 'retirar-entrevista', {'entrevista': codigo}, 404)


def test_listados_por_vista_filtros_y_orden(cliente):
    guia_lista(cliente, 'est-beto')
    guia_lista(cliente, 'est-luis', OTRA_OCUPACION)
    guia_lista(cliente)
    de_ana = codigo_publicado(publicar(cliente, titulo='Electricidad en casa'))
    de_luis = codigo_publicado(publicar(cliente, 'est-luis', titulo='Traducir para vivir'), 'est-luis')
    codigo_publicado(publicar(cliente, 'est-beto', titulo='De otro salón'), 'est-beto')
    salon = entrevistas(cliente)
    assert salon['total'] == 2 and salon['favoritos_leyenda'] == 3
    assert [t['codigo'] for t in salon['items']] == [de_luis, de_ana]
    luis, ana = salon['items']
    assert ana['propia'] and not luis['propia'] and luis['reacciones_por_tipo'] is None
    assert ana['autores'][0] == {'codigo': 'est-ana', 'nombre': 'Ana', 'nivel': {'numero': 2,
                                 'titulo': 'Recolector de pistas'}, 'vitrina': []}
    assert ana['ocupacion']['codigo'] == OCUPACION and not luis['vista']
    assert entrevistas(cliente, vista='LEYENDAS')['total'] == 0
    mias = entrevistas(cliente, vista='MIAS')
    assert [t['codigo'] for t in mias['items']] == [de_ana] and mias['items'][0]['reacciones_por_tipo'] == {}
    # Búsqueda sin tildes por título, profesional u ocupación.
    assert [t['codigo'] for t in entrevistas(cliente, buscar='TRADUCIR')['items']] == [de_luis]
    assert entrevistas(cliente, buscar='quispe')['total'] == 2
    # Vista, no vistas, favoritas y paginado.
    vista = accion(cliente, 'ver-entrevista', {'entrevista': de_luis})
    assert [e['tipo'] for e in vista['eventos_registrados']] == ['VISTA_ENTREVISTA']
    assert accion(cliente, 'ver-entrevista', {'entrevista': de_luis})['eventos_registrados'] == []
    assert [t['codigo'] for t in entrevistas(cliente, no_vistas=True)['items']] == [de_ana]
    assert entrevistas(cliente, destacadas=True)['total'] == 0
    favorito(cliente, de_luis, 'est-ana')
    assert [t['codigo'] for t in entrevistas(cliente, favoritas=True)['items']] == [de_luis]
    pagina = entrevistas(cliente, limite=1, desde=1)
    assert pagina['total'] == 2 and [t['codigo'] for t in pagina['items']] == [de_ana]
    assert entrevistas(cliente, orden='REACCIONADAS')['total'] == 2
    entrevistas(cliente, vista='OTRA', esperado=422)
    entrevistas(cliente, limite=0, esperado=422)


def test_detalle_visibilidad_y_favorito(cliente):
    guia_lista(cliente, 'est-beto')
    guia_lista(cliente)
    de_ana = codigo_publicado(publicar(cliente))
    de_beto = codigo_publicado(publicar(cliente, 'est-beto'), 'est-beto')
    # Beto es de otro salón: no ve la de Ana ni puede marcarla, y Ana no ve la de Beto.
    detalle(cliente, de_ana, 'est-beto', esperado=404)
    detalle(cliente, de_beto, esperado=404)
    accion(cliente, 'ver-entrevista', {'entrevista': de_beto}, 404)
    favorito(cliente, de_ana, 'est-beto', esperado=404)
    # Nadie marca su propia entrevista.
    favorito(cliente, de_ana, 'est-ana', esperado=409)
    ficha = detalle(cliente, de_ana)
    assert ficha['enlace'] == ENLACE and ficha['lista_reacciones'] == [] and ficha['reacciones_por_tipo'] == {}
    assert not ficha['reportada_por_mi'] and ficha['favoritos'] == 0 and ficha['favoritos_leyenda'] == 3
    pedir(cliente, 'GET', f'/cuentas/apo-rosa/entrevistas/{de_ana}', esperado=404)


def test_favorito_de_un_companero_y_su_evento(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    de_ana = codigo_publicado(publicar(cliente))
    marcado = favorito(cliente, de_ana, 'est-luis')
    assert [(e['tipo'], e['referencia']) for e in marcado['eventos_registrados']] == [
        ('MARCA_FAVORITO_ENTREVISTA', de_ana)]
    favorito(cliente, de_ana, 'est-luis', esperado=409)
    tarjeta = entrevistas(cliente, 'est-luis')['items'][0]
    assert tarjeta['favorita'] and tarjeta['favoritos'] == 1
    favorito(cliente, de_ana, 'est-luis', accion_favorito='desmarcar-favorito')
    assert entrevistas(cliente)['items'][0]['favoritos'] == 0
    # Los favoritos de entrevistas no aparecen en los del catálogo.
    assert pedir(cliente, 'GET', '/cuentas/est-luis/favoritos') == {'carreras': [], 'ocupaciones': [],
                                                                    'instituciones': []}


def test_fallo_con_un_coautor_revierte_toda_la_publicacion(cliente, sesion, monkeypatch):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    original = comun.registrar_eventos

    def fallar_con_luis(sesion, cuenta, eventos_cuenta, fecha):
        nuevos = original(sesion, cuenta, eventos_cuenta, fecha)
        if cuenta.codigo == 'est-luis':
            raise RuntimeError('Fallo con el coautor')
        return nuevos

    monkeypatch.setattr(comun, 'registrar_eventos', fallar_con_luis)
    with pytest.raises(RuntimeError, match='Fallo con el coautor'):
        publicar(cliente, coautores=['est-luis'])
    for modelo in (modelos.Entrevista, modelos.EntrevistaAutor):
        assert sesion.scalar(select(func.count()).select_from(modelo)) == 0
    assert {i.estado for i in sesion.scalars(select(modelos.Investigacion))} == {'GUIA_LISTA'}
    assert 'PUBLICA_ENTREVISTA' not in {e['tipo'] for e in eventos(cliente)}


def test_listado_no_crece_en_consultas_con_las_entrevistas(tmp_path, base_aislada):
    cantidades = []
    for cantidad in (1, 12):
        with base_aislada(tmp_path, f'entrevistas-{cantidad}') as (aplicacion, cliente):
            guia_lista(cliente)
            for n in range(cantidad):
                if n:
                    pensar(cliente)
                    guion(cliente)
                publicar(cliente, titulo=f'Entrevista {n}')
            _, contador = medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/entrevistas?vista=MIAS', limite=30)
            cantidades.append(contador.cantidad)
    assert cantidades[0] == cantidades[1]
