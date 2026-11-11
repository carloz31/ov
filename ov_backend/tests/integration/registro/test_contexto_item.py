"""Ajuste registros llm (lote 2), §2 a §5 y §10: la función de contexto de un ítem y la `Entrada` de la capa del LLM.

Cada prueba siembra, sobre una copia del conjunto `contenido`, lo que un estudiante de prueba respondió antes (sus
intentos vigentes, con el estado que calcula la capa del lote 1), sus planes, sus resultados revelados, su opción
inicial y su check-in. DATO DE PRUEBA: todos los textos.
"""

import importlib.util
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
    social = _pieza(contexto, 'INT-S')
    assert social.origen == riasec['S'].nombre and social.texto == riasec['S'].descripcion.rstrip('.')
    espacial = _pieza(contexto, 'INTEL-ESP')
    assert espacial.para_llm == f"{inteligencias['INT-ESP'].descripcion.rstrip('.')} (tu test de inteligencias)"
    assert _pieza(contexto, 'HAB-EMP').texto == habilidades['HS-EMP'].nombre
    assert _pieza(contexto, 'BIEN-1').para_llm == 'Matemática (¿En qué te va mejor? 1.º)'
    assert _pieza(contexto, 'VAL-1').texto == 'Ayudar a otros'
    assert _pieza(contexto, 'LOGRO-HAB').texto == 'Organizar y Liderar'
    assert _pieza(contexto, 'GUSTO').texto == '«Armar casitas de cartón con mi primo»'


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
    assert _pieza(cambio, 'INI-DIA').para_llm == '«Trabajando en un hospital» (tu día a los 23)'
    # Dos líneas citables van unidas con un espacio.
    assert _pieza(cambio, 'INI-FRENO').texto == '«El puntaje No ingresar a la primera»'
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
    assert _pieza(ana.contexto('b5-3-cambio'), 'INI-DIA').texto == '«En un hospital Atendiendo pacientes de noche»'


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


# --- La Entrada coincide con la del runner, un caso por registro requerido ------------------------

def _runner():
    ruta = RAIZ / 'tests' / 'llm' / 'evaluar_tarjetas.py'
    if 'evaluar_tarjetas_contexto' not in sys.modules:
        especificacion = importlib.util.spec_from_file_location('evaluar_tarjetas_contexto', ruta)
        modulo = importlib.util.module_from_spec(especificacion)
        especificacion.loader.exec_module(modulo)
        sys.modules['evaluar_tarjetas_contexto'] = modulo
    return sys.modules['evaluar_tarjetas_contexto']


def _caso(archivo, item, condicion=lambda caso: True):
    runner = _runner()
    return next(c for c in runner.casos_del_archivo(archivo) if c['item'] == item and condicion(c))


def _codigos_caso(caso):
    return [o['codigo'] if isinstance(o, dict) else o for o in caso['opciones']]


CASOS_RUNNER = (
    ('b1-1', 'b1-1-tarjetas-v7.1.json', 'b1-1-gustos'),
    ('b1-3', 'b1-3-tarjetas-v7.2c.json', 'b1-3-contraste'),
    ('b1-6', 'b1-6-tarjetas-v7.3c.json', 'b1-6-mito'),
    ('b1-7', 'b1-7-tarjetas-v7.4b.json', 'b1-7-hito'),
    ('b2-3', 'b2-3-tarjetas-v7.5c.json', 'b2-3-valores'),
    ('b2-4', 'b2-4-tarjetas-v7.6c.json', 'b2-4-cruce'),
    ('b3-4', 'b3-4-tarjetas-v7.7c.json', 'b3-4-necesito'),
    ('b4-1', 'b4-1-tarjetas-v7.8e.json', 'b4-1-menos'),
    ('b4-2', 'b4-2-tarjetas-v7.9b.json', 'b4-2-estilo'),
    ('b4-5', 'b4-5-tarjetas-v7.10b.json', 'b4-5-moneda'),
    ('b5-1', 'b5-1-tarjetas-v7.11b.json', 'b5-1-seguridad'),
    ('b5-3', 'b5-3-tarjetas-v7.12c.json', 'b5-3-cambio'),
    ('b5-3-igual', 'b5-3-tarjetas-v7.12b.json', 'b5-3-cambio'),
)


