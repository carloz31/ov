"""Ajuste registros llm (lote 2), §2 a §5 y §10: la función de contexto de un ítem y la `Entrada` de la capa del LLM.

Cada prueba siembra, sobre una copia del conjunto `contenido`, lo que un estudiante de prueba respondió antes (sus
intentos vigentes, con el estado que calcula la capa del lote 1), sus planes, sus resultados revelados, su opción
inicial y su check-in. DATO DE PRUEBA: todos los textos.
"""

import dataclasses
import importlib.util
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import pytest
from sqlalchemy import select

from app import models as m
from app.services.registro.acciones import guardar_intento
from app.services.registro.contexto import MarcadorSinValor, OpcionSinLLM, entrada_llm, resolver_contexto
from app.services.registro.llm import estado_final
from app.services.registro.llm.evaluacion import Evaluacion
from app.services.registro.llm.mensaje import armar


AHORA = datetime(2026, 11, 10, 10, 0)
RAIZ = Path(__file__).resolve().parents[3]


class Estudiante:
    """Siembra lo que est-ana hizo antes: intentos, planes, resultados, opción inicial y check-in."""

    def __init__(self, sesion):
        self.sesion = sesion
        self.cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        self.progresos = {}
        self.carreras = sesion.scalars(select(m.Carrera).order_by(m.Carrera.id).limit(3)).all()

    def _de(self, modelo, codigo):
        return self.sesion.scalar(select(modelo).where(modelo.codigo == codigo))

    def _progreso(self, item):
        if item.actividad_id not in self.progresos:
            progreso = m.ProgresoActividad(cuenta_id=self.cuenta.id, actividad_id=item.actividad_id,
                                           estado=m.EstadoProgreso.COMPLETADA)
            self.sesion.add(progreso)
            self.sesion.flush()
            self.progresos[item.actividad_id] = progreso.id
        return self.progresos[item.actividad_id]

    def intento(self, codigo_item, elegidas=(), texto='DATO DE PRUEBA', tipo='propio', sensible=False,
                seguimiento=None):
        """Un intento vigente con el estado final que calcula la capa del lote 1. `tipo=None` es un ítem sin LLM;
        `tipo='sin_evaluar'`, la primera llamada falló; `seguimiento`: (tipo o 'sin_evaluar', segunda respuesta)."""
        item = self._de(m.ItemRegistro, codigo_item)
        etiquetas = self._etiquetas(item)
        opciones = [{'codigo': c, 'texto': t if t is not None else etiquetas[c]} for c, t in
                    ((e, None) if isinstance(e, str) else e for e in elegidas)]
        datos = dict(opciones_elegidas=opciones, primera_respuesta=texto, estado=m.EstadoRespuestaRegistro.COMPLETADO)
        if tipo is not None:
            primera = Evaluacion(sin_evaluar=True, causa_fallo='error') if tipo == 'sin_evaluar' else Evaluacion(
                sin_evaluar=False, tipo=tipo, sensible=sensible, repregunta='¿Y qué más?')
            segunda = None
            if seguimiento is not None:
                tipo_seguimiento, respuesta = seguimiento
                segunda = (Evaluacion(sin_evaluar=True, causa_fallo='error') if tipo_seguimiento == 'sin_evaluar'
                           else Evaluacion(sin_evaluar=False, tipo=tipo_seguimiento, linea=respuesta))
                datos.update(segunda_respuesta=respuesta, repregunta='¿Y qué más?')
            final = estado_final(primera, texto, segunda)
            datos.update(primera_tipo=primera.tipo, tipo_final=final.tipo, sensible=final.sensible,
                         texto_citable=list(final.texto_citable), seguimiento_sin_evaluar=final.seguimiento_sin_evaluar,
                         estado=(m.EstadoRespuestaRegistro.SIN_EVALUAR if final.sin_evaluar else
                                 m.EstadoRespuestaRegistro.ABIERTO if final.abierto else m.EstadoRespuestaRegistro.CERRADO))
        guardar_intento(self.sesion, self._progreso(item), item.id, datos, AHORA)
        return self

    def _etiquetas(self, item):
        textos = {o['codigo']: o['texto'] for o in item.opciones_propias or ()}
        if item.lista_id is not None:
            textos.update({o.codigo: o.texto for o in self.sesion.scalars(
                select(m.OpcionLista).where(m.OpcionLista.lista_id == item.lista_id))})
        return textos

    def plan(self, prioridad, motivos=(), relato=None, con_institucion=False, carrera=None):
        carrera = carrera or self.carreras[prioridad - 1]
        institucion = self.sesion.scalar(select(m.Institucion).order_by(m.Institucion.id).limit(1))
        tarjeta = m.TarjetaCarrera(cuenta_id=self.cuenta.id, carrera_id=carrera.id, prioridad=prioridad, activa=True,
                                   creada_en=AHORA, actualizada_en=AHORA, relato=relato,
                                   institucion_id=institucion.id if con_institucion else None)
        self.sesion.add(tarjeta)
        self.sesion.flush()
        lista = self._de(m.ListaOpciones, 'VALORES')
        valores = {o.codigo: o for o in self.sesion.scalars(select(m.OpcionLista).where(
            m.OpcionLista.lista_id == lista.id))}
        self.sesion.add_all(m.MotivoTarjeta(tarjeta_id=tarjeta.id, posicion=n, opcion_id=valores[c].id)
                            for n, c in enumerate(motivos, 1))
        self.sesion.flush()
        return carrera.nombre, (institucion.nombre if con_institucion else None)

    def paso(self, prioridad, texto, hecho=False):
        tarjeta = self.sesion.scalar(select(m.TarjetaCarrera).where(
            m.TarjetaCarrera.cuenta_id == self.cuenta.id, m.TarjetaCarrera.prioridad == prioridad))
        lista = self._de(m.ListaOpciones, 'PASOS')
        tipo = self.sesion.scalar(select(m.OpcionLista).where(m.OpcionLista.lista_id == lista.id).limit(1))
        numero = (tarjeta.ultimo_numero_paso or 0) + 1
        tarjeta.ultimo_numero_paso = numero
        self.sesion.add(m.PasoTarjeta(tarjeta_id=tarjeta.id, numero=numero, posicion=numero, tipo_opcion_id=tipo.id,
                                      texto=texto, estado=m.EstadoPaso.HECHO if hecho else m.EstadoPaso.PENDIENTE,
                                      hecho_en=AHORA if hecho else None))
        self.sesion.flush()

    def resultado(self, aplicacion, puntajes, maximo=10):
        """Un resultado revelado: {código de dimensión: puntaje}; las demás, 0."""
        aplicacion = self._de(m.Aplicacion, aplicacion)
        resultado = m.ResultadoInstrumento(cuenta_id=self.cuenta.id, aplicacion_id=aplicacion.id, calculado_en=AHORA)
        self.sesion.add(resultado)
        self.sesion.flush()
        dimensiones = self.sesion.scalars(select(m.Dimension).where(
            m.Dimension.instrumento_id == aplicacion.instrumento_id)).all()
        self.sesion.add_all(m.ResultadoDimension(resultado_id=resultado.id, dimension_id=d.id,
                                                 puntaje=puntajes.get(d.codigo, 0), puntaje_maximo=maximo)
                            for d in dimensiones)
        self.sesion.flush()
        return {d.codigo: d for d in dimensiones}

    def opcion_inicial(self):
        self.cuenta.opcion_inicial_id = self.carreras[2].id
        self.sesion.flush()
        return self.carreras[2].nombre

    def check_in(self, nivel):
        self.sesion.add(m.CheckIn(cuenta_id=self.cuenta.id, fecha=date(2026, 11, 1), nivel_seguridad=nivel))
        self.sesion.flush()

    def contexto(self, codigo_item):
        return resolver_contexto(self.sesion, self.cuenta, codigo_item)


