"""Estudiantes de ejemplo para revisar la lista y el perfil del estudiante de la orientadora (ajuste
panel-estudiantes §12).

DATO DE PRUEBA: once estudiantes inventados (`est-panel-1` … `est-panel-11`) en 5A de ori-carmen, sobre una base con
el conjunto `contenido`. Usa las acciones reales (camino, cuestionarios, registros, planes) con el cliente de prueba del
LLM (nunca la red); lo que hoy decide el LLM (`tipo_final`, `sensible`, repregunta), los check-ins, los ingresos y la
familia se escriben directo. No es parte de ningún conjunto ni se despliega. Si un estudiante ya existe, no se toca.

Se niega a correr sin `--desarrollo` o si la configuración dice `ENTORNO=produccion`:

    uv run python scripts/sembrar_panel_ejemplo.py --desarrollo

O, de una vez, al cargar el conjunto (por defecto; `--sin-ejemplos` lo omite): `uv run python -m datos.cargar contenido --vaciar`.
`datos.cargar` corre este script con ENTORNO=desarrollo y sin clave del LLM solo para este proceso, también en la EC2.

Al final siembra las entrevistas de muestra de `contenido.ENTREVISTAS_EJEMPLO` (ajuste panel-entrevistas-configuracion):
las de 5A con las acciones reales y la del salón egresado `contenido.SALON_EGRESADO` (2024-A, sin orientadora ni
credenciales) directo, con los eventos registrados por el motor.

Cada estudiante y apoderado de ejemplo puede ingresar con las credenciales de `CREDENCIALES` (DATO DE PRUEBA, correos
de example.com, dominio reservado). No van en `datos/usuarios_prueba.txt`, que es solo de `ruta`.
"""

import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import sys
from types import SimpleNamespace

RAIZ = Path(__file__).resolve().parents[1]
for ruta in (RAIZ, RAIZ / 'tests' / 'soporte'):
    if str(ruta) not in sys.path:
        sys.path.insert(0, str(ruta))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app import models as m  # noqa: E402
from app.config import cargar_configuracion  # noqa: E402
from app.models import OrigenSesion  # noqa: E402
from app.services.acceso import emitir_token  # noqa: E402
from datos import contenido  # noqa: E402
from prerrequisitos_contenido import antes_de, despues_de  # noqa: E402

SALON, ORIENTADORA = '5A', 'ori-carmen'
# DATO DE PRUEBA: (código, nombre, caso de §12)
ESTUDIANTES = (
    ('est-panel-1', 'Elena Espinoza León', 'Nunca ingresó'),
    ('est-panel-2', 'Andrea Vargas Luna', 'Recién empieza'),
    ('est-panel-3', 'Fabián Ortiz Vega', 'Test con perfil plano'),
    ('est-panel-4', 'Diego Mendoza Salas', 'Test respondido con prisa'),
    ('est-panel-5', 'Luciana Paredes Soto', 'A mitad, con mucho registrado'),
    ('est-panel-6', 'Camila Cárdenas Ruiz', 'Respuesta sensible'),
    ('est-panel-7', 'Ana Lucía Álvarez Rojas', 'Terminó el camino'),
    ('est-panel-8', 'Fabio Flores Vega', 'Avanzado y sin avisos'),
    # Ajuste respuestas-orientadora (pedido del usuario): casos que los ocho anteriores no muestran.
    ('est-panel-9', 'Tomás Quispe Huamán', 'Cuestionarios opcionales y misiones de la ciudad'),
    ('est-panel-10', 'Valeria Ccori Mamani', 'Cambió sus planes después de responder'),
    ('est-panel-11', 'Mateo Rivas Paz', 'Sin apoderado y con un registro a medias'),
)
# DATO DE PRUEBA: apoderados de los casos 3 a 10 (código, nombre, estudiante, parentesco). Ajuste desbloqueos: b1-4 pide
# la carta del estudiante, que exige un vínculo, así que los casos que pasan b1-4 (3 a 10) tienen apoderado; el 11 no.
# DATO DE PRUEBA: (cuenta, correo, contraseña) para ingresar como cada estudiante y apoderado de ejemplo.
CREDENCIALES = (
    *((f'est-panel-{n}', f'panel{n}.estudiante@example.com', f'Panel{n}-2026!') for n in range(1, 12)),
    *((f'apo-panel-{n}', f'panel{n}.apoderado@example.com', f'ApoPanel{n}-2026!') for n in (3, 4, 5, 6, 7, 8, 9, 10)),
)

APODERADOS = (('apo-panel-3', 'Gloria Vega', 'est-panel-3', 'madre'),
              ('apo-panel-4', 'Raúl Mendoza', 'est-panel-4', 'padre'),
              ('apo-panel-5', 'José Paredes', 'est-panel-5', 'padre'),
              ('apo-panel-6', 'Marta Ruiz', 'est-panel-6', 'madre'),
              ('apo-panel-7', 'Rocío Rojas', 'est-panel-7', 'madre'),
              ('apo-panel-8', 'Luis Flores', 'est-panel-8', 'padre'),
              ('apo-panel-9', 'Rosa Huamán', 'est-panel-9', 'madre'),
              ('apo-panel-10', 'Pedro Ccori', 'est-panel-10', 'padre'))
TEXTO = 'DATO DE PRUEBA: lo cuento con un ejemplo de mi casa.'


