"""B13 · HU-060, HU-061, HU-062 y HU-065: publicar con coautores, editar, retirar, listados, detalle y favoritos."""

import pytest
from sqlalchemy import func, select

from app import models as modelos
from app.services import comun
from soporte_investigaciones import (
    ENLACE, FICHA, FAMILIA, OTRA_FAMILIA, accion, codigo_publicado, detalle, entrevistas, guia_lista,
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
    pensar(cliente, 'est-luis', OTRA_FAMILIA)
    # Luis cambió de familia: no puede ser coautor de la de Ana.
    publicar(cliente, coautores=['est-luis'], esperado=409)
    pensar(cliente, 'est-luis', FAMILIA)
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
    pensar(cliente, familia=OTRA_FAMILIA)
    publicar(cliente, esperado=409)


def test_validacion_del_enlace_y_del_permiso(cliente):
    guia_lista(cliente)
    publicar(cliente, enlace='https://vimeo.com/12345', esperado=422)
    publicar(cliente, permiso=False, esperado=422)
    publicar(cliente, titulo='  ', esperado=422)
    publicar(cliente, dedicacion='  ', esperado=422)
    publicar(cliente, enlace='https://www.youtube.com/watch?v=dQw4w9WgXcQ')


def test_editar_no_cambia_autores_y_cualquier_autor_retira(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente, coautores=['est-luis']))
    nueva = {**FICHA, 'titulo': 'Lo que no se ve de la electricidad', 'enlace': 'https://youtu.be/aaaaaaaaaaa'}
    nueva.pop('permiso')
    # Un coautor también edita la ficha; solo él registra EDITA_ENTREVISTA.
    editada = accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo}, cuenta='est-luis')
    assert list(editada['por_cuenta']) == ['est-luis']
    assert [e['tipo'] for e in editada['por_cuenta']['est-luis']['eventos_registrados']] == ['EDITA_ENTREVISTA']
    ficha = detalle(cliente, codigo)
    assert ficha['titulo'] == nueva['titulo'] and ficha['enlace'] == 'https://youtu.be/aaaaaaaaaaa'
    assert ficha['editada_en'] is not None
    # Los autores son los de la publicación: sumar coautores al editar ya no existe (422) y nada cambia.
    guia_lista(cliente, 'est-mia')
    accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo, 'coautores_nuevos': ['est-mia']}, 422)
    assert [a['codigo'] for a in detalle(cliente, codigo)['autores']] == ['est-ana', 'est-luis']
    assert investigaciones(cliente, 'est-mia')['en_curso']['estado'] == 'GUIA_LISTA'
    # Quien no es autor no edita.
    accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo}, 404, cuenta='est-mia')
    # Luis la retira: desaparece para todos, también el detalle para sus autores.
    accion(cliente, 'retirar-entrevista', {'entrevista': codigo}, cuenta='est-luis')
    for cuenta in ('est-ana', 'est-luis'):
        assert entrevistas(cliente, cuenta, vista='MIAS')['total'] == 0
        assert entrevistas(cliente, cuenta)['total'] == 0
        detalle(cliente, codigo, cuenta, esperado=404)
    accion(cliente, 'retirar-entrevista', {'entrevista': codigo}, 404)


def test_listados_por_vista_filtros_y_orden(cliente):
    guia_lista(cliente, 'est-beto')
    guia_lista(cliente, 'est-luis', OTRA_FAMILIA)
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
    assert ana['familia']['codigo'] == FAMILIA and not luis['vista']
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
    # Por familia, para el detalle de la carrera del catálogo; un código desconocido no trae ninguna.
    assert [t['codigo'] for t in entrevistas(cliente, familia=OTRA_FAMILIA)['items']] == [de_luis]
    assert entrevistas(cliente, familia='no-existe')['total'] == 0
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


def test_la_ficha_lleva_familia_y_dedicacion_y_se_busca_por_las_dos(cliente):
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente))
    tarjeta, = entrevistas(cliente)['items']
    assert tarjeta['familia']['codigo'] == FAMILIA and tarjeta['familia']['nombre'] and tarjeta['familia']['area_codigo']
    assert tarjeta['dedicacion'] == FICHA['dedicacion']
    assert detalle(cliente, codigo)['dedicacion'] == FICHA['dedicacion']
    for buscado in (tarjeta['familia']['nombre'], 'electricista industrial', 'INGENIERIA ELECTRICA'):
        assert entrevistas(cliente, buscar=buscado.replace(' ', '%20'))['total'] == 1, buscado
    assert entrevistas(cliente, buscar='Idiomas')['total'] == 0
    nueva = {k: v for k, v in FICHA.items() if k != 'permiso'}
    accion(cliente, 'editar-entrevista', {**nueva, 'entrevista': codigo, 'dedicacion': 'Supervisora de obra'})
    assert entrevistas(cliente, buscar='supervisora')['total'] == 1
    assert entrevistas(cliente, buscar='electricista%20industrial')['total'] == 0


def test_salon_y_leyendas_junta_las_dos_sin_repetir_y_sin_otras(cliente, sesion):
    guia_lista(cliente)
    de_ana = codigo_publicado(publicar(cliente))
    guia_lista(cliente, 'est-beto')
    de_beto = codigo_publicado(publicar(cliente, 'est-beto'), 'est-beto')
    guia_lista(cliente, 'est-luis')
    de_luis = codigo_publicado(publicar(cliente, 'est-luis'), 'est-luis')
    # Para Ana, la de Beto (5B) no es de su salón ni Leyenda: no sale.
    vista = entrevistas(cliente, vista='SALON_Y_LEYENDAS', familia=FAMILIA)
    assert {t['codigo'] for t in vista['items']} == {de_ana, de_luis} and vista['total'] == 2
    # Una Leyenda de otro salón sí sale; una del propio salón que además es Leyenda no se repite.
    for entrevista in sesion.scalars(select(modelos.Entrevista).where(modelos.Entrevista.codigo.in_([de_beto, de_luis]))):
        entrevista.destacada_en = entrevista.leyenda_en = entrevista.fecha_hora
    sesion.commit()
    vista = entrevistas(cliente, vista='SALON_Y_LEYENDAS', familia=FAMILIA, limite=2)
    assert vista['total'] == 3 and len(vista['items']) == 2
    assert {t['codigo'] for t in entrevistas(cliente, vista='SALON_Y_LEYENDAS')['items']} == {de_ana, de_beto, de_luis}
    assert entrevistas(cliente, vista='SALON_Y_LEYENDAS', familia=OTRA_FAMILIA)['total'] == 0