@pytest.fixture
def ana(sesion_contenido):
    estudiante = Estudiante(sesion_contenido)
    yield estudiante
    sesion_contenido.rollback()


def _codigos(contexto):
    return [o.codigo for o in contexto.opciones]


def _pieza(contexto, codigo):
    return next((o for o in contexto.opciones if o.codigo == codigo), None)


# --- Marcadores -------------------------------------------------------------------------------

def test_marcadores_de_planes_tal_cual(ana):
    plan_a, _ = ana.plan(1)
    plan_b, _ = ana.plan(2)
    moneda = ana.contexto('b4-5-moneda')
    assert moneda.marcadores == {'plan_a': plan_a, 'plan_b': plan_b}
    assert moneda.dialogo.endswith(f'el próximo año estudias {plan_b}.')
    assert moneda.pregunta_texto == f'Piensa en {plan_a}. ¿Hay algo de ella que te haría falta?'
    respalda = ana.contexto('b4-1-respalda')
    assert respalda.marcadores == {'carrera': plan_a}
    assert respalda.arranque == f'Va con {plan_a} porque…'
    # La pregunta y el arranque de una opción propia también llevan el marcador.
    todo = ana.contexto('b4-1-menos').opcion('TODO')
    assert plan_a in todo.pregunta and todo.arranque == 'Lo que más me costaría es…'


def test_sin_plan_b_falta_el_marcador_y_lo_nombra(ana):
    ana.plan(1)
    with pytest.raises(MarcadorSinValor) as error:
        ana.contexto('b4-5-moneda')
    assert error.value.marcador == 'plan_b' and 'plan_b' in str(error.value)


def test_primera_en_minuscula_o_la_otra_tal_cual(ana):
    ana.intento('b2-4-bien', ('COMUNICACION', 'ARTE', 'INGLES'), tipo='propio')
    cruce = ana.contexto('b2-4-cruce')
    assert cruce.marcadores == {'primera': 'comunicación'}
    assert cruce.pregunta_eleccion == 'Lo que mejor te sale es comunicación. ¿Te gusta?'
    assert cruce.opcion('NO_MUCHO').pregunta == '¿Qué es lo que no te gusta de comunicación?'
    # Una «Otra» primera va tal cual, sea cual sea el tipo del ítem (regla 7).
    ana.intento('b2-4-bien', (('OTRA-1', 'Tocar Cajón'), 'ARTE', 'INGLES'), tipo='no_sabe')
    assert ana.contexto('b2-4-cruce').marcadores == {'primera': 'Tocar Cajón'}


def test_valor_1_y_habilidad(ana):
    ana.intento('b2-3-valores', ('ESTABILIDAD', 'INGRESOS', 'APRENDER'))
    necesito = ana.contexto('b3-4-necesito')
    assert necesito.pregunta_texto.startswith('Pusiste Estabilidad primero.')
    ana.intento('h1-reto', ('HS-EMP',), tipo=None)
    assert ana.contexto('ma4-modelo').pregunta_eleccion.startswith('Elegiste practicar Empatía.')


def test_sin_podio_de_b2_4_falta_primera(ana):
    with pytest.raises(MarcadorSinValor) as error:
        ana.contexto('b2-4-cruce')
    assert error.value.marcador == 'primera'


# --- Piezas del perfil ------------------------------------------------------------------------