class Cliente(TestClient):
    """Firma el token de la cuenta que nombra la petición (ruta o `cuenta` del cuerpo), con su rol de la base."""

    def __init__(self, aplicacion, roles):
        super().__init__(aplicacion)
        self.roles = roles

    def request(self, method, url, *args, **kwargs):
        from soporte_acceso import cuenta_de_peticion
        codigo = cuenta_de_peticion(url, kwargs.get('json'))
        cuenta = SimpleNamespace(codigo=codigo, rol=self.roles.get(codigo, m.Rol.ESTUDIANTE))
        if method.upper() == 'POST' and isinstance(kwargs.get('json'), dict):
            # Toda acción con la misma fecha fija (la de las ayudas de pruebas): así el resultado no depende del reloj.
            from soporte_ruta import FECHA
            kwargs['json'] = {'fecha_hora': FECHA, **kwargs['json']}
        token, _ = emitir_token(cuenta, OrigenSesion.CONTRASENA, self.app.state.configuracion.jwt_secreto)
        kwargs['headers'] = {**(kwargs.get('headers') or {}), 'Authorization': f'Bearer {token}'}
        return super().request(method, url, *args, **kwargs)


class Sembrador:
    def __init__(self, aplicacion, sesion, ahora: datetime):
        self.aplicacion, self.sesion, self.ahora = aplicacion, sesion, ahora
        self.cliente = Cliente(aplicacion, {})

    # --- Cuentas y estado directo ----------------------------------------------------------------

    def cuenta(self, codigo):
        return self.sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == codigo))

    def crear_cuentas(self) -> list[str]:
        from datos.cargador import _hash
        salon = self.sesion.scalar(select(m.Salon).where(m.Salon.codigo == SALON))
        acceso = {codigo: (correo, _hash(contrasena)) for codigo, correo, contrasena in CREDENCIALES}
        nuevos = []
        for codigo, nombre, _ in ESTUDIANTES:
            if self.cuenta(codigo) is None:
                correo, clave = acceso[codigo]
                self.sesion.add(m.Cuenta(codigo=codigo, nombre=nombre, rol=m.Rol.ESTUDIANTE, salon_id=salon.id,
                                         correo=correo, contrasena_hash=clave))
                nuevos.append(codigo)
        for codigo, nombre, estudiante, parentesco in APODERADOS:
            if estudiante in nuevos:
                correo, clave = acceso[codigo]
                self.sesion.add(m.Cuenta(codigo=codigo, nombre=nombre, rol=m.Rol.APODERADO, correo=correo,
                                         contrasena_hash=clave))
        self.sesion.flush()
        for codigo, _, estudiante, parentesco in APODERADOS:
            if estudiante in nuevos:
                self.sesion.add(m.VinculoFamiliar(codigo=f'VIN-{estudiante}', estudiante_id=self.cuenta(estudiante).id,
                                                  apoderado_id=self.cuenta(codigo).id, parentesco=parentesco))
        self.sesion.commit()
        self.cliente.roles = {c.codigo: c.rol for c in self.sesion.scalars(select(m.Cuenta))}
        return nuevos

    def ingreso(self, codigo, hace_dias):
        self.sesion.add(m.EventoUso(cuenta_id=self.cuenta(codigo).id, tipo=m.TipoEventoUso.INGRESO,
                                    fecha_hora=self.ahora - timedelta(days=hace_dias)))

    def senales(self, codigo, *niveles):
        """Una señal cada dos días; la última es de ayer."""
        cuenta_id = self.cuenta(codigo).id
        for atras, nivel in enumerate(reversed(niveles)):
            self.sesion.add(m.CheckIn(cuenta_id=cuenta_id, fecha=self.ahora.date() - timedelta(days=1 + 2 * atras),
                                      nivel_seguridad=nivel))

    def diario(self, codigo, cantidad):
        cuenta_id = self.cuenta(codigo).id
        for numero in range(1, cantidad + 1):
            self.sesion.add(m.EntradaDiario(cuenta_id=cuenta_id, origen=m.OrigenEntrada.LIBRE, numero=numero,
                                            numero_libre=numero, texto='DATO DE PRUEBA: entrada privada.',
                                            fecha_hora=self.ahora - timedelta(days=2 * (cantidad - numero) + 2)))

    def respuestas(self, codigo, actividad):
        return self.sesion.scalars(select(m.RespuestaRegistro).join(m.ProgresoActividad).join(m.Actividad).where(
            m.ProgresoActividad.cuenta_id == self.cuenta(codigo).id, m.Actividad.codigo == actividad,
            m.RespuestaRegistro.vigente).order_by(m.RespuestaRegistro.id)).all()

    # --- Acciones reales -------------------------------------------------------------------------

    def pedir(self, metodo, ruta, datos=None):
        self.sesion.commit()  # lo escrito directo, antes de que la aplicación escriba (SQLite bloquea)
        respuesta = self.cliente.request(metodo, ruta, json=datos)
        if respuesta.status_code != 200:
            raise RuntimeError(f'{metodo} {ruta}: {respuesta.status_code} {respuesta.text}')
        return respuesta.json()

    def responder_items(self, codigo, actividad, opcion_de):
        """`opcion_de(item)` da el orden de la opción para cada ítem de la definición."""
        items = self.pedir('GET', f'/actividades/{actividad}/items')
        self.pedir('POST', '/acciones/responder-items', {'cuenta': codigo, 'actividad': actividad, 'respuestas': [
            {'item': i['codigo'], 'opcion': opcion_de(i)} for i in items]})

    def completar(self, codigo, actividad, opcion_de=None):
        from soporte_contenido import TIPOS
        from soporte_ruta import responder_registro
        tipo = TIPOS.get(actividad) or self.sesion.scalar(select(m.Actividad.tipo).where(
            m.Actividad.codigo == actividad)).value
        if tipo == 'BATALLA':
            vidas, _, _ = contenido.CONFIGURACION_BATALLAS[actividad]
            pool = [p for p in contenido.PREGUNTAS_BATALLA if p[1] == actividad]
            return self.pedir('POST', '/acciones/resolver-batalla', {
                'cuenta': codigo, 'actividad': actividad,
                'respuestas': [{'pregunta': p[0], 'opcion': p[5]} for p in pool[:vidas]]})
        if tipo == 'REGISTRO':
            self.sesion.commit()
            return responder_registro(self.cliente, actividad, codigo, texto=TEXTO)
        if tipo == 'CUESTIONARIO':
            self.responder_items(codigo, actividad, opcion_de or (lambda i: 3))
        return self.pedir('POST', '/acciones/completar-actividad', {'cuenta': codigo, 'actividad': actividad})

    def autopercepcion(self, valor_de, por_item=None):
        """Opción de partida o llegada para obtener `valor_de(dimensión)` (o `por_item[código]`, que manda) con los
        ítems inversos ya invertidos."""
        inversos = {i.codigo for i in self.sesion.scalars(select(m.ItemInstrumento).where(m.ItemInstrumento.inverso))}
        por_item = por_item or {}

        def opcion(item):
            valor = por_item.get(item['codigo'], valor_de(item['dimension']))
            return 5 - valor if item['codigo'] in inversos else valor
        return opcion

    def intereses(self, codigo, plano=False):
        for parte in range(1, 7):
            self.completar(codigo, f'h-intereses-{parte}',
                           (lambda i: 3) if plano else (lambda i: {'S': 5, 'I': 4, 'A': 4}.get(i['dimension'], 2)))
        self.pedir('POST', '/acciones/revelar-resultado', {'cuenta': codigo, 'instrumento': 'TEST-RIASEC'})

    def avanzar(self, codigo, hasta, partida=None, llegada=None, planes=True):
        """Las requeridas del camino hasta `hasta`, con lo que cada tramo pide además (como el recorrido de pruebas)."""
        from soporte_contenido import REQUERIDAS
        for actividad in REQUERIDAS[:REQUERIDAS.index(hasta) + 1]:
            if actividad == 'b3-10' and not self.tiene_resultado(codigo, 'APL-RIASEC'):
                self.intereses(codigo)
            opcion = partida if actividad == 'b0-3' else llegada if actividad == 'b5-2' else None
            # Ajuste desbloqueos: la carta, el caso y el guion que piden b1-4, b1-7 y b3-2 (sin LLM), y la misión de
            # Anselmo tras b1-7.
            antes_de(actividad, lambda nombre, datos: self.pedir('POST', f'/acciones/{nombre}', {'cuenta': codigo, **datos}))
            self.completar(codigo, actividad, opcion)
            despues_de(actividad, lambda otra: self.completar(codigo, otra))
            if actividad in ('b0-3', 'b5-2'):
                self.pedir('POST', '/acciones/revelar-resultado', {
                    'cuenta': codigo, 'instrumento': 'TEST-PARTIDA-LLEGADA',
                    'aplicacion': 'APL-PARTIDA' if actividad == 'b0-3' else 'APL-LLEGADA'})
            if actividad == 'b3-8' and planes:
                self.preparar_planes(codigo)
            if actividad == 'b4-5':
                self.guardar(codigo, 'PSICOLOGIA', 'PASOS', {'pasos': [
                    {'tipo': 'conversar', 'texto': 'DATO DE PRUEBA: hablar con una psicóloga.'}]})

    def preparar_planes(self, codigo):
        """Como el recorrido de pruebas: Psicología (A) y Periodismo (B), con «Por qué la elijo» y «Cómo lo haría realidad»."""
        from soporte_planes import por_que_lista, realidad_lista
        for carrera in ('PSICOLOGIA', 'PERIODISMO'):
            self.crear_plan(codigo, carrera)
            self.guardar(codigo, carrera, 'POR_QUE', por_que_lista())
            # DATO DE PRUEBA (ajuste panel-orientadora-observaciones): un presupuesto con varios rubros.
            self.guardar(codigo, carrera, 'REALIDAD', realidad_lista(gastos=[
                {'rubro': 'MATRICULA', 'monto': 600, 'frecuencia': 'POR_CICLO'},
                {'rubro': 'MATERIALES', 'monto': 300, 'frecuencia': 'POR_CICLO'},
                {'rubro': 'TRANSPORTE', 'monto': 150, 'frecuencia': 'MENSUAL'}]))

    def crear_plan(self, codigo, carrera):
        from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
        carrera = {'PSICOLOGIA': PSICOLOGIA, 'PERIODISMO': PERIODISMO}.get(carrera, carrera)
        self.pedir('POST', '/acciones/marcar-favorito', {'cuenta': codigo, 'tipo': 'CARRERA', 'codigo': carrera})
        self.pedir('POST', '/acciones/planes/crear', {'cuenta': codigo, 'carrera': carrera})

    def tiene_resultado(self, codigo, aplicacion):
        return self.sesion.scalar(select(m.ResultadoInstrumento.id).join(m.Aplicacion).where(
            m.ResultadoInstrumento.cuenta_id == self.cuenta(codigo).id, m.Aplicacion.codigo == aplicacion,
            m.ResultadoInstrumento.anulado_en.is_(None))) is not None

    def guardar(self, codigo, carrera, seccion, datos):
        from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
        carreras = {'PSICOLOGIA': PSICOLOGIA, 'PERIODISMO': PERIODISMO}
        return self.pedir('POST', '/acciones/planes/guardar-seccion', {
            'cuenta': codigo, 'carrera': carreras.get(carrera, carrera), 'seccion': seccion, 'datos': datos})


