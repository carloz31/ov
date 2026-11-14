"""Auditoría plataforma (sección F): entrevistas, su detalle e investigaciones no crecen con las entrevistas del
salón, sus reacciones ni sus comentarios. DATO DE PRUEBA."""

from soporte_consultas import ContadorConsultas
from soporte_investigaciones import accion, codigo_publicado, guia_lista, publicar

COMPANEROS = ('est-luis', 'est-mia', 'est-teo', 'est-sol')


def _medir(cliente, aplicacion, codigo):
    cantidades = []
    for ruta in ('/cuentas/est-ana/entrevistas', f'/cuentas/est-ana/entrevistas/{codigo}',
                 '/cuentas/est-ana/investigaciones'):
        cliente.get(ruta)
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            assert cliente.get(ruta).status_code == 200
        cantidades.append(contador.cantidad)
    return cantidades


def test_entrevistas_no_crecen_con_las_del_salon_ni_sus_reacciones(cliente, aplicacion):
    guia_lista(cliente)
    codigos = [codigo_publicado(publicar(cliente))]
    guia_lista(cliente, cuenta='est-luis')
    otra = codigo_publicado(publicar(cliente, cuenta='est-luis'), cuenta='est-luis')
    codigos.append(otra)
    accion(cliente, 'reaccionar-entrevista', {'entrevista': otra, 'tipo': 'APRENDI', 'comentario': 'DATO DE PRUEBA'})
    # Con un comentario de la orientadora, el detalle lo lee (rama); se compara con uno y con muchos.
    accion(cliente, 'comentar-entrevista', {'entrevista': otra, 'texto': 'DATO DE PRUEBA'}, cuenta='ori-carmen')
    pocos = _medir(cliente, aplicacion, otra)
    for cuenta in COMPANEROS[1:]:
        guia_lista(cliente, cuenta=cuenta)
        codigos.append(codigo_publicado(publicar(cliente, cuenta=cuenta), cuenta=cuenta))
    for cuenta in COMPANEROS:
        for codigo in codigos:
            cliente.post('/acciones/reaccionar-entrevista', json={'cuenta': cuenta, 'entrevista': codigo,
                                                                  'tipo': 'APRENDI', 'comentario': 'DATO DE PRUEBA'})
    for codigo in codigos:
        accion(cliente, 'comentar-entrevista', {'entrevista': codigo, 'texto': 'DATO DE PRUEBA'}, cuenta='ori-carmen')
    assert _medir(cliente, aplicacion, otra) == pocos