def _perfil_completo(ana):
    ana.plan(1)
    riasec = ana.resultado('APL-RIASEC', {'S': 9, 'A': 7, 'I': 5})
    inteligencias = ana.resultado('APL-INTELIGENCIAS', {'INT-ESP': 9, 'INT-MUS': 9, 'INT-LIN': 3})
    habilidades = ana.resultado('APL-HABILIDADES', {'HS-EMP': 8})
    return riasec, inteligencias, habilidades


def test_piezas_del_perfil_en_sus_tres_grupos(ana):
    riasec, inteligencias, habilidades = _perfil_completo(ana)
    ana.intento('b2-4-bien', ('MATEMATICA', 'ARTE', 'INGLES'))
    ana.intento('b2-3-valores', ('AYUDAR', 'INGRESOS', 'APRENDER'))
    ana.intento('b1-1-logro', ('ORGANIZAR', 'LIDERAR'))
    ana.intento('b1-1-gustos', (), texto='Armar casitas de cartón con mi primo')
    contexto = ana.contexto('b4-1-respalda')
    # Las tres del código, en su orden; la más alta de inteligencias con empate (las dos); la de habilidades.
    assert _codigos(contexto) == ['INT-S', 'INT-A', 'INT-I', 'INTEL-ESP', 'INTEL-MUS', 'HAB-EMP', 'BIEN-1', 'VAL-1',
                                  'LOGRO-HAB', 'GUSTO']
    assert {o.grupo for o in contexto.opciones} == {'Tu test de intereses', 'Tus otros tests',
                                                    'Lo que escribiste y elegiste antes'}
    # El texto de una pieza de test es su frase corta; solo el origen cambia entre lo que se muestra y el LLM.
    social = _pieza(contexto, 'INT-S')
    assert (social.texto, social.origen) == ('Ayudar, enseñar, cuidar o acompañar a otras personas', riasec['S'].nombre)
    assert social.para_llm == 'Ayudar, enseñar, cuidar o acompañar a otras personas (tu test de intereses)'
    assert _pieza(contexto, 'INTEL-ESP').para_llm == 'Ver formas, planos y estructuras en tu cabeza (tu test de inteligencias)'
    empatia = _pieza(contexto, 'HAB-EMP')
    assert (empatia.texto, empatia.origen) == ('Te pones en el lugar del otro y comprendes lo que siente',
                                               'tu test de habilidades')
    assert empatia.para_llm.endswith('(tu test de habilidades sociales)')
    bien = _pieza(contexto, 'BIEN-1')
    assert (bien.origen, bien.para_llm) == ('¿En qué te va mejor? (1.º)', 'Matemática (¿En qué te va mejor? 1.º)')
    valor = _pieza(contexto, 'VAL-1')
    assert (valor.origen, valor.para_llm) == ('¿Qué valoras en un trabajo? (1.º)', 'Ayudar a otros (lo que más valoras, 1.º)')
    logro = _pieza(contexto, 'LOGRO-HAB')
    assert logro.para_llm == 'Organizar y Liderar (la habilidad que usaste en tu logro)'
    gusto = _pieza(contexto, 'GUSTO')
    assert gusto.texto == '«Armar casitas de cartón con mi primo»'
    assert gusto.para_llm == '«Armar casitas de cartón con mi primo» (lo que te encantaba de niño)'


def test_test_sin_revelar_texto_no_citable_y_logro_sin_ninguno(ana):
    ana.plan(1)
    ana.intento('b1-1-gustos', (), texto='Nada', tipo='no_sabe')
    ana.intento('b1-1-logro', ('NINGUNO',), texto='Le ayudé a mi mamá')
    contexto = ana.contexto('b4-1-respalda')
    assert _codigos(contexto) == []


def test_lo_que_te_cuesta_primero_en_menos_y_su_otra_sin_llm(ana):
    _perfil_completo(ana)
    # b2-4-cuesta va sin LLM: su «Otra» se muestra como pieza siempre; NADA no da pieza.
    ana.intento('b2-4-cuesta', ('EXPONER', ('OTRA-1', 'Hablar con adultos')), tipo=None)
    menos = ana.contexto('b4-1-menos')
    assert _codigos(menos)[:2] == ['CUESTA-EXPONER', 'CUESTA-OTRA-1']
    assert _pieza(menos, 'CUESTA-OTRA-1').texto == '«Hablar con adultos»'
    assert _pieza(menos, 'CUESTA-EXPONER').grupo == 'Lo que te cuesta'
    assert _codigos(menos)[-1] == 'TODO'
    assert not any(c.startswith('CUESTA-') for c in _codigos(ana.contexto('b4-1-respalda')))
    ana.intento('b2-4-cuesta', ('NADA',), texto='', tipo=None)
    assert not any(c.startswith('CUESTA-') for c in _codigos(ana.contexto('b4-1-menos')))


def test_bien_1_como_otra_sigue_la_regla_3(ana):
    ana.plan(1)
    ana.intento('b2-4-bien', (('OTRA-1', 'Tocar cajón'), 'ARTE', 'INGLES'), tipo='no_sabe')
    assert _pieza(ana.contexto('b4-1-respalda'), 'BIEN-1') is None
    ana.intento('b2-4-bien', (('OTRA-1', 'Tocar cajón'), 'ARTE', 'INGLES'), tipo='general')
    assert _pieza(ana.contexto('b4-1-respalda'), 'BIEN-1').texto == '«Tocar cajón»'


# --- Piezas del inicio ------------------------------------------------------------------------