def sembrar_casos(s: Sembrador) -> list[str]:
    from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
    nuevos = s.crear_cuentas()
    hecho = set(nuevos)
    # 1 · Nunca ingresó: nada más.
    if 'est-panel-2' in hecho:  # 2 · Recién empieza: parte del tramo 1, partida respondida.
        s.ingreso('est-panel-2', 12)
        # Ajuste color-partida-llegada: respuestas bajas en la partida, incluido el ítem inverso (AUTO-04), salvo en
        # «Conocimiento de mí» y «Decisión propia».
        s.avanzar('est-panel-2', 'b0-4', partida=s.autopercepcion(lambda d: {'AUTO-B': 3, 'AUTO-D': 3}.get(d, 2)),
                  planes=False)
    if 'est-panel-3' in hecho:  # 3 · Perfil plano; un plan sin etiqueta de áreas.
        s.ingreso('est-panel-3', 2)
        s.avanzar('est-panel-3', 'b3-8')
        s.intereses('est-panel-3', plano=True)
        s.diario('est-panel-3', 3)
    if 'est-panel-4' in hecho:  # 4 · Con prisa; un plan con solo «Por qué la elijo».
        s.ingreso('est-panel-4', 1)
        s.avanzar('est-panel-4', 'b3-5', planes=False)
        # Ajuste recorte-puerto: b3-6 y b3-7 son opcionales; se hacen para dejar el mismo avance de antes.
        for opcional in ('b3-6', 'b3-7'):
            s.completar('est-panel-4', opcional)
        s.intereses('est-panel-4')
        cuenta_id = s.cuenta('est-panel-4').id
        aplicacion_id = s.sesion.scalar(select(m.Aplicacion.id).where(m.Aplicacion.codigo == 'APL-RIASEC'))
        ritmo = s.sesion.scalar(select(m.RitmoAplicacion).where(
            m.RitmoAplicacion.cuenta_id == cuenta_id, m.RitmoAplicacion.aplicacion_id == aplicacion_id)) or m.RitmoAplicacion(
            cuenta_id=cuenta_id, aplicacion_id=aplicacion_id, avisos_velocidad=0, actualizado_en=s.ahora)
        ritmo.avisos_velocidad = 3  # DATO DE PRUEBA: lo que hoy decide el aviso de velocidad
        s.sesion.add(ritmo)
        s.sesion.commit()
        s.crear_plan('est-panel-4', 'PSICOLOGIA')
        s.guardar('est-panel-4', 'PSICOLOGIA', 'POR_QUE', {'idea_origen': 'MIA', 'motivos': [{'opcion': 'AYUDAR'}],
                                                         'relato': 'DATO DE PRUEBA: me gusta escuchar a mis amigos.'})
    if 'est-panel-5' in hecho:  # 5 · A mitad, con mucho registrado.
        s.ingreso('est-panel-5', 0)
        s.ingreso('apo-panel-5', 5)
        s.avanzar('est-panel-5', 'b4-5', partida=s.autopercepcion(lambda d: {'AUTO-E': 1}.get(d, 3)))
        s.guardar('est-panel-5', 'PSICOLOGIA', 'CONOCIMIENTO', {
            'respuestas': {'DIA_NORMAL': 'NO', 'DONDE_TRABAJAR': 'SI', 'CURSOS': 'NO', 'INGRESO': 'MAS_O_MENOS',
                           'CONOCE_ALGUIEN': 'NO'},
            'dudas': [{'origen': 'PROPIA', 'texto': f'DATO DE PRUEBA: duda propia {n}'} for n in range(1, 4)]})
        s.guardar('est-panel-5', 'PSICOLOGIA', 'PASOS', {'pasos': [
            {'tipo': 'conversar' if n % 2 else 'investigar', 'texto': f'DATO DE PRUEBA: paso {n}.'} for n in range(1, 7)]})
        s.pedir('POST', '/acciones/planes/paso-hecho', {'cuenta': 'est-panel-5', 'carrera': PSICOLOGIA, 'paso': 2,
                                                        'hallazgo': 'DATO DE PRUEBA: el ciclo dura cuatro meses.'})
        s.pedir('POST', '/acciones/planes/medidores', {'cuenta': 'est-panel-5', 'carrera': PSICOLOGIA,
                                                       'entusiasmo': 3, 'capacidad': 2, 'recursos': 1})
        # Ajuste pendientes-orientadora: temas `voces-chocan`, `valores-fuera-del-plan` (sus motivos no están en su
        # podio), `plan-se-ve-lejos` con complicaciones y `plan-conoce-poco` con dudas (de arriba).
        s.guardar('est-panel-5', 'PSICOLOGIA', 'POR_QUE', {'idea_origen': 'MIA', 'motivos': [
            {'opcion': 'CREAR'}, {'opcion': 'APRENDER'}], 'relato': 'DATO DE PRUEBA: me gusta entender a la gente.'})
        _complicaciones(s, 'est-panel-5', ('ECONOMICAS', None), (None, 'DATO DE PRUEBA: queda lejos de mi casa'))
        _elegir(s, 'est-panel-5', 'b1-3-contraste', ('CHOCAN', 'Chocan'))
        s.respuestas('est-panel-5', 'b1-3')[-1].tipo_final = 'vacio'  # b1-3 es el destacado de 5A
        s.respuestas('est-panel-5', 'b1-7')[0].estado = m.EstadoRespuestaRegistro.ABIERTO
        # Ajuste respuestas-orientadora: una respuesta fuera de tema en un registro no destacado.
        s.respuestas('est-panel-5', 'b1-7')[1].tipo_final = 'fuera_de_tema'
        otra = next((r for r in s.respuestas('est-panel-5', 'b4-1') if r.opciones_elegidas), None)
        if otra is not None:
            otra.opciones_elegidas = [*otra.opciones_elegidas[:1],
                                      {'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA: me impresiona la sangre'}]
        repregunta = s.respuestas('est-panel-5', 'b4-1')[0]
        repregunta.repregunta = '¿En qué momento te ha tocado explicarle algo así a alguien?'
        repregunta.segunda_respuesta = 'DATO DE PRUEBA: cuando mi abuela tomaba varias pastillas.'
        s.senales('est-panel-5', 4, 4, 3, 2, 2, 1)
        s.diario('est-panel-5', 6)
    if 'est-panel-6' in hecho:  # 6 · Respuesta sensible; apoderado con ruta completa y una conversación.
        s.ingreso('est-panel-6', 9)
        s.ingreso('apo-panel-6', 3)
        s.avanzar('est-panel-6', 'b1-3', partida=s.autopercepcion(lambda d: 3), planes=False)
        sensible = s.respuestas('est-panel-6', 'b1-3')[0]
        sensible.sensible = True
        # Ajuste respuestas-orientadora: otra sensible, en un registro no destacado (se ve igual en «Destacados»).
        s.respuestas('est-panel-6', 'b1-1')[0].sensible = True
        for actividad in sorted(c for c, b, *_ in contenido.ACTIVIDADES if b == 'FAMILIA'):
            s.completar('apo-panel-6', actividad)
        vinculo = s.sesion.scalar(select(m.VinculoFamiliar).where(m.VinculoFamiliar.codigo == 'VIN-est-panel-6'))
        conversacion = min(s.sesion.scalars(select(m.Conversacion)), key=lambda c: c.orden)
        s.sesion.add(m.ConversacionVinculo(vinculo_id=vinculo.id, conversacion_id=conversacion.id,
                                           respuesta_estudiante='DATO DE PRUEBA', respondida_estudiante_en=s.ahora,
                                           respuesta_apoderado='DATO DE PRUEBA', respondida_apoderado_en=s.ahora,
                                           conversada_en=s.ahora))
    if 'est-panel-7' in hecho:  # 7 · Terminó; una dimensión bajó; tres planes; Plan A fuera de sus áreas.
        s.ingreso('est-panel-7', 0)
        s.ingreso('apo-panel-7', 1)
        # Ajuste color-partida-llegada: AUTO-01 sube de «Nada» a «Poco» (sube y sigue baja) y AUTO-04, inverso,
        # cambia; «Decisión propia» baja.
        s.avanzar('est-panel-7', 'b4-5', partida=s.autopercepcion(lambda d: {'AUTO-D': 4}.get(d, 2), {'AUTO-01': 1}))
        _plan_fuera_de_areas(s, 'est-panel-7', [PSICOLOGIA, PERIODISMO])
        s.avanzar_resto('est-panel-7', llegada=s.autopercepcion(lambda d: {'AUTO-D': 2}.get(d, 4), {'AUTO-01': 2}))
        # Ajuste pendientes-orientadora: seis temas, más que el tope. Respondió la moneda (`DESANIME`) antes de cambiar su
        # Plan B, así que `plan-b-desanima` no aparece.
        plan_a = s.sesion.scalar(select(m.Carrera.codigo).join(m.TarjetaCarrera).where(
            m.TarjetaCarrera.cuenta_id == s.cuenta('est-panel-7').id, m.TarjetaCarrera.prioridad == 1))
        s.pedir('POST', '/acciones/planes/medidores', {'cuenta': 'est-panel-7', 'carrera': plan_a, 'entusiasmo': 1})
        _elegir(s, 'est-panel-7', 'b1-3-contraste', ('CHOCAN', 'Chocan'))
        _elegir(s, 'est-panel-7', 'b4-2-estilo', ('LO_QUE_ESPERAN', 'Termino haciendo lo que otros esperan'))
        _elegir(s, 'est-panel-7', 'b4-5-moneda', ('DESANIME', 'Me desanimé'))
        _elegir(s, 'est-panel-7', 'b5-1-seguridad', ('POCO', 'Poco seguro/a'))
        s.senales('est-panel-7', 3, 4, 4)
    if 'est-panel-8' in hecho:  # 8 · Avanzado y sin avisos; habilidades sociales e inteligencias reveladas.
        s.ingreso('est-panel-8', 0)
        s.ingreso('apo-panel-8', 0)
        s.avanzar('est-panel-8', 'b4-2', partida=s.autopercepcion(lambda d: 4))
        # Ajuste recorte-volcan: las páginas de habilidades e inteligencias se abren con las opcionales b2-1 y b2-2.
        for opcional in ('b2-1', 'b2-2'):
            s.completar('est-panel-8', opcional)
        for instrumento, prefijo, partes in (('TEST-HABILIDADES', 'h-habilidades', 4),
                                             ('TEST-INTELIGENCIAS', 'h-inteligencias', 5)):
            for parte in range(1, partes + 1):
                s.completar('est-panel-8', f'{prefijo}-{parte}', _alterna)
            s.pedir('POST', '/acciones/revelar-resultado', {'cuenta': 'est-panel-8', 'instrumento': instrumento})
        s.senales('est-panel-8', 4, 4, 5)
    _casos_nuevos(s, hecho)
    s.sesion.commit()
    sembrar_entrevistas(s, hecho)
    return nuevos


