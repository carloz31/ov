"""Ajuste front de registros (lote 1, §8): un nodo de ítem de `plataforma/` guarda solo lo que el backend no entrega
(`id`, `tipo`, `hablanteId`, `expresion` e `item`); la consigna, la elección y los ecos vienen del registro."""

from scripts.verificar_contenido_front import errores_presentacion


def test_un_nodo_con_lo_que_el_backend_no_entrega_no_tiene_errores():
    assert errores_presentacion({'id': 'b1-1-gustos', 'tipo': 'consigna', 'item': 'b1-1-gustos'}) == []
    assert errores_presentacion({'id': 'x', 'tipo': 'consigna', 'hablanteId': 'guardian', 'expresion': 'feliz',
                                 'item': 'x'}) == []


def test_un_nodo_con_campos_de_la_consigna_los_nombra():
    nodo = {'id': 'x', 'tipo': 'consigna', 'item': 'x', 'dialogo': 'Hola', 'preguntaTexto': '¿Por qué?',
            'eleccion': {}, 'premisa': ''}
    assert errores_presentacion(nodo) == ['trae dialogo, eleccion, preguntaTexto, premisa']