def test_piezas_del_inicio_en_su_orden(ana):
    ana.plan(1)
    inicial = ana.opcion_inicial()
    ana.intento('b1-3-mia', ('AUN_NO',), texto='Me gustan varias cosas')
    ana.intento('b1-7-dia', ('CLARO',), texto='Trabajando en un hospital')
    ana.intento('b1-7-freno', (), texto='El puntaje', tipo='general', seguimiento=('propio', 'No ingresar a la primera'))
    ana.intento('b1-6-mito', ('TEST_DECIDE',), texto='Nada', tipo='no_sabe')
    cambio = ana.contexto('b5-3-cambio')
    assert _codigos(cambio) == ['INI-OPCION', 'INI-RUTA', 'INI-DIA', 'INI-FRENO', 'INI-MITO', 'IGUAL']
    assert _pieza(cambio, 'INI-OPCION').para_llm == f'{inicial} (tu primera opción)'
    assert _pieza(cambio, 'INI-RUTA').texto == 'Aún no lo sé'
    # Se muestra entre «»; al LLM va entre comillas rectas, como en el runner (v7.12).
    dia = _pieza(cambio, 'INI-DIA')
    assert (dia.texto, dia.para_llm) == ('«Trabajando en un hospital»', '"Trabajando en un hospital" (tu día a los 23)')
    # Dos líneas citables van unidas con « / » y, además, por separado (lote 3, decisión del usuario).
    assert _pieza(cambio, 'INI-FRENO').texto == '«El puntaje / No ingresar a la primera»'
    assert _pieza(cambio, 'INI-FRENO').lineas == ('El puntaje', 'No ingresar a la primera')
    # Un mito de la lista va aunque su texto no sea citable.
    assert _pieza(cambio, 'INI-MITO').texto == 'El test me dirá qué estudiar'


def test_mito_otra_y_ninguno(ana):
    ana.plan(1)
    ana.intento('b1-3-mia', ('UNIVERSIDAD',))
    ana.intento('b1-6-mito', (('OTRA', 'Que el arte no da plata'),), tipo='no_sabe')
    assert _codigos(ana.contexto('b5-3-cambio')) == ['INI-RUTA', 'IGUAL']
    ana.intento('b1-6-mito', (('OTRA', 'Que el arte no da plata'),), tipo='propio')
    assert _pieza(ana.contexto('b5-3-cambio'), 'INI-MITO').texto == '«Que el arte no da plata»'
    ana.intento('b1-6-mito', ('NINGUNO',), texto='En mi casa dicen que la ingeniería paga')
    assert _codigos(ana.contexto('b5-3-cambio')) == ['INI-RUTA', 'IGUAL']


def test_sin_opcion_inicial_queda_una_sola_pieza(ana):
    ana.plan(1)
    ana.intento('b1-3-mia', ('INSTITUTO',))
    cambio = ana.contexto('b5-3-cambio')
    assert _codigos(cambio) == ['INI-RUTA', 'IGUAL'] and cambio.permite_otra
    assert cambio.etiqueta_otra == 'Otra cosa que cambió'


# --- Sensible, emocional y sin evaluar --------------------------------------------------------

def test_sensible_y_emocional_no_se_referencian_pero_el_marcador_si(ana):
    ana.plan(1)
    ana.intento('b2-4-bien', ('MATEMATICA', 'ARTE', 'INGLES'), sensible=True)
    ana.intento('b2-3-valores', ('AYUDAR', 'INGRESOS', 'APRENDER'), tipo='emocional')
    respalda = ana.contexto('b4-1-respalda')
    assert _pieza(respalda, 'BIEN-1') is None and _pieza(respalda, 'VAL-1') is None
    # La elección tampoco va como eco, pero los marcadores se resuelven (regla 7).
    cruce = ana.contexto('b2-4-cruce')
    assert cruce.marcadores == {'primera': 'matemática'} and cruce.ecos_llm == ()
    necesito = ana.contexto('b3-4-necesito')
    assert necesito.pregunta_texto.startswith('Pusiste Ayudar a otros primero.') and necesito.ecos_llm == ()


def test_sensible_que_vuelve_con_un_intento_nuevo(ana):
    ana.intento('b2-4-bien', ('MATEMATICA', 'ARTE', 'INGLES'), sensible=True)
    assert ana.contexto('b2-4-cruce').ecos_llm == ()
    ana.intento('b2-4-bien', ('MATEMATICA', 'ARTE', 'INGLES'), tipo='propio')
    assert ana.contexto('b2-4-cruce').ecos_llm == ('Lo que mejor te sale: Matemática',)
    ana.plan(1)
    assert _pieza(ana.contexto('b4-1-respalda'), 'BIEN-1') is not None


def test_sin_evaluar_no_cita_su_texto_pero_si_su_eleccion_y_su_marcador(ana):
    ana.plan(1)
    # b1-7-dia sin evaluar: ni pieza de texto ni eco; b1-3-mia sin evaluar: su elección sí es pieza.
    ana.intento('b1-7-dia', ('CLARO',), texto='Trabajando en un hospital', tipo='sin_evaluar')
    ana.intento('b1-3-mia', (('OTRA', 'Viajar'),), tipo='sin_evaluar')
    ana.intento('b1-6-mito', ('TEST_DECIDE',), tipo='sin_evaluar')
    cambio = ana.contexto('b5-3-cambio')
    assert _codigos(cambio) == ['INI-MITO', 'IGUAL']  # la «Otra» de mia no va (sin LLM no es)
    ana.intento('b1-7-hito', (), texto='Estudiando en una academia', tipo='sin_evaluar')
    assert ana.contexto('ma3-hoy').ecos_mostrar == ()
    ana.intento('b2-4-bien', ('COMUNICACION', 'ARTE', 'INGLES'), tipo='sin_evaluar')
    cruce = ana.contexto('b2-4-cruce')
    assert cruce.marcadores == {'primera': 'comunicación'} and cruce.ecos_llm == ('Lo que mejor te sale: Comunicación',)


