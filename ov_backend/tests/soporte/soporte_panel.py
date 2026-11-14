"""Ayudas de las pruebas del panel del salón (ajuste panel-salon): estado sembrado directo en la base, con fechas
relativas a `AHORA`, que reemplaza la hora de Lima del servidor."""

from datetime import date, datetime, timedelta

from sqlalchemy import select

from app import models as m
from app.dependencies import obtener_ahora

AHORA = datetime(2026, 10, 20, 10, 0)


def fijar_ahora(aplicacion, ahora=AHORA):
    aplicacion.dependency_overrides[obtener_ahora] = lambda: ahora


def panel(cliente, salon='5A', esperado=200, cuenta='ori-carmen'):
    ruta = f'/cuentas/{cuenta}/panel/seguimiento' + (f'?salon={salon}' if salon else '')
    respuesta = cliente.get(ruta)
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def ver(cliente, conjunto, valor=None, salon='5A', esperado=200):
    parametros = {'conjunto': conjunto, **({'valor': valor} if valor else {}), **({'salon': salon} if salon else {})}
    respuesta = cliente.get('/cuentas/ori-carmen/panel/estudiantes', params=parametros)
    assert respuesta.status_code == esperado, respuesta.text
    return [fila['codigo'] for fila in respuesta.json()] if esperado == 200 else respuesta.json()


def cuenta(sesion, codigo):
    return sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == codigo))


def nuevo_estudiante(sesion, codigo, nombre, salon='5A'):
    """DATO DE PRUEBA: un estudiante más del salón, sin credenciales."""
    salon_id = sesion.scalar(select(m.Salon.id).where(m.Salon.codigo == salon))
    estudiante = m.Cuenta(codigo=codigo, nombre=nombre, rol=m.Rol.ESTUDIANTE, salon_id=salon_id)
    sesion.add(estudiante)
    sesion.flush()
    return estudiante


def evento(sesion, codigo, tipo, hace_dias=0, referencia=None):
    sesion.add(m.EventoUso(cuenta_id=cuenta(sesion, codigo).id, tipo=tipo, id_referencia=referencia,
                           fecha_hora=AHORA - timedelta(days=hace_dias)))


def senales(sesion, codigo, *niveles):
    """Check-ins en días seguidos; el último nivel es el más reciente."""
    cuenta_id = cuenta(sesion, codigo).id
    for atras, nivel in enumerate(reversed(niveles)):
        sesion.add(m.CheckIn(cuenta_id=cuenta_id, fecha=date(2026, 10, 19) - timedelta(days=atras),
                             nivel_seguridad=nivel))


def alerta(datos, codigo):
    for grupo in datos['avisos']['grupos']:
        for fila in grupo['alertas']:
            if fila['codigo'] == codigo:
                return fila
    return None


def aplicacion_id(sesion, codigo='APL-RIASEC'):
    return sesion.scalar(select(m.Aplicacion.id).where(m.Aplicacion.codigo == codigo))


def resultado(sesion, codigo, plano=False, avisos=None, aplicacion='APL-RIASEC'):
    """DATO DE PRUEBA: un resultado vigente sembrado (y su fila de ritmo, si `avisos`)."""
    cuenta_id, apl = cuenta(sesion, codigo).id, aplicacion_id(sesion, aplicacion)
    sesion.add(m.ResultadoInstrumento(cuenta_id=cuenta_id, aplicacion_id=apl, calculado_en=AHORA, perfil_plano=plano))
    if avisos is not None:
        sesion.add(m.RitmoAplicacion(cuenta_id=cuenta_id, aplicacion_id=apl, avisos_velocidad=avisos,
                                     actualizado_en=AHORA))


def tarjeta(sesion, codigo, carrera, prioridad, institucion=None, activa=True):
    """DATO DE PRUEBA: un plan (tarjeta) del estudiante, con la carrera y la institución por código."""
    carrera_id = sesion.scalar(select(m.Carrera.id).where(m.Carrera.codigo == carrera))
    institucion_id = (sesion.scalar(select(m.Institucion.id).where(m.Institucion.codigo == institucion))
                      if institucion else None)
    fila = m.TarjetaCarrera(cuenta_id=cuenta(sesion, codigo).id, carrera_id=carrera_id,
                            prioridad=prioridad if activa else None, activa=activa, institucion_id=institucion_id,
                            creada_en=AHORA, actualizada_en=AHORA)
    sesion.add(fila)
    sesion.flush()
    return fila


def favorito(sesion, codigo, tipo, referencia):
    """DATO DE PRUEBA: un favorito de carrera o institución, por código."""
    modelo = m.Carrera if tipo == m.TipoFavorito.CARRERA else m.Institucion
    sesion.add(m.Favorito(cuenta_id=cuenta(sesion, codigo).id, tipo=tipo, fecha_hora=AHORA,
                          id_referencia=sesion.scalar(select(modelo.id).where(modelo.codigo == referencia))))


def complicacion(sesion, tarjeta_fila, opcion=None, otro=None, numero=1):
    opcion_id = None
    if opcion:
        opcion_id = sesion.scalar(select(m.OpcionLista.id).join(m.ListaOpciones).where(
            m.ListaOpciones.codigo == 'DIFICULTADES', m.OpcionLista.codigo == opcion))
    sesion.add(m.ComplicacionTarjeta(tarjeta_id=tarjeta_fila.id, numero=numero, opcion_id=opcion_id, texto_otro=otro,
                                     creada_en=AHORA))


def intereses(cliente, salon='5A', esperado=200, **orden):
    respuesta = cliente.get('/cuentas/ori-carmen/panel/intereses', params={**({'salon': salon} if salon else {}),
                                                                         **orden})
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def familia_de(sesion, carrera):
    return sesion.scalar(select(m.FamiliaCarrera.codigo).join(m.Carrera, m.Carrera.familia_id == m.FamiliaCarrera.id)
                         .where(m.Carrera.codigo == carrera))