def _sembrar_para(ana, caso):
    """Siembra lo que el caso trae como ecos y marcadores, y ajusta el caso a los nombres sembrados (el catálogo de
    prueba tiene otras carreras): así el runner y la función de contexto reciben lo mismo."""
    item = caso['item']
    if item == 'b1-3-contraste':
        for clave, eco in caso['ecos'].items():
            ana.intento(f'b1-3-{clave}', (eco['opcion'],), texto=eco['texto'])
    elif item == 'b2-4-cruce':
        ana.intento('b2-4-bien', (*caso['ecos_cruce']['bien'], 'ARTE', 'INGLES')[:3])
    elif item == 'b3-4-necesito':
        ana.intento('b2-3-valores', (*caso['ecos_cruce']['valores'], 'INGRESOS', 'APRENDER')[:3])
    elif item in ('b4-1-menos', 'b4-1-respalda'):
        plan_a, _ = ana.plan(1)
        caso['marcadores'] = {'carrera': plan_a}
        caso['ecos_lineas'] = [f'Tu Plan A: {plan_a}']
    elif item == 'b4-5-moneda':
        plan_a, _ = ana.plan(1, motivos=('APRENDER',))
        plan_b, _ = ana.plan(2, motivos=('CREAR',))
        caso['marcadores'] = {'plan_a': plan_a, 'plan_b': plan_b}
        caso['ecos_lineas'] = [f'Plan A: {plan_a} · lo que te mueve: Aprender', f'Plan B: {plan_b} · lo que te mueve: Crear']
    elif item == 'b5-1-seguridad':
        plan_a, institucion = ana.plan(1, con_institucion=True)
        caso['ecos_lineas'] = [f'Tu proyecto: {plan_a} · {institucion}']
    elif item == 'b5-3-cambio':
        ana.plan(1)
        ana.intento('b1-3-mia', ('UNIVERSIDAD',))
        idea = next((o['texto'] for o in caso['opciones'] if isinstance(o, dict) and o.get('codigo') == 'IDEA'), None)
        if idea is not None:
            etiqueta = idea.removesuffix(' (una idea que habías escuchado o creído)')
            mito = next(c for c, t in ana._etiquetas(ana._de(m.ItemRegistro, 'b1-6-mito')).items() if t == etiqueta)
            ana.intento('b1-6-mito', (mito,))


@pytest.mark.parametrize(('registro', 'archivo', 'item'), CASOS_RUNNER, ids=[c[0] for c in CASOS_RUNNER])
def test_la_entrada_coincide_con_la_del_runner(ana, registro, archivo, item):
    condiciones = {'b4-1': lambda c: _codigos_caso(c) == ['TODO'], 'b5-3': lambda c: _codigos_caso(c) == ['IDEA'],
                   'b5-3-igual': lambda c: _codigos_caso(c) == ['IGUAL'] and 'ecos_cruce' not in c}
    caso = dict(_caso(archivo, item, condiciones.get(registro, lambda c: True)))
    _sembrar_para(ana, caso)
    runner = _runner()
    esperado = armar(runner.entrada_de(caso, caso['texto']))
    contexto = ana.contexto(item)
    elegidas = [o if isinstance(o, dict) else {'codigo': o} for o in caso['opciones']]
    # Los casos nombran el estilo de b4-2 (`ESTILO`) y la pieza de b5-3 (`IDEA`) por su texto: es el de la opción
    # que se ofrece (la etiqueta, o la pieza con su origen).
    por_texto = {t: o.codigo for o in contexto.opciones for t in (o.texto, o.para_llm)}
    elegidas = [{'codigo': por_texto[e['texto']]} if e['codigo'] in ('ESTILO', 'IDEA') else e for e in elegidas]
    obtenido = armar(entrada_llm(contexto, elegidas, caso['texto']))
    assert obtenido == esperado
