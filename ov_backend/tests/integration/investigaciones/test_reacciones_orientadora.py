"""B13 · HU-063, HU-064 y HU-065: reacciones, reportes, moderación de la orientadora y Leyenda."""

from datetime import datetime

from sqlalchemy import select

from app import models as modelos
from soporte_investigaciones import (
    ENLACE, abrir_investigaciones, accion, codigo_publicado, detalle, entrevistas, guia_lista, investigaciones,
    publicar,
)
from soporte_retiro import medir
from soporte_ruta import FECHA, pedir


def reaccionar(cliente, codigo, cuenta='est-luis', tipo='APRENDI', comentario='Aprendí que hay que usar guantes.',
               esperado=200):
    return accion(cliente, 'reaccionar-entrevista', {'entrevista': codigo, 'tipo': tipo, 'comentario': comentario},
                  esperado, cuenta)


def orientadora(cliente, nombre, datos, esperado=200):
    return accion(cliente, nombre, datos, esperado, cuenta='ori-carmen')


def publicaciones(cliente, esperado=200, **filtros):
    consulta = '&'.join(f'{c}={str(v).lower() if isinstance(v, bool) else v}' for c, v in filtros.items())
    return pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones?{consulta}', esperado=esperado)


def de_ana_con_luis(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    return codigo_publicado(publicar(cliente))


def test_reaccion_unica_editable_y_borrable(cliente):
    codigo = de_ana_con_luis(cliente)
    # «Aprendí algo» y «Me dio curiosidad» exigen comentario; «Me gustó» no.
    reaccionar(cliente, codigo, comentario=None, esperado=422)
    reaccionar(cliente, codigo, tipo='CURIOSIDAD', comentario='   ', esperado=422)
    reaccionar(cliente, codigo, tipo='NO_EXISTE', esperado=422)
    primera = reaccionar(cliente, codigo)
    assert [(e['tipo'], e['referencia']) for e in primera['eventos_registrados']] == [('REACCIONA_ENTREVISTA', codigo)]
    # Volver a reaccionar cambia la misma reacción, sin otro evento.
    assert reaccionar(cliente, codigo, tipo='ME_GUSTO', comentario=None)['eventos_registrados'] == []
    ficha = detalle(cliente, codigo, 'est-luis')
    propia, = ficha['lista_reacciones']
    assert propia['tipo'] == 'ME_GUSTO' and propia['propia'] and propia['editada_en'] is not None
    assert ficha['reacciones'] == 1 and ficha['reacciones_por_tipo'] == {'ME_GUSTO': 1}
    # Nunca en la propia; la autora ve la reacción recibida.
    reaccionar(cliente, codigo, cuenta='est-ana', esperado=409)
    recibida, = detalle(cliente, codigo)['lista_reacciones']
    assert not recibida['propia'] and recibida['autor']['codigo'] == 'est-luis'
    assert entrevistas(cliente, vista='MIAS')['items'][0]['reacciones_por_tipo'] == {'ME_GUSTO': 1}
    # Borrarla la quita y deja reaccionar de nuevo.
    accion(cliente, 'eliminar-reaccion', {'reaccion': propia['codigo']}, 404)
    accion(cliente, 'eliminar-reaccion', {'reaccion': propia['codigo']}, cuenta='est-luis')
    assert detalle(cliente, codigo)['lista_reacciones'] == []
    assert reaccionar(cliente, codigo)['eventos_registrados'] == []


def test_reportes_unicos_y_sin_comentarios_de_la_orientadora(cliente):
    codigo = de_ana_con_luis(cliente)
    reaccion = reaccionar(cliente, codigo) and detalle(cliente, codigo)['lista_reacciones'][0]['codigo']
    accion(cliente, 'reportar', {'entrevista': codigo, 'motivo': 'VIDEO'}, cuenta='est-luis')
    accion(cliente, 'reportar', {'entrevista': codigo, 'motivo': 'OTRO'}, 409, cuenta='est-luis')
    accion(cliente, 'reportar', {'entrevista': codigo, 'motivo': 'VIDEO'}, 409)
    accion(cliente, 'reportar', {'reaccion': reaccion, 'motivo': 'OFENSIVO', 'detalle': 'DATO DE PRUEBA'})
    accion(cliente, 'reportar', {'reaccion': reaccion, 'motivo': 'OFENSIVO'}, 409, cuenta='est-luis')
    accion(cliente, 'reportar', {'motivo': 'OTRO'}, 422)
    accion(cliente, 'reportar', {'entrevista': codigo, 'reaccion': reaccion, 'motivo': 'OTRO'}, 422)
    # «Reportado» solo lo ve quien reportó.
    assert detalle(cliente, codigo, 'est-luis')['reportada_por_mi']
    assert not detalle(cliente, codigo)['reportada_por_mi']
    assert detalle(cliente, codigo)['lista_reacciones'][0]['reportada_por_mi']
    assert not detalle(cliente, codigo, 'est-luis')['lista_reacciones'][0]['reportada_por_mi']
    # El comentario de la orientadora sale en la lista, sin tipo, y no se reporta.
    orientadora(cliente, 'comentar-entrevista', {'entrevista': codigo, 'texto': 'Muy buena conversación.'})
    comentario = next(r for r in detalle(cliente, codigo)['lista_reacciones'] if r['tipo'] is None)
    assert comentario['autor']['codigo'] == 'ori-carmen' and comentario['autor']['nivel'] is None
    accion(cliente, 'reportar', {'reaccion': comentario['codigo'], 'motivo': 'OFENSIVO'}, 409)
    assert detalle(cliente, codigo)['reacciones'] == 1


def test_tabla_y_detalle_de_la_orientadora(cliente):
    codigo = de_ana_con_luis(cliente)
    guia_lista(cliente, 'est-beto')
    codigo_publicado(publicar(cliente, 'est-beto'), 'est-beto')
    reaccionar(cliente, codigo)
    reaccion = detalle(cliente, codigo)['lista_reacciones'][0]['codigo']
    accion(cliente, 'reportar', {'reaccion': reaccion, 'motivo': 'OFENSIVO'})
    tabla = publicaciones(cliente)
    # Solo su salón (Beto es del 5B y su entrevista no es Leyenda).
    assert tabla['total'] == 1 and tabla['favoritos_leyenda'] == 3
    fila, = tabla['items']
    assert fila['codigo'] == codigo and fila['estado'] == 'SIN_DESTACAR' and fila['de_sus_salones']
    assert fila['autores'] == [{'codigo': 'est-ana', 'nombre': 'Ana', 'salon': '5A', 'lo_que_pensaba': None}]
    assert (fila['reacciones'], fila['reportes_pendientes'], fila['comentarios_reportados']) == (1, 0, 1)
    assert publicaciones(cliente, con_reportes=True)['total'] == 1
    assert publicaciones(cliente, estado='DESTACADA')['total'] == 0
    assert publicaciones(cliente, salon='5A', buscar='ana')['total'] == 1
    publicaciones(cliente, salon='5B', esperado=404)
    publicaciones(cliente, estado='OTRO', esperado=422)
    ficha = pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones/{codigo}')
    assert ficha['autores'][0]['lo_que_pensaba']['duda'].startswith('¿Es peligroso')
    reportada, = ficha['reacciones']
    assert reportada['reportes'][0]['motivo'] == 'OFENSIVO' and 'cuenta' not in reportada['reportes'][0]
    # Descartar el reporte lo saca del filtro sin tocar la reacción.
    orientadora(cliente, 'descartar-reporte', {'reporte': reportada['reportes'][0]['codigo']})
    assert publicaciones(cliente, con_reportes=True)['total'] == 0
    assert detalle(cliente, codigo)['reacciones'] == 1
    # Un estudiante no usa la tabla; la orientadora no actúa sobre otros salones ni reacciona.
    pedir(cliente, 'GET', '/cuentas/est-ana/publicaciones', esperado=404)
    reaccionar(cliente, codigo, cuenta='ori-carmen', esperado=404)


def test_eliminar_resuelve_reportes_y_oculta_para_todos(cliente, sesion):
    codigo = de_ana_con_luis(cliente)
    reaccionar(cliente, codigo)
    reaccion = detalle(cliente, codigo)['lista_reacciones'][0]['codigo']
    accion(cliente, 'reportar', {'reaccion': reaccion, 'motivo': 'OFENSIVO'})
    accion(cliente, 'reportar', {'entrevista': codigo, 'motivo': 'DATOS_PRIVADOS'}, cuenta='est-luis')
    orientadora(cliente, 'eliminar-reaccion', {'reaccion': reaccion})
    assert detalle(cliente, codigo)['lista_reacciones'] == []
    assert publicaciones(cliente, con_reportes=True)['items'][0]['comentarios_reportados'] == 0
    orientadora(cliente, 'eliminar-entrevista', {'entrevista': codigo})
    assert {r.estado for r in sesion.scalars(select(modelos.Reporte))} == {'RESUELTO'}
    assert publicaciones(cliente)['total'] == 0
    detalle(cliente, codigo, esperado=404)
    assert investigaciones(cliente)['conteos'] == {'salon': 0, 'leyendas': 0, 'mias': 0}
    orientadora(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': True}, 404)


def test_leyenda_con_destacado_y_favoritos(cliente, aplicacion):
    codigo = de_ana_con_luis(cliente)
    # DATO DE PRUEBA: dos compañeros del salón con la entrevista ya marcada, escritos en la base.
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        salon = sesion.scalar(select(modelos.Salon.id).where(modelos.Salon.codigo == '5A'))
        entrevista = sesion.scalar(select(modelos.Entrevista.id).where(modelos.Entrevista.codigo == codigo))
        fans = [modelos.Cuenta(codigo=f'est-fan-{n}', nombre='DATO DE PRUEBA', rol='ESTUDIANTE', salon_id=salon)
                for n in range(2)]
        sesion.add_all(fans)
        sesion.flush()
        sesion.add_all(modelos.Favorito(cuenta_id=fan.id, tipo='ENTREVISTA', id_referencia=entrevista,
                                        fecha_hora=datetime.fromisoformat(FECHA)) for fan in fans)

    def favorito(cuenta, accion_favorito='marcar-favorito'):
        return pedir(cliente, 'POST', f'/acciones/{accion_favorito}',
                     {'cuenta': cuenta, 'tipo': 'ENTREVISTA', 'codigo': codigo})

    # Destacada con dos favoritos no basta.
    destacada = orientadora(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': True})
    assert destacada['eventos_registrados'] == []
    ficha = detalle(cliente, codigo)
    assert ficha['destacada'] and not ficha['leyenda'] and ficha['favoritos'] == 2
    assert entrevistas(cliente, destacadas=True)['total'] == 1
    # El tercer favorito la vuelve Leyenda al marcarlo.
    favorito('est-luis')
    assert detalle(cliente, codigo)['leyenda']
    tipos = {e['tipo'] for e in pedir(cliente, 'GET', '/cuentas/est-ana/eventos')}
    assert {'ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA'} <= tipos
    assert any(i['codigo'] == 't-ins-leyenda' and i['estado'] == 'OBTENIDA'
               for i in pedir(cliente, 'GET', '/cuentas/est-ana/logros')['insignias'])
    # La Leyenda la ve otro salón, que puede marcarla.
    guia_lista(cliente, 'est-beto')
    assert [t['codigo'] for t in entrevistas(cliente, 'est-beto', vista='LEYENDAS')['items']] == [codigo]
    favorito('est-beto')
    assert detalle(cliente, codigo, 'est-beto')['favoritos'] == 4
    assert publicaciones(cliente, estado='LEYENDA')['total'] == 1
    # Desmarcar no la quita; quitar el destacado sí, y otro salón deja de verla.
    favorito('est-luis', 'desmarcar-favorito')
    favorito('est-beto', 'desmarcar-favorito')
    assert detalle(cliente, codigo)['leyenda']
    orientadora(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': False})
    assert not detalle(cliente, codigo)['leyenda']
    detalle(cliente, codigo, 'est-beto', esperado=404)
    # Destacar de nuevo con los favoritos que tiene ahora (dos) no la recupera; con un tercero sí.
    orientadora(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': True})
    assert not detalle(cliente, codigo)['leyenda']
    favorito('est-luis')
    assert detalle(cliente, codigo)['leyenda']


def entrevistas_directas(sesion, cantidad):
    """DATO DE PRUEBA: entrevistas de Ana escritas en la base, con una reacción, un favorito y un reporte cada una."""
    ana, luis = (sesion.scalar(select(modelos.Cuenta).where(modelos.Cuenta.codigo == c)) for c in ('est-ana', 'est-luis'))
    ocupacion = sesion.scalar(select(modelos.Ocupacion.id).where(modelos.Ocupacion.codigo == 'electrician'))
    tipo = sesion.scalar(select(modelos.TipoReaccion.id).where(modelos.TipoReaccion.codigo == 'ME_GUSTO'))
    fecha = datetime.fromisoformat(FECHA)
    for n in range(cantidad):
        entrevista = modelos.Entrevista(codigo=f'ENT-EXTRA-{n}', ocupacion_id=ocupacion, titulo='DATO DE PRUEBA',
                                        profesional='DATO DE PRUEBA', duracion='10 min', enlace=ENLACE,
                                        resumen='DATO DE PRUEBA', busqueda='dato de prueba', estado='PUBLICADA',
                                        fecha_hora=fecha)
        sesion.add(entrevista)
        sesion.flush()
        reaccion = modelos.Reaccion(codigo=f'REA-EXTRA-{n}', entrevista_id=entrevista.id, cuenta_id=luis.id,
                                    tipo_reaccion_id=tipo, creada_en=fecha)
        sesion.add_all([modelos.EntrevistaAutor(entrevista_id=entrevista.id, cuenta_id=ana.id), reaccion,
                        modelos.Favorito(cuenta_id=luis.id, tipo='ENTREVISTA', id_referencia=entrevista.id,
                                         fecha_hora=fecha)])
        sesion.flush()
        sesion.add(modelos.Reporte(codigo=f'REP-EXTRA-{n}', cuenta_id=luis.id, reaccion_id=reaccion.id, motivo='OTRO',
                                   estado='PENDIENTE', fecha_hora=fecha))


def test_tabla_y_listado_no_crecen_en_consultas_con_las_publicaciones(tmp_path, base_aislada):
    cantidades = []
    for cantidad in (1, 10):
        with base_aislada(tmp_path, f'publicaciones-{cantidad}') as (aplicacion, cliente):
            abrir_investigaciones(cliente)
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                entrevistas_directas(sesion, cantidad)
            _, tabla = medir(cliente, aplicacion, 'GET', '/cuentas/ori-carmen/publicaciones', limite=25)
            _, listado = medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/entrevistas', limite=25)
            ficha = pedir(cliente, 'GET', '/cuentas/ori-carmen/publicaciones/ENT-EXTRA-0')
            assert ficha['reacciones'][0]['reportes'] and ficha['favoritos'] == 1
            cantidades.append((tabla.cantidad, listado.cantidad))
    assert cantidades[0] == cantidades[1]
