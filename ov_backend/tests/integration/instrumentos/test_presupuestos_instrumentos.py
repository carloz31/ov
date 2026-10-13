"""R12, R30–R31: SQL agrupado de respuestas, cálculo y consultas."""

from soporte_datos_ports import agregar_ocupaciones
from sqlalchemy import select
from app import models as m
from soporte_ruta import INTERESES_FINAL, avanzar, completar, pedir
from soporte_retiro import actividades_extra, ciclo, datos_respuestas, medir, preparar_ultimo


def test_r12_uno_o_todos_insertar_y_reemplazar_con_identidad(tmp_path, base_aislada):
    conteos = []
    for cantidad in (1, 30):
        with base_aislada(tmp_path, f'lote-{cantidad}') as (aplicacion, cliente):
            avanzar(cliente)
            datos = datos_respuestas(cliente, cantidad=cantidad)
            _, nuevas = medir(cliente, aplicacion, 'POST', '/acciones/responder-items', datos)
            with aplicacion.state.fabrica_sesiones() as sesion:
                antes = {r.item_id: (r.id, r.creada_en, r.actualizada_en) for r in sesion.scalars(select(m.RespuestaItem))}
            datos['fecha_hora'] = '2026-10-08T10:00:00'
            for respuesta in datos['respuestas']:
                respuesta['opcion'] = 5
            _, existentes = medir(cliente, aplicacion, 'POST', '/acciones/responder-items', datos)
            with aplicacion.state.fabrica_sesiones() as sesion:
                despues = {r.item_id: (r.id, r.creada_en, r.actualizada_en) for r in sesion.scalars(select(m.RespuestaItem))}
            assert len(antes) == len(despues) == cantidad
            assert all(despues[i][:2] == valor[:2] and despues[i][2] > valor[2] for i, valor in antes.items())
            assert all(r['opcion']['orden'] == 5 for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-mision-intereses/respuestas')['respuestas'])
            conteos.append((nuevas.cantidad, existentes.cantidad))
    assert conteos[0] == conteos[1]


def test_r30_calculo_constante_con_cien_ocupaciones(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'ocupaciones-{extra}') as (aplicacion, cliente):
            if extra:
                with aplicacion.state.fabrica_sesiones.begin() as sesion:
                    agregar_ocupaciones(sesion, extra)
            preparar_ultimo(cliente)
            completar(cliente, INTERESES_FINAL)
            _, contador = medir(cliente, aplicacion, 'POST', '/acciones/revelar-resultado',
                {'cuenta': 'est-ana', 'instrumento': 'TEST-RIASEC'}, limite=20)
            lecturas = [e.sentencia for e in contador.ejecuciones if e.sentencia.startswith('SELECT') and 'JOIN puntaje_ocupacion' in e.sentencia]
            assert len(lecturas) == 1
            conteos.append(contador.cantidad)
    assert conteos[0] == conteos[1]


def test_r31_presupuestos_de_consultas_y_reinicio(tmp_path, base_aislada):
    rutas = ['/instrumentos', '/actividades/t-mision-intereses/items', '/cuentas/est-ana/instrumentos',
             '/cuentas/est-ana/actividades/t-mision-intereses/respuestas']
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'presupuesto-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                actividades_extra(sesion, extra)
            cantidades = [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in rutas]
            cantidades.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado',
                                    esperado=409)[1].cantidad)
            ciclo(cliente, opcion=3)
            cantidades += [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in rutas + [
                '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', '/cuentas/est-ana/instrumentos/TEST-RIASEC/historial']]
            cantidades.append(medir(cliente, aplicacion, 'POST', '/acciones/reiniciar-instrumento',
                {'cuenta': 'est-ana', 'instrumento': 'TEST-RIASEC'}, limite=12)[1].cantidad)
            conteos.append(cantidades)
    assert conteos[0] == conteos[1]