# --- Entrevistas de muestra (ajuste panel-entrevistas-configuracion §4) -------------------------------------------

def _guion(s: Sembrador, codigo, familia):
    """Una investigación nueva con guía lista sobre `familia` (la anterior ya se publicó)."""
    s.pedir('POST', '/acciones/guardar-lo-que-pienso', {'cuenta': codigo, 'familia': familia, 'dia': TEXTO,
                                                        'necesita': TEXTO, 'duda': TEXTO})
    s.pedir('POST', '/acciones/guardar-guion', {'cuenta': codigo, 'descartadas': [], 'terminar': True, 'preguntas': [
        {'origen': 'PROPIA', 'texto': 'DATO DE PRUEBA: ¿qué fue lo más difícil al empezar?'}]})


def _publicar(s: Sembrador, datos) -> str:
    autor, *coautores = datos['autores']
    activa = s.sesion.scalar(select(m.Investigacion).where(
        m.Investigacion.cuenta_id == s.cuenta(autor).id,
        m.Investigacion.estado.in_((m.EstadoInvestigacion.EN_CURSO, m.EstadoInvestigacion.GUIA_LISTA))))
    familia = None if activa is None else s.sesion.get(m.FamiliaCarrera, activa.familia_id).codigo
    if activa is None or activa.estado != m.EstadoInvestigacion.GUIA_LISTA or familia != datos['familia']:
        _guion(s, autor, datos['familia'])
    ficha = {k: datos[k] for k in ('titulo', 'profesional', 'dedicacion', 'duracion', 'enlace', 'resumen')}
    respuesta = s.pedir('POST', '/acciones/publicar-entrevista', {
        'cuenta': autor, 'coautores': coautores, 'permiso': True, **ficha})
    evento, = respuesta['por_cuenta'][autor]['eventos_registrados']
    return evento['referencia']


