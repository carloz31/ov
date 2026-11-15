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


# --- Ajuste panel-estudiantes ----------------------------------------------------------------------

ZONAS_PROMEDIO = {'POR_TRABAJAR': 1.0, 'EN_CAMINO': 3.0, 'FUERTE': 4.0}


def medicion(sesion, codigo, aplicacion, zonas, hace_dias=0):
    """DATO DE PRUEBA: un resultado vigente de partida (APL-PARTIDA) o llegada (APL-LLEGADA) con la zona de cada
    dimensión (`{'AUTO-...': 'FUERTE'}`); las no nombradas quedan EN_CAMINO."""
    apl = aplicacion_id(sesion, aplicacion)
    instrumento_id = sesion.scalar(select(m.Aplicacion.instrumento_id).where(m.Aplicacion.id == apl))
    resultado_fila = m.ResultadoInstrumento(cuenta_id=cuenta(sesion, codigo).id, aplicacion_id=apl,
                                            calculado_en=AHORA - timedelta(days=hace_dias))
    sesion.add(resultado_fila)
    sesion.flush()
    for dimension in sesion.scalars(select(m.Dimension).where(m.Dimension.instrumento_id == instrumento_id)):
        cantidad = len(sesion.scalars(select(m.ItemInstrumento.id).where(
            m.ItemInstrumento.dimension_id == dimension.id)).all())
        promedio = ZONAS_PROMEDIO[zonas.get(dimension.codigo, 'EN_CAMINO')]
        sesion.add(m.ResultadoDimension(resultado_id=resultado_fila.id, dimension_id=dimension.id,
                                        puntaje=promedio * cantidad, puntaje_maximo=4.0 * cantidad))
    return resultado_fila


def conocimiento(sesion, tarjeta_fila, **respuestas):
    """DATO DE PRUEBA: respuestas de «Qué tanto la conoce» (`DIA_NORMAL='NO'`)."""
    sesion.add_all(m.ConocimientoTarjeta(tarjeta_id=tarjeta_fila.id, pregunta=m.PreguntaConocimiento(p),
                                         respuesta=m.RespuestaConocimiento(r)) for p, r in respuestas.items())


def alertas_de(sesion, codigo, en_inicio=True, ahora=AHORA):
    """Las alertas que cumple un estudiante (calculadas sobre su salón): código → (nombre_perfil, descripcion_perfil)."""
    from app.core.contexto import usar_contexto
    from app.services.panel.alertas import calcular_alertas
    from app.services.panel.comun import Lecturas, resolver_alcance

    @usar_contexto
    def calcular(s):
        estudiante_id = cuenta(s, codigo).id
        lecturas = Lecturas(s, resolver_alcance(s, 'ori-carmen', '5A', ahora))
        return {a.alerta.codigo: (a.nombre_perfil(estudiante_id), a.descripcion_perfil(estudiante_id))
                for a in calcular_alertas(lecturas, en_inicio) if estudiante_id in a.datos}
    return calcular(sesion)


def responder_autopercepcion(sesion, codigo, actividad, por_item, defecto=3):
    """DATO DE PRUEBA: respuestas de partida (`t-partida`) o llegada (`t-llegada`): `{numero de ítem: orden de la
    opción}` (1 Nada de acuerdo … 4 Muy de acuerdo); el resto con `defecto`."""
    actividad_id = sesion.scalar(select(m.Actividad.id).where(m.Actividad.codigo == actividad))
    progreso = m.ProgresoActividad(cuenta_id=cuenta(sesion, codigo).id, actividad_id=actividad_id,
                                   estado=m.EstadoProgreso.COMPLETADA)
    sesion.add(progreso)
    sesion.flush()
    items = sesion.execute(select(m.ItemInstrumento).join(
        m.ActividadItem, m.ActividadItem.item_id == m.ItemInstrumento.id).where(
        m.ActividadItem.actividad_id == actividad_id)).scalars().all()
    for item in items:
        opcion = sesion.scalar(select(m.OpcionEscala.id).where(m.OpcionEscala.escala_id == item.escala_id,
                                                               m.OpcionEscala.orden == por_item.get(item.numero, defecto)))
        sesion.add(m.RespuestaItem(progreso_id=progreso.id, item_id=item.id, opcion_id=opcion, creada_en=AHORA,
                                   actualizada_en=AHORA))
    return {item.numero: item for item in items}


