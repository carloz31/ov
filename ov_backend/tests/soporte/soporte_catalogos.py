"""Corrupciones controladas y filas mínimas de catálogo; DATO DE PRUEBA."""

from sqlalchemy import delete, update
from app import models as m
from datos import ruta
from datos.fijos import validar_distribucion_items
from soporte_retiro import FECHA_BD, buscar, instrumento_minimo


def cargar_catalogo_corrupto(sesion, variante):
    ruta.cargar(sesion)
    item = buscar(sesion, m.ItemInstrumento, 'RIASEC-01')
    if variante == 'faltante':
        sesion.execute(delete(m.ActividadItem).where(m.ActividadItem.item_id == item.id))
    elif variante == 'repetido':
        sesion.add(m.ActividadItem(actividad_id=buscar(sesion, m.Actividad, 't-mision-intereses-2').id,
                                  item_id=item.id, orden=99))
    elif variante == 'ajeno':
        instrumento_minimo(sesion)
        ajeno = buscar(sesion, m.ItemInstrumento, 'ITEM-PRUEBA-1')
        sesion.add(m.ActividadItem(actividad_id=buscar(sesion, m.Actividad, 't-mision-intereses').id,
                                  item_id=ajeno.id, orden=99))
    else:
        sesion.execute(update(m.Actividad).where(m.Actividad.codigo == 't-inicio').values(contenido=variante))
    sesion.flush()
    validar_distribucion_items(sesion)


def completar_catalogos_vacios(sesion):
    sesion.add_all([
        m.Testimonio(codigo='testimonio-prueba', titulo='DATO DE PRUEBA', descripcion='DATO DE PRUEBA', enlace='https://example.invalid'),
        m.PreguntaDiario(codigo='pregunta-prueba', nombre='DATO DE PRUEBA', pregunta='DATO DE PRUEBA',
                         uso='DESBLOQUEABLE'),
    ])
    sesion.flush()
    ana = buscar(sesion, m.Cuenta, 'est-ana').id
    recomendacion = m.Recomendacion(cuenta_id=ana, pregunta_diario_id=buscar(sesion, m.PreguntaDiario, 'pregunta-prueba').id,
        tipo='DESBLOQUEADA', texto='DATO DE PRUEBA', origen='FIJA', creada_en=FECHA_BD)
    sesion.add(recomendacion)
    sesion.flush()
    # numero 2: `llenar_estado` ya dejó la entrada 1 de Ana.
    sesion.add(m.EntradaDiario(cuenta_id=ana, origen='GUIADA', recomendacion_id=recomendacion.id, numero=2,
        texto='DATO DE PRUEBA', fecha_hora=FECHA_BD))