def _con_acciones(s: Sembrador, datos):
    codigo = _publicar(s, datos)
    sobre = {'entrevista': codigo}
    for cuenta, tipo, comentario in datos.get('reacciones', ()):
        s.pedir('POST', '/acciones/reaccionar-entrevista', {'cuenta': cuenta, **sobre, 'tipo': tipo,
                                                            'comentario': comentario})
    for cuenta in datos.get('favoritos', ()):
        s.pedir('POST', '/acciones/marcar-favorito', {'cuenta': cuenta, 'tipo': 'ENTREVISTA', 'codigo': codigo})
    if datos.get('comentario'):
        s.pedir('POST', '/acciones/comentar-entrevista', {'cuenta': ORIENTADORA, **sobre, 'texto': datos['comentario']})
    for cuenta, motivo in datos.get('reportes', ()):
        s.pedir('POST', '/acciones/reportar', {'cuenta': cuenta, **sobre, 'motivo': motivo})
    if datos.get('reporte_reaccion'):
        cuenta, motivo = datos['reporte_reaccion']
        reaccion = s.pedir('GET', f'/cuentas/{ORIENTADORA}/publicaciones/{codigo}')['reacciones'][0]['codigo']
        s.pedir('POST', '/acciones/reportar', {'cuenta': cuenta, 'reaccion': reaccion, 'motivo': motivo})
    if datos.get('destacar'):
        s.pedir('POST', '/acciones/destacar-entrevista', {'cuenta': ORIENTADORA, **sobre, 'destacada': True})
    if datos.get('ocultar'):
        s.pedir('POST', '/acciones/ocultar-entrevista', {'cuenta': ORIENTADORA, **sobre})