def test_seguimiento_sin_evaluar_cita_solo_la_primera(ana):
    ana.plan(1)
    ana.intento('b1-7-dia', ('CLARO',), texto='En un hospital', tipo='general',
                seguimiento=('sin_evaluar', 'Atendiendo pacientes de noche'))
    assert _pieza(ana.contexto('b5-3-cambio'), 'INI-DIA').texto == '«En un hospital»'
    # Un intento nuevo ya evaluado se cita según su tipo.
    ana.intento('b1-7-dia', ('CLARO',), texto='En un hospital', tipo='general',
                seguimiento=('propio', 'Atendiendo pacientes de noche'))
    assert _pieza(ana.contexto('b5-3-cambio'), 'INI-DIA').texto == '«En un hospital / Atendiendo pacientes de noche»'


# --- Ecos -------------------------------------------------------------------------------------

def test_ecos_de_b1_3_contraste_en_las_dos_listas(ana):
    ana.intento('b1-3-voz', ('PAPA',), texto='Que entre a la UNSA')
    ana.intento('b1-3-mia', ('UNIVERSIDAD',), texto='Quiero irme a Lima')
    contraste = ana.contexto('b1-3-contraste')
    assert contraste.ecos_llm == ('Quién espera qué: Papá. «Que entre a la UNSA»',
                                  'Lo que tú quieres: Universidad. «Quiero irme a Lima»')
    assert [e['eleccion'] for e in contraste.ecos_mostrar] == [['Papá'], ['Universidad']]
    # NADIE va sin LLM: su elección se muestra, su texto no se cita.
    ana.intento('b1-3-voz', ('NADIE',), texto='', tipo=None)
    assert ana.contexto('b1-3-contraste').ecos_llm[0] == 'Quién espera qué: Nadie me lo ha dicho claramente'


def test_ecos_de_b3_4(ana):
    ana.intento('b2-3-valores', ('ESTABILIDAD', 'INGRESOS', 'APRENDER'))
    necesito = ana.contexto('b3-4-necesito')
    assert necesito.ecos_llm == ('Lo que pusiste primero: Estabilidad',) and necesito.ecos_mostrar == ()
    ana.intento('b3-4-necesito', (), texto='Si hay trabajo estable')
    quien = ana.contexto('b3-4-quien')
    assert quien.ecos_llm == ('Lo que necesitarías saber: Si hay trabajo estable',)
    assert quien.ecos_mostrar[0]['texto'] == ['Si hay trabajo estable']


def test_ecos_de_b4_1_y_b4_5(ana):
    plan_a, _ = ana.plan(1, motivos=('AYUDAR', 'ESTABILIDAD'), relato='Me gusta ayudar')
    plan_b, _ = ana.plan(2, motivos=('CREAR',))
    ana.plan(3, motivos=('INGRESOS',))
    respalda = ana.contexto('b4-1-respalda')
    assert respalda.ecos_llm == (f'Tu Plan A: {plan_a}',)
    cabecera, = respalda.ecos_mostrar
    assert (cabecera['carrera'], cabecera['motivos']) == (plan_a, ['Ayudar a otros', 'Estabilidad'])
    moneda = ana.contexto('b4-5-moneda')
    assert moneda.ecos_llm == (f'Plan A: {plan_a} · lo que te mueve: Ayudar a otros, Estabilidad · «Me gusta ayudar»',
                               f'Plan B: {plan_b} · lo que te mueve: Crear')
    # El Plan C no se muestra.
    assert [p['carrera'] for p in moneda.ecos_mostrar[0]['planes']] == [plan_a, plan_b]


def test_ecos_de_b5_1_y_b5_3(ana):
    plan_a, institucion = ana.plan(1, con_institucion=True)
    plan_b, _ = ana.plan(2)
    ana.paso(1, 'Hablar con una enfermera')
    ana.paso(1, 'Visitar la universidad', hecho=True)
    seguridad = ana.contexto('b5-1-seguridad')
    assert seguridad.ecos_llm == (f'Tu proyecto: {plan_a} · {institucion}',)
    proyecto, pasos = seguridad.ecos_mostrar
    assert (proyecto['carrera'], proyecto['institucion']) == (plan_a, institucion)
    assert (pasos['pendientes'], pasos['hechos']) == (['Hablar con una enfermera'], ['Visitar la universidad'])
    ana.check_in(2)
    assert ana.contexto('b5-1-seguridad').ecos_mostrar[2]['texto'] == '2 de 5'
    ana.intento('b5-1-seguridad', ('MAS_O_MENOS',), texto='Me falta saber el costo')
    cambio = ana.contexto('b5-3-cambio')
    assert cambio.ecos_llm == ()
    hoy, nivel = cambio.ecos_mostrar
    assert hoy['planes'] == [{'carrera': plan_a, 'institucion': institucion}, {'carrera': plan_b, 'institucion': None}]
    assert nivel['opciones'] == ['Más o menos']


def test_ecos_de_las_opcionales(ana):
    ana.resultado('APL-HABILIDADES', {'HS-ASE': 9})
    assert ana.contexto('h1-reto').ecos_mostrar[0]['tipo'] == 'RESULTADO'
    assert ana.contexto('h1-reto').ecos_llm == ()
    plan_a, _ = ana.plan(1)
    assert ana.contexto('ma8-respuesta').ecos_mostrar[0]['texto'] == plan_a
    # ma3: uno, dos o ningún eco citable.
    assert ana.contexto('ma3-hoy').ecos_mostrar == ()
    ana.intento('b1-7-dia', ('CLARO',), texto='En un taller propio')
    assert [e['texto'] for e in ana.contexto('ma3-hoy').ecos_mostrar] == ['En un taller propio']
    ana.intento('b1-7-hito', (), texto='Estudiando mecánica')
    assert len(ana.contexto('ma3-hoy').ecos_mostrar) == 2


