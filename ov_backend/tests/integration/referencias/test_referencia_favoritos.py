"""B09: la referencia FAVORITOS lee los favoritos de la propia cuenta, del más reciente al más antiguo."""

from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.services.referencias import resolver
from soporte_ruta import completar, pedir


@usar_contexto
def _resolver(sesion, cuenta):
    referencia = sesion.scalar(select(m.Referencia).where(m.Referencia.codigo == 't-ref-diario-favoritos'))
    return resolver(sesion, sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == cuenta)), [referencia])[
        't-ref-diario-favoritos']


def resolver_favoritos(aplicacion, cuenta):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return _resolver(sesion, cuenta)


def test_favoritos_por_cuenta_y_en_orden(cliente, aplicacion):
    assert resolver_favoritos(aplicacion, 'est-ana').estado == m.EstadoReferencia.SIN_DATO
    completar(cliente, 't-inicio')
    for tipo, codigo, hora in (('CARRERA', 'civil-engineering', 9), ('OCUPACION', 'geologist', 10),
                               ('INSTITUCION', 't-uni', 11)):
        pedir(cliente, 'POST', '/acciones/marcar-favorito',
              {'cuenta': 'est-ana', 'tipo': tipo, 'codigo': codigo, 'fecha_hora': f'2026-10-07T{hora:02d}:00:00'})
    resuelta = resolver_favoritos(aplicacion, 'est-ana')
    assert resuelta.estado == m.EstadoReferencia.DISPONIBLE and resuelta.texto is None
    with aplicacion.state.fabrica_sesiones() as sesion:
        geologo = sesion.scalar(select(m.Ocupacion).where(m.Ocupacion.codigo == 'geologist'))
        institucion = sesion.scalar(select(m.Institucion).where(m.Institucion.codigo == 't-uni'))
        carrera = sesion.scalar(select(m.Carrera).where(m.Carrera.codigo == 'civil-engineering'))
        esperadas = [(institucion.codigo, institucion.nombre), (geologo.codigo_onet, geologo.titulo),
                     (carrera.codigo, carrera.nombre)]
    assert [(o.codigo, o.texto) for o in resuelta.opciones] == esperadas
    assert resolver_favoritos(aplicacion, 'est-luis').estado == m.EstadoReferencia.SIN_DATO