def _leyenda_directa(s: Sembrador, datos):
    """La de un salón egresado, sin orientadora ni sección abierta: las filas se escriben directo y los eventos
    (PUBLICA_ENTREVISTA, ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA, con su sello y su notificación) se registran con
    las funciones del motor, como si hubiera pasado por las acciones."""
    from uuid import uuid4

    from app.core.contexto import usar_contexto
    from app.models.base import sin_tildes
    from app.services.investigaciones.acciones import evaluar_leyenda, registrar_en_autores
    from app.services.motor.reglas import registrar_eventos
    from soporte_ruta import FECHA

    @usar_contexto
    def escribir(sesion):
        fecha = datetime.fromisoformat(FECHA)
        autor = s.cuenta(datos['autores'][0])
        familia = sesion.scalar(select(m.FamiliaCarrera).where(m.FamiliaCarrera.codigo == datos['familia']))
        ficha = {k: datos[k] for k in ('titulo', 'profesional', 'dedicacion', 'duracion', 'enlace', 'resumen')}
        entrevista = m.Entrevista(codigo=f'ENT-{uuid4().hex}', familia_id=familia.id, estado=m.EstadoEntrevista.PUBLICADA,
                                  fecha_hora=fecha, busqueda=sin_tildes(
                                      f"{ficha['titulo']} {ficha['profesional']} {ficha['dedicacion']} {familia.nombre}"),
                                  **ficha)
        sesion.add(entrevista)
        sesion.flush()
        sesion.add_all([m.EntrevistaAutor(entrevista_id=entrevista.id, cuenta_id=autor.id),
                        m.Investigacion(codigo=f'INV-{uuid4().hex}', cuenta_id=autor.id, familia_id=familia.id,
                                        estado=m.EstadoInvestigacion.PUBLICADA, piensa_dia=TEXTO,
                                        piensa_necesita=TEXTO, piensa_duda=TEXTO, creada_en=fecha,
                                        guia_lista_en=fecha, entrevista_id=entrevista.id)])
        sesion.add_all(m.Favorito(cuenta_id=s.cuenta(fan).id, tipo=m.TipoFavorito.ENTREVISTA,
                                  id_referencia=entrevista.id, fecha_hora=fecha) for fan in datos['favoritos'])
        sesion.flush()
        registrar_eventos(sesion, autor, [(m.TipoEventoUso.PUBLICA_ENTREVISTA, entrevista.id)], fecha)
        entrevista.destacada_en, entrevista.destacada_por = fecha, s.cuenta(ORIENTADORA).id
        sesion.flush()
        registrar_en_autores(sesion, entrevista, m.TipoEventoUso.ENTREVISTA_DESTACADA, fecha)
        evaluar_leyenda(sesion, entrevista, fecha)
    escribir(s.sesion)
    s.sesion.commit()