# --- Formato de la opción marcada y la Entrada -------------------------------------------------

def test_formatos_de_la_opcion_marcada(ana):
    ana.plan(1)
    mito = ana.contexto('b1-6-mito')
    assert entrada_llm(mito, [{'codigo': 'TEST_DECIDE'}], 'Mi profe').etiquetas == ('El test me dirá qué estudiar',)
    # «¿Cuál?» va en lugar de la etiqueta, sin comillas.
    assert entrada_llm(mito, [{'codigo': 'OTRA', 'texto': 'Que el arte no da plata'}], 'x').etiquetas == (
        'Que el arte no da plata',)
    bien = ana.contexto('b2-4-bien')
    entrada = entrada_llm(bien, [{'codigo': 'ARTE'}, {'codigo': 'OTRA-1', 'texto': 'Cocinar'}, {'codigo': 'INGLES'}],
                          'Me sale')
    assert '<opcion_marcada>1.º Arte, 2.º Cocinar, 3.º Inglés</opcion_marcada>' in armar(entrada)
    valores = ana.contexto('b2-3-valores')
    assert '1.º Ingresos, 2.º Estabilidad, 3.º Aprender' in armar(entrada_llm(
        valores, [{'codigo': 'INGRESOS'}, {'codigo': 'ESTABILIDAD'}, {'codigo': 'APRENDER'}], 'x'))
    ana.resultado('APL-INTELIGENCIAS', {'INT-ESP': 9})
    respalda = ana.contexto('b4-1-respalda')
    pieza = _pieza(respalda, 'INTEL-ESP')
    assert entrada_llm(respalda, [{'codigo': 'INTEL-ESP'}], 'x').etiquetas == (f'{pieza.texto} (tu test de inteligencias)',)
    # La «Otra» de un ítem de piezas va con su origen al LLM y sin comillas (runner v7.8 y v7.12).
    assert entrada_llm(respalda, [{'codigo': 'OTRA', 'texto': 'Soy paciente con los niños'}], 'x').etiquetas == (
        'Soy paciente con los niños (otra cosa tuya)',)
    # Ajuste front de registros (lote 2): b4-1-menos muestra «Otra cosa mía»; al LLM va igual, con su origen.
    menos = ana.contexto('b4-1-menos')
    assert menos.etiqueta_otra == 'Otra cosa mía'
    assert entrada_llm(menos, [{'codigo': 'OTRA', 'texto': 'Soy paciente con los niños'}], 'x').etiquetas == (
        'Soy paciente con los niños (otra cosa tuya)',)
    ana.intento('b1-3-mia', ('UNIVERSIDAD',))
    cambio = ana.contexto('b5-3-cambio')
    assert entrada_llm(cambio, [{'codigo': 'OTRA', 'texto': 'Las ganas'}], 'x').etiquetas == (
        'Las ganas (otra cosa que cambió)',)


def test_entrada_usa_la_tarjeta_de_la_opcion_y_rechaza_lo_que_va_sin_llm(ana):
    logro = ana.contexto('b1-1-logro')
    ninguno = entrada_llm(logro, [{'codigo': 'NINGUNO'}], 'Nada')
    assert ninguno.pregunta.startswith('Está bien, a veces cuesta llamarlo así.')
    assert ninguno.tarjeta.texto.startswith('NÚCLEO: algo que hizo (un hecho)')
    habilidad = entrada_llm(logro, [{'codigo': 'ORGANIZAR'}], 'Gané un campeonato')
    assert habilidad.pregunta == 'Ahora cuéntame cuál fue ese logro: algo que pasó, no algo que eres.'
    assert 'Volvamos a lo que marcaste, Organizar:' in habilidad.tarjeta.bases['fuera_de_tema']
    with pytest.raises(OpcionSinLLM):
        entrada_llm(ana.contexto('b1-3-voz'), [{'codigo': 'NADIE'}], '')
    with pytest.raises(OpcionSinLLM):
        entrada_llm(ana.contexto('b2-4-cuesta'), [{'codigo': 'EXPONER'}], 'x')


# --- La Entrada coincide con la del runner, sin tocar sus casos ---------------------------------
#
# Cada caso se usa tal como está en `tests/llm/casos`. Lo que trae (las piezas con su origen, los planes, los ecos y
# los marcadores) se reproduce en la base: se siembran los intentos, los resultados y los planes, y se renombran una
# carrera y una institución de la copia de prueba con los nombres del caso. Luego se compara el mensaje armado.

def _runner():
    ruta = RAIZ / 'tests' / 'llm' / 'evaluar_tarjetas.py'
    if 'evaluar_tarjetas_contexto' not in sys.modules:
        especificacion = importlib.util.spec_from_file_location('evaluar_tarjetas_contexto', ruta)
        modulo = importlib.util.module_from_spec(especificacion)
        especificacion.loader.exec_module(modulo)
        sys.modules['evaluar_tarjetas_contexto'] = modulo
    return sys.modules['evaluar_tarjetas_contexto']


ORIGEN_DE = re.compile(r'^(.*) \(([^()]*)\)$')


def _casos(archivo, item=None):
    return [c for c in _runner().casos_del_archivo(archivo) if item is None or c['item'] == item]


def _unicos(casos):
    vistos, salida = set(), []
    for caso in casos:
        clave = json.dumps([caso['item'], caso['opciones'], caso.get('marcadores'), caso.get('ecos_cruce'),
                            caso.get('ecos')], ensure_ascii=False, sort_keys=True)
        if clave not in vistos:
            vistos.add(clave)
            salida.append(caso)
    return salida


