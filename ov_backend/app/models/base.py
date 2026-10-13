import unicodedata
from enum import StrEnum

from sqlalchemy import Enum, MetaData
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={
        'ix': 'ix_%(column_0_label)s',
        'uq': 'uq_%(table_name)s_%(column_0_name)s',
        'ck': 'ck_%(table_name)s_%(constraint_name)s',
        'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s',
        'pk': 'pk_%(table_name)s',
    })


def enumerado(clase: type[StrEnum]) -> Enum:
    return Enum(
        clase, native_enum=False, create_constraint=True, validate_strings=True,
        values_callable=lambda valores: [valor.value for valor in valores],
    )


def sin_tildes(texto: str) -> str:
    """Minúsculas sin tildes: criterio de comparación de textos y de la columna `busqueda` del catálogo."""
    return ''.join(c for c in unicodedata.normalize('NFD', texto.lower()) if unicodedata.category(c) != 'Mn')


def busqueda_de(campo: str):
    """Valor por defecto de `busqueda`: el `campo` de la misma fila, normalizado con `sin_tildes`."""
    return lambda contexto: sin_tildes(contexto.get_current_parameters()[campo])