def sembrar_entrevistas(s: Sembrador, hecho: set[str]) -> None:
    """Las seis de `contenido.ENTREVISTAS_EJEMPLO`, en orden. Las de 5A usan las acciones reales (sus autores tienen la
    sección INVESTIGACIONES abierta tras su siembra); la última, de un salón egresado, se escribe directo. Si un autor
    ya existía antes de esta siembra, sus entrevistas no se siembran."""
    codigo_salon, promocion, seccion, colegio, estudiante, nombre = contenido.SALON_EGRESADO
    if s.cuenta(estudiante) is None:
        salon = s.sesion.scalar(select(m.Salon).where(m.Salon.codigo == codigo_salon))
        if salon is None:
            colegio_id = s.sesion.scalar(select(m.Colegio.id).where(m.Colegio.codigo == colegio))
            salon = m.Salon(codigo=codigo_salon, promocion=promocion, seccion=seccion, colegio_id=colegio_id)
            s.sesion.add(salon)
            s.sesion.flush()
        s.sesion.add(m.Cuenta(codigo=estudiante, nombre=nombre, rol=m.Rol.ESTUDIANTE, salon_id=salon.id))
        s.sesion.commit()
        hecho = {*hecho, estudiante}
        s.cliente.roles[estudiante] = m.Rol.ESTUDIANTE
    for datos in contenido.ENTREVISTAS_EJEMPLO:
        if not set(datos['autores']) <= hecho:
            continue
        if estudiante in datos['autores']:
            _leyenda_directa(s, datos)
        else:
            _con_acciones(s, datos)


def _opcionales_reveladas(s: Sembrador, codigo):
    """Las páginas de habilidades e inteligencias abiertas (b2-1 y b2-2) y sus cuestionarios respondidos y revelados."""
    for opcional in ('b2-1', 'b2-2'):
        s.completar(codigo, opcional)
    for instrumento, prefijo, partes in (('TEST-HABILIDADES', 'h-habilidades', 4),
                                         ('TEST-INTELIGENCIAS', 'h-inteligencias', 5)):
        for parte in range(1, partes + 1):
            s.completar(codigo, f'{prefijo}-{parte}', _alterna)
        s.pedir('POST', '/acciones/revelar-resultado', {'cuenta': codigo, 'instrumento': instrumento})


def _a_medias(s: Sembrador, codigo, actividad):
    """Solo la primera pregunta de un registro respondida: queda en curso."""
    from soporte_ruta import eleccion_minima, item_de, leer_registro, responder_item
    s.sesion.commit()
    registro = leer_registro(s.cliente, actividad, codigo)
    item = item_de(registro, registro['item_actual'])
    responder_item(s.cliente, actividad, item['codigo'], eleccion_minima(item), TEXTO, codigo)


def _casos_nuevos(s: Sembrador, hecho):
    """Ajuste respuestas-orientadora, a pedido del usuario: perfiles que los ocho primeros no muestran."""
    from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
    from soporte_contenido import REQUERIDAS
    if 'est-panel-9' in hecho:  # 9 · Cuestionarios opcionales revelados y misiones de la ciudad (una a medias).
        s.ingreso('est-panel-9', 3)
        s.avanzar('est-panel-9', 'b3-10', partida=s.autopercepcion(lambda d: {'AUTO-A': 1, 'AUTO-C': 4}.get(d, 3)))
        _opcionales_reveladas(s, 'est-panel-9')
        for mision in ('h1', 'h3'):
            s.completar('est-panel-9', mision)
        _a_medias(s, 'est-panel-9', 'h2')
        s.respuestas('est-panel-9', 'h1')[0].tipo_final = 'vacio'
        s.senales('est-panel-9', 3, 2, 3, 4)
        s.diario('est-panel-9', 2)
    if 'est-panel-10' in hecho:  # 10 · Respondió con un orden de planes y después lo cambió; apoderado activo.
        s.ingreso('est-panel-10', 1)
        s.ingreso('apo-panel-10', 2)
        s.avanzar('est-panel-10', 'b4-5', partida=s.autopercepcion(lambda d: 2))
        s.pedir('POST', '/acciones/planes/ordenar', {'cuenta': 'est-panel-10', 'carreras': [PERIODISMO, PSICOLOGIA]})
        # Una misma respuesta sensible y sin contenido (prima «Requiere atención»), en un registro no destacado.
        primera = s.respuestas('est-panel-10', 'b1-1')[0]
        primera.sensible, primera.tipo_final = True, 'fuera_de_tema'
        s.pedir('POST', '/acciones/planes/medidores', {'cuenta': 'est-panel-10', 'carrera': PERIODISMO,
                                                       'entusiasmo': 2, 'capacidad': 3, 'recursos': 1})
        s.senales('est-panel-10', 2, 2, 1)
    if 'est-panel-11' in hecho:  # 11 · Sin apoderado; «Las voces y la mía» a medias.
        s.ingreso('est-panel-11', 6)
        s.avanzar('est-panel-11', REQUERIDAS[REQUERIDAS.index('b1-3') - 1],
                  partida=s.autopercepcion(lambda d: {'AUTO-E': 1, 'AUTO-D': 1}.get(d, 2)), planes=False)
        _a_medias(s, 'est-panel-11', 'b1-3')
        s.senales('est-panel-11', 3)