def _casos_runner():
    uno = {'b1-1-tarjetas-v7.1.json': 'b1-1-gustos', 'b1-3-tarjetas-v7.2c.json': 'b1-3-contraste',
           'b1-6-tarjetas-v7.3c.json': 'b1-6-mito', 'b1-7-tarjetas-v7.4b.json': 'b1-7-hito',
           'b2-3-tarjetas-v7.5c.json': 'b2-3-valores', 'b2-4-tarjetas-v7.6c.json': 'b2-4-cruce',
           'b3-4-tarjetas-v7.7c.json': 'b3-4-necesito', 'b4-2-tarjetas-v7.9b.json': 'b4-2-estilo',
           'b4-5-tarjetas-v7.10b.json': 'b4-5-moneda', 'b5-1-tarjetas-v7.11b.json': 'b5-1-seguridad'}
    casos = [_casos(archivo, item)[0] for archivo, item in uno.items()]
    # Todas las piezas, la «Otra» y las exclusivas de b4-1 y b5-3, cada combinación una vez.
    casos += _unicos(_casos('b4-1-tarjetas-v7.8e.json'))
    casos += _unicos([c for a in ('b5-3-tarjetas-v7.12.json', 'b5-3-tarjetas-v7.12b.json', 'b5-3-tarjetas-v7.12c.json')
                      for c in _casos(a) if 'ecos_cruce' not in c])
    return casos


CASOS_RUNNER = _casos_runner()


def _renombrar_carrera(ana, indice, nombre):
    ana.carreras[indice].nombre = nombre
    ana.sesion.flush()


def _codigo_por_texto(ana, codigo_item, texto):
    return next(c for c, t in ana._etiquetas(ana._de(m.ItemRegistro, codigo_item)).items() if t == texto)


def _sembrar_pieza(ana, texto, origen):
    """Lo que hace aparecer la pieza «texto (origen)» de un caso: el intento, el resultado o la opción inicial."""
    frases = {t.texto: t.codigo.removeprefix('PIEZA_FRASE_') for t in ana.sesion.scalars(
        select(m.TextoFijo).where(m.TextoFijo.codigo.like('PIEZA_FRASE_%')))}
    if origen == 'tu test de intereses':
        ana.resultado('APL-RIASEC', {frases[texto]: 9})
    elif origen == 'tu test de inteligencias':
        ana.resultado('APL-INTELIGENCIAS', {frases[texto]: 9})
    elif origen == 'tu test de habilidades sociales':
        ana.resultado('APL-HABILIDADES', {frases[texto]: 9})
    elif origen == '¿En qué te va mejor? 1.º':
        ana.intento('b2-4-bien', (_codigo_por_texto(ana, 'b2-4-bien', texto), 'HISTORIA', 'DEPORTE'))
    elif origen == 'lo que más valoras, 1.º':
        valor = _codigo_por_texto(ana, 'b2-3-valores', texto)
        ana.intento('b2-3-valores', (valor, *[v for v in ('RECONOCIMIENTO', 'COMUNIDAD', 'CREAR') if v != valor][:2]))
    elif origen == 'la habilidad que usaste en tu logro':
        ana.intento('b1-1-logro', (_codigo_por_texto(ana, 'b1-1-logro', texto),))
    elif origen == 'lo que te encantaba de niño':
        ana.intento('b1-1-gustos', (), texto=texto.strip('«»'))
    elif origen == 'lo que te cuesta':
        ana.intento('b2-4-cuesta', (_codigo_por_texto(ana, 'b2-4-cuesta', texto),), tipo=None)
    elif origen == 'tu primera opción':
        _renombrar_carrera(ana, 2, texto)
        ana.opcion_inicial()
    elif origen == 'la ruta que querías al terminar el colegio':
        ana.intento('b1-3-mia', (_codigo_por_texto(ana, 'b1-3-mia', texto),))
    elif origen == 'tu día a los 23':
        ana.intento('b1-7-dia', ('CLARO',), texto=texto.strip('"'))
    elif origen == 'lo que dijiste que podía frenarte':
        ana.intento('b1-7-freno', (), texto=texto.strip('"'))
    elif origen == 'una idea que habías escuchado o creído':
        ana.intento('b1-6-mito', (_codigo_por_texto(ana, 'b1-6-mito', texto),))
    elif origen not in ('otra cosa tuya', 'otra cosa que cambió'):
        raise AssertionError(f'Pieza sin siembra: {texto} ({origen})')


def _plan_del_eco(texto):
    """«Carrera · lo que te mueve: M1, M2» → (carrera, [motivos])."""
    carrera, _, resto = texto.partition(' · lo que te mueve: ')
    return carrera, [motivo.strip() for motivo in resto.split(',')] if resto else []