# --- Auditoría del panel (H1): los estudiantes de ejemplo ------------------------------------------

AHORA_EJEMPLO = datetime(2026, 11, 12, 10, 0)  # DATO DE PRUEBA: la hora fija de la siembra y de las lecturas
ESTUDIANTES_EJEMPLO = tuple(f'est-panel-{n}' for n in range(1, 9))


def sembrar_ejemplo(aplicacion):
    """Siembra los ocho estudiantes de `scripts/sembrar_panel_ejemplo.py` sobre una base `contenido` (sin red) y fija
    la hora de las lecturas."""
    import sys
    from pathlib import Path
    scripts = str(Path(__file__).resolve().parents[2] / 'scripts')
    if scripts not in sys.path:
        sys.path.insert(0, scripts)
    from sembrar_panel_ejemplo import sembrar
    sembrar(aplicacion, AHORA_EJEMPLO)
    fijar_ahora(aplicacion, AHORA_EJEMPLO)



def registro(sesion, codigo, item, elegidas=(), sensible=False, tipo_final=None, valores=None,
             estado=m.EstadoRespuestaRegistro.COMPLETADO, texto='DATO DE PRUEBA: respuesta'):
    """DATO DE PRUEBA (ajuste pendientes-orientadora): un intento vigente de un ítem de registro, con lo marcado
    tal como se mostró (`[(código, texto)]`) y sus `valores_contexto`. Si ya había uno vigente, este es un intento
    nuevo (la edición) y el anterior pasa al histórico."""
    fila_item = sesion.scalar(select(m.ItemRegistro).where(m.ItemRegistro.codigo == item))
    cuenta_id = cuenta(sesion, codigo).id
    progreso = sesion.scalar(select(m.ProgresoActividad).where(m.ProgresoActividad.cuenta_id == cuenta_id,
                                                               m.ProgresoActividad.actividad_id == fila_item.actividad_id))
    if progreso is None:
        progreso = m.ProgresoActividad(cuenta_id=cuenta_id, actividad_id=fila_item.actividad_id,
                                       estado=m.EstadoProgreso.EN_CURSO)
        sesion.add(progreso)
        sesion.flush()
    anteriores = sesion.scalars(select(m.RespuestaRegistro).where(
        m.RespuestaRegistro.progreso_id == progreso.id, m.RespuestaRegistro.item_registro_id == fila_item.id)).all()
    for anterior in anteriores:
        anterior.vigente = False
    sesion.flush()
    fila = m.RespuestaRegistro(progreso_id=progreso.id, item_registro_id=fila_item.id, intento=len(anteriores) + 1,
                               opciones_elegidas=[{'codigo': c, 'texto': t} for c, t in elegidas],
                               valores_contexto=valores, primera_respuesta=texto, tipo_final=tipo_final,
                               estado=estado, sensible=sensible, creada_en=AHORA, actualizada_en=AHORA)
    sesion.add(fila)
    sesion.flush()
    return fila


def motivos(sesion, tarjeta_fila, *opciones, otros=()):
    """DATO DE PRUEBA: motivos de «Por qué la elijo» (códigos de la lista VALORES y, después, escritos a mano)."""
    posicion = 0
    for codigo in opciones:
        posicion += 1
        opcion_id = sesion.scalar(select(m.OpcionLista.id).join(m.ListaOpciones).where(
            m.ListaOpciones.codigo == 'VALORES', m.OpcionLista.codigo == codigo))
        sesion.add(m.MotivoTarjeta(tarjeta_id=tarjeta_fila.id, posicion=posicion, opcion_id=opcion_id))
    for texto in otros:
        posicion += 1
        sesion.add(m.MotivoTarjeta(tarjeta_id=tarjeta_fila.id, posicion=posicion, texto_otro=texto))


def duda(sesion, tarjeta_fila, numero, abierta=True):
    """DATO DE PRUEBA: una duda propia del plan."""
    sesion.add(m.DudaTarjeta(tarjeta_id=tarjeta_fila.id, numero=numero, origen=m.OrigenDuda.PROPIA,
                             texto=f'DATO DE PRUEBA: duda {numero}', creada_en=AHORA,
                             estado=m.EstadoDuda.ABIERTA if abierta else m.EstadoDuda.CERRADA))
