"""Ajuste vista del ítem de registro: la regla de carga de los campos de presentación de un nodo de ítem."""

from types import SimpleNamespace

from app.models import FuenteOpciones
from scripts.verificar_contenido_front import errores_presentacion


def _item(**cambios):
    # DATO DE PRUEBA: un ítem que elige de una lista común, sin opciones propias ni premarcado.
    base = dict(fuente_opciones=FuenteOpciones.LISTA, eleccion_ordenada=False, premarcar_si=None, referencia_id=None,
                opciones_propias=None)
    return SimpleNamespace(**{**base, **cambios})


def _nodo(**cambios):
    return {'preguntaEleccion': '¿Qué áreas?', 'preguntaTexto': 'Cuéntalo', 'entrada': 'Me despierto en…', **cambios}


def test_un_nodo_completo_no_tiene_errores():
    assert errores_presentacion(_nodo(), _item()) == []
    assert errores_presentacion(_nodo(orden='texto-primero'), _item()) == []
    solo_texto = {'preguntaTexto': '¿Qué?', 'entrada': 'Yo…'}
    assert errores_presentacion(solo_texto, _item(fuente_opciones=None)) == []


def test_faltan_campos_o_sobra_la_pregunta_de_eleccion():
    assert errores_presentacion({}, _item()) == ['no tiene preguntaTexto', 'no tiene entrada', 'no tiene preguntaEleccion']
    assert errores_presentacion(_nodo(), _item(fuente_opciones=None)) == ['lleva preguntaEleccion sin elegir']
    assert errores_presentacion(_nodo(orden='al-reves'), _item()) == ['tiene un orden desconocido: al-reves']


def test_texto_primero_solo_donde_la_eleccion_no_cambia_lo_que_se_escribe():
    prohibidos = [
        _item(eleccion_ordenada=True),
        _item(premarcar_si={'item': 'x', 'opcion': 'A', 'marca': 'B'}),
        _item(referencia_id=7),
        _item(opciones_propias=[{'codigo': 'NADIE', 'pregunta_propia': '¿Y entonces?'}]),
        _item(opciones_propias=[{'codigo': 'NADA', 'criterio': None}]),
    ]
    for item in prohibidos:
        assert errores_presentacion(_nodo(orden='texto-primero'), item) == [
            'lleva texto-primero, pero su elección cambia lo que se escribe']
    # Una opción propia con criterio y sin pregunta propia no lo impide.
    propia = _item(opciones_propias=[{'codigo': 'OTRO', 'criterio': 'ACCION'}])
    assert errores_presentacion(_nodo(orden='texto-primero'), propia) == []