def _sembrar_para(ana, caso):
    item = caso['item']
    if item == 'b1-3-contraste':
        for clave, eco in caso['ecos'].items():
            ana.intento(f'b1-3-{clave}', (eco['opcion'],), texto=eco['texto'])
    elif item == 'b2-4-cruce':
        ana.intento('b2-4-bien', (*caso['ecos_cruce']['bien'], 'ARTE', 'INGLES')[:3])
    elif item == 'b3-4-necesito':
        ana.intento('b2-3-valores', (*caso['ecos_cruce']['valores'], 'INGRESOS', 'APRENDER')[:3])
    elif item in ('b4-1-respalda', 'b4-1-menos'):
        _renombrar_carrera(ana, 0, caso['marcadores']['carrera'])
        ana.plan(1)
    elif item == 'b4-5-moneda':
        for prioridad, clave in ((1, 'plan_a'), (2, 'plan_b')):
            carrera, motivos = _plan_del_eco(caso['ecos_cruce'][clave][0]['texto'])
            assert carrera == caso['marcadores'][clave]
            _renombrar_carrera(ana, prioridad - 1, carrera)
            ana.plan(prioridad, motivos=[_codigo_por_texto(ana, 'b2-3-valores', t) for t in motivos])
    elif item == 'b5-1-seguridad':
        carrera, _, institucion = caso['ecos_cruce']['proyecto'][0]['texto'].partition(' · ')
        _renombrar_carrera(ana, 0, carrera)
        ana.sesion.scalar(select(m.Institucion).order_by(m.Institucion.id).limit(1)).nombre = institucion
        ana.plan(1, con_institucion=True)
    elif item == 'b5-3-cambio':
        ana.plan(1)
    for opcion in caso['opciones']:
        if isinstance(opcion, dict) and ORIGEN_DE.match(opcion['texto']):
            _sembrar_pieza(ana, *ORIGEN_DE.match(opcion['texto']).groups())


def _elegidas(contexto, caso):
    """Lo marcado en el caso, como lo marcaría el estudiante: una pieza por el texto que llega al LLM; la «Otra»
    con lo escrito (sin el origen que el runner le agrega); el estilo de b4-2 por su etiqueta."""
    por_texto = {t: o.codigo for o in contexto.opciones for t in (o.texto, o.para_llm)}
    elegidas = []
    for opcion in caso['opciones']:
        if not isinstance(opcion, dict):
            elegidas.append({'codigo': opcion})
        elif opcion['codigo'] == 'OTRA':
            texto = ORIGEN_DE.match(opcion['texto']).group(1) if contexto.origen_otra_llm else opcion['texto']
            elegidas.append({'codigo': 'OTRA', 'texto': texto})
        elif contexto.opcion(opcion['codigo']) is not None:
            elegidas.append({'codigo': opcion['codigo']})
        else:
            elegidas.append({'codigo': por_texto[opcion['texto']]})
    return elegidas


@pytest.mark.parametrize('caso', CASOS_RUNNER, ids=[c['id'] for c in CASOS_RUNNER])
def test_la_entrada_coincide_con_la_del_runner(ana, caso):
    _sembrar_para(ana, caso)
    esperado = armar(_runner().entrada_de(caso, caso['texto']))
    contexto = ana.contexto(caso['item'])
    assert armar(entrada_llm(contexto, _elegidas(contexto, caso), caso['texto'])) == esperado


# Ajuste front de registros (lote 1, §1.3): el diálogo y la pregunta de elección que pasaron del front al backend no
# entran en la `Entrada`; el mensaje al LLM de esos ítems queda idéntico.
ITEMS_CON_DIALOGO_NUEVO = {'b1-1-gustos', 'b1-1-logro', 'b1-1-dificultad', 'b1-3-voz', 'b1-3-mia', 'b1-3-contraste',
                           'b1-6-mito', 'b2-3-valores', 'b2-4-bien', 'b4-1-respalda'}
CASOS_DIALOGO_NUEVO = list({c['item']: c for c in reversed(CASOS_RUNNER) if c['item'] in ITEMS_CON_DIALOGO_NUEVO}
                           .values())


# Los que el runner no tiene: se arma la `Entrada` con la primera opción que va al LLM y se compara igual.
SIN_CASO_RUNNER = sorted(ITEMS_CON_DIALOGO_NUEVO - {c['item'] for c in CASOS_DIALOGO_NUEVO})


def test_los_items_sin_caso_del_runner_son_los_esperados():
    # b2-4-cuesta y ma8-respuesta no pasan por el LLM (sin tarjeta).
    assert SIN_CASO_RUNNER == ['b1-1-dificultad', 'b1-1-logro', 'b1-3-mia', 'b1-3-voz', 'b2-4-bien']


@pytest.mark.parametrize('item', SIN_CASO_RUNNER)
def test_el_dialogo_no_cambia_el_mensaje_sin_caso_del_runner(ana, item):
    contexto = ana.contexto(item)
    assert contexto.dialogo
    elegibles = [o for o in contexto.opciones if not o.sin_llm and not o.exclusiva]
    elegidas = [{'codigo': o.codigo, 'texto': o.texto} for o in elegibles[:max(1, 3 if contexto.ordenada else 1)]]
    sin_consigna = dataclasses.replace(contexto, dialogo=None, pregunta_eleccion=None)
    texto = 'DATO DE PRUEBA: lo cuento con un ejemplo.'
    mensaje = armar(entrada_llm(contexto, elegidas, texto))
    assert mensaje == armar(entrada_llm(sin_consigna, elegidas, texto))
    assert contexto.dialogo not in mensaje
    if contexto.pregunta_eleccion:
        assert contexto.pregunta_eleccion not in mensaje


@pytest.mark.parametrize('caso', CASOS_DIALOGO_NUEVO, ids=[c['item'] for c in CASOS_DIALOGO_NUEVO])
def test_el_dialogo_y_la_pregunta_de_eleccion_no_cambian_el_mensaje(ana, caso):
    _sembrar_para(ana, caso)
    contexto = ana.contexto(caso['item'])
    assert contexto.dialogo
    sin_consigna = dataclasses.replace(contexto, dialogo=None, pregunta_eleccion=None)
    elegidas = _elegidas(contexto, caso)
    mensaje = armar(entrada_llm(contexto, elegidas, caso['texto']))
    assert mensaje == armar(entrada_llm(sin_consigna, elegidas, caso['texto']))
    assert mensaje == armar(_runner().entrada_de(caso, caso['texto']))
    assert contexto.dialogo not in mensaje