def _alterna(item):
    """La opción más alta o la más baja de su escala, alternando por número de ítem (resultado con relieve)."""
    ordenes = sorted(o['orden'] for o in item['escala']['opciones'])
    return ordenes[-1] if item['numero'] % 2 else ordenes[0]


def _avanzar_resto(self, codigo, llegada):
    from soporte_contenido import REQUERIDAS
    for actividad in REQUERIDAS[REQUERIDAS.index('b5-1'):]:
        self.completar(codigo, actividad, llegada if actividad == 'b5-2' else None)
        if actividad == 'b5-2':
            self.pedir('POST', '/acciones/revelar-resultado', {'cuenta': codigo, 'instrumento': 'TEST-PARTIDA-LLEGADA',
                                                               'aplicacion': 'APL-LLEGADA'})


Sembrador.avanzar_resto = _avanzar_resto


def _elegir(s: Sembrador, codigo, item, *elegidas):
    """Lo marcado en el intento vigente de un ítem, tal como se mostró (el recorrido marca la primera opción)."""
    respuesta = s.sesion.scalar(select(m.RespuestaRegistro).join(m.ProgresoActividad).join(
        m.ItemRegistro, m.ItemRegistro.id == m.RespuestaRegistro.item_registro_id).where(
        m.ProgresoActividad.cuenta_id == s.cuenta(codigo).id, m.ItemRegistro.codigo == item,
        m.RespuestaRegistro.vigente))
    respuesta.opciones_elegidas = [{'codigo': c, 'texto': t} for c, t in elegidas]


def _complicaciones(s: Sembrador, codigo, *filas):
    """Complicaciones del Plan A, directo en la base (de la lista o escritas a mano), sin pedir sugerencias."""
    tarjeta = s.sesion.scalar(select(m.TarjetaCarrera).where(m.TarjetaCarrera.cuenta_id == s.cuenta(codigo).id,
                                                             m.TarjetaCarrera.prioridad == 1))
    for opcion, otro in filas:
        tarjeta.ultimo_numero_complicacion += 1
        opcion_id = s.sesion.scalar(select(m.OpcionLista.id).join(m.ListaOpciones).where(
            m.ListaOpciones.codigo == 'DIFICULTADES', m.OpcionLista.codigo == opcion)) if opcion else None
        s.sesion.add(m.ComplicacionTarjeta(tarjeta_id=tarjeta.id, numero=tarjeta.ultimo_numero_complicacion,
                                           opcion_id=opcion_id, texto_otro=otro, creada_en=s.ahora))


def _plan_fuera_de_areas(s: Sembrador, codigo, planes):
    """Un tercer plan, fuera de sus áreas sugeridas, pasa a Plan A con la idea de su familia; el orden cambia después
    de «Pongo a prueba mi orden» (b4-5), así que su Plan B también."""
    from app.services.instrumentos.consultas import resultado_intereses
    recomendadas = {f.codigo for f in resultado_intereses(s.sesion, s.cuenta(codigo)).familias or []}
    fuera = s.sesion.scalar(select(m.Carrera.codigo).join(m.FamiliaCarrera).where(
        m.FamiliaCarrera.codigo.not_in(recomendadas)).order_by(m.Carrera.codigo).limit(1))
    s.crear_plan(codigo, fuera)
    s.guardar(codigo, fuera, 'POR_QUE', {'idea_origen': 'FAMILIA', 'motivos': [{'opcion': 'ESTABILIDAD'}],
                                         'relato': 'DATO DE PRUEBA: en mi casa dicen que tiene trabajo seguro.'})
    s.pedir('POST', '/acciones/planes/ordenar', {'cuenta': codigo, 'carreras': [fuera, planes[1], planes[0]]})


def sembrar(aplicacion, ahora: datetime) -> list[str]:
    """Siembra los casos con esa aplicación (base con `contenido` cargado); devuelve los estudiantes creados. Usa el
    cliente de prueba del LLM."""
    from sqlalchemy.orm import Session

    from soporte_llm import ClientePrueba
    aplicacion.state.cliente_llm = ClientePrueba()
    with Session(aplicacion.state.motor_bd) as sesion:
        sembrador = Sembrador(aplicacion, sesion, ahora)
        with sembrador.cliente:
            return sembrar_casos(sembrador)


def sembrar_en(url: str, ahora: datetime | None = None) -> list[str]:
    """Siembra los casos en la base de `url` (con `contenido` cargado) y devuelve los estudiantes creados."""
    from app.main import crear_aplicacion
    aplicacion = crear_aplicacion(url)
    try:
        return sembrar(aplicacion, ahora or datetime.now(timezone(timedelta(hours=-5))).replace(tzinfo=None))
    finally:
        aplicacion.state.motor_bd.dispose()


def main() -> None:
    argumentos = argparse.ArgumentParser(description='Siembra los estudiantes de ejemplo del perfil (solo desarrollo).')
    argumentos.add_argument('--desarrollo', action='store_true',
                            help='Confirma que DATABASE_URL es una base de desarrollo con el conjunto contenido.')
    opciones = argumentos.parse_args()
    if not opciones.desarrollo:
        argumentos.error('Falta --desarrollo: este script solo corre sobre una base de desarrollo.')
    if cargar_configuracion().entorno != 'desarrollo':
        argumentos.exit(1, 'ENTORNO no es desarrollo: no se siembra nada.\n')
    url = os.environ.get('DATABASE_URL', 'sqlite:///ov.db')
    creados = sembrar_en(url)
    print(f'Estudiantes de ejemplo creados: {len(creados)} de {len(ESTUDIANTES)} en {SALON} de {ORIENTADORA}.')


if __name__ == '__main__':
    main()

