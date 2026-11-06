"""Entrevistas de ejemplo para ver Investigaciones y el detalle de carrera con datos (ajuste entrevistas por familia).

DATO DE PRUEBA: personas inventadas. Los videos son los de los testimonios de `contenido`, solo para que el reproductor
funcione: no corresponden a estas personas. No es parte de ningún conjunto ni se despliega. Escribe directo en la base
de `DATABASE_URL`, sin eventos, así que no cambia el avance de nadie. Se puede repetir: lo que ya existe no se duplica.

    uv run python scripts/sembrar_entrevistas_ejemplo.py
"""

from datetime import datetime, timedelta
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models as m  # noqa: E402
from app.database import crear_motor_bd  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402
from datos import contenido  # noqa: E402


# DATO DE PRUEBA. Cuatro de Psicología para probar el límite de tres del detalle de carrera y «Ver las N entrevistas».
# (familia, autores, título, profesional, a qué se dedica, duración, resumen, es Leyenda)
ENTREVISTAS = (
    ('313', ('est-ana', 'est-mia'), 'Escuchar también se aprende', 'Lucía Paredes', 'Psicóloga clínica en un centro de salud',
     '18 min', 'Nos contó que la mayor parte de su trabajo es escuchar, y que no da consejos como solemos imaginar.', False),
    ('313', ('est-luis',), 'Un colegio, seiscientos estudiantes y una sola psicóloga en toda la institución educativa',
     'Martín Chávez', 'Psicólogo educativo en un colegio público', '14 min',
     'Atiende a todo el colegio. Nos explicó cómo decide a quién ver primero y qué hace cuando no le alcanza el tiempo.', False),
    ('313', ('est-teo',), 'Lo que hace una psicóloga en una empresa', 'Rocío Flores', 'Selección de personal en una minera',
     '12 min', 'No atiende pacientes: diseña procesos de selección. No sabíamos que la carrera también llevaba ahí.', False),
    ('313', ('est-beto',), 'Cambiar de rumbo a los treinta', 'Andrea Salazar', 'Psicóloga comunitaria en una ONG',
     '20 min', 'Empezó en Contabilidad. Nos contó qué le costó cambiar y por qué no se arrepiente.', True),
    ('331', ('est-sol',), 'Abrir un negocio no es solo tener la idea', 'Jorge Huamán', 'Administrador de una panadería familiar',
     '16 min', 'Nos enseñó sus cuentas reales: lo que parecía ganancia a veces no lo era.', False),
    ('611', ('est-beto',), 'Una chacra también se administra', 'Elena Quispe', 'Técnica agropecuaria en una cooperativa',
     '15 min', 'Trabaja con productores de su zona y nos contó cómo cambió el trabajo con los datos del clima.', True),
)
# (autor de la reacción, tipo, comentario) sobre cada entrevista que no es suya.
REACCIONES = (('est-sol', 'APRENDI', 'No sabía que se podía trabajar de esto fuera de un consultorio.'),
              ('est-teo', 'CURIOSIDAD', 'Me quedé pensando en cómo se decide a quién atender primero.'))
FANS = ('est-mia', 'est-teo', 'est-sol')


def sembrar(sesion: Session, ahora: datetime | None = None) -> int:
    """Crea las que falten y devuelve cuántas. Las cuentas deben estar cargadas (`ruta` o `contenido`)."""
    ahora = ahora or datetime.now().replace(microsecond=0)
    cuentas = {c.codigo: c for c in sesion.scalars(select(m.Cuenta))}
    familias = {f.codigo: f for f in sesion.scalars(select(m.FamiliaCarrera))}
    tipos = {t.codigo: t.id for t in sesion.scalars(select(m.TipoReaccion))}
    videos = [t[3] for t in contenido.TESTIMONIOS]
    creadas = 0
    for n, (familia, autores, titulo, profesional, dedicacion, duracion, resumen, leyenda) in enumerate(ENTREVISTAS, 1):
        codigo = f'ENT-EJEMPLO-{n}'
        if sesion.scalar(select(m.Entrevista.id).where(m.Entrevista.codigo == codigo)) is not None:
            continue
        fecha = ahora - timedelta(days=n)
        entrevista = m.Entrevista(
            codigo=codigo, familia_id=familias[familia].id, titulo=titulo, profesional=profesional, dedicacion=dedicacion,
            duracion=duracion, enlace=f'https://youtu.be/{videos[n % len(videos)]}', resumen=resumen,
            busqueda=sin_tildes(f'{titulo} {profesional} {dedicacion} {familias[familia].nombre}'),
            estado=m.EstadoEntrevista.PUBLICADA, fecha_hora=fecha, destacada_en=fecha if leyenda else None,
            leyenda_en=fecha if leyenda else None)
        sesion.add(entrevista)
        sesion.flush()
        for autor in autores:
            sesion.add(m.EntrevistaAutor(entrevista_id=entrevista.id, cuenta_id=cuentas[autor].id))
            sesion.add(m.Investigacion(
                codigo=f'INV-EJEMPLO-{n}-{autor}', cuenta_id=cuentas[autor].id, familia_id=familias[familia].id,
                estado=m.EstadoInvestigacion.PUBLICADA, piensa_dia='Creía que era un trabajo de oficina, siempre igual.',
                piensa_necesita='Creía que bastaba con estudiar la carrera.', piensa_duda='¿Se puede vivir bien de esto?',
                creada_en=fecha, guia_lista_en=fecha, entrevista_id=entrevista.id))
        for i, (autor, tipo, comentario) in enumerate(REACCIONES):
            if autor not in autores:
                sesion.add(m.Reaccion(codigo=f'REA-EJEMPLO-{n}-{i}', entrevista_id=entrevista.id, cuenta_id=cuentas[autor].id,
                                      tipo_reaccion_id=tipos[tipo], comentario=comentario, creada_en=fecha))
        if leyenda:
            sesion.add_all(m.Favorito(cuenta_id=cuentas[fan].id, tipo=m.TipoFavorito.ENTREVISTA, id_referencia=entrevista.id,
                                      fecha_hora=fecha) for fan in FANS)
        creadas += 1
    sesion.flush()
    return creadas


def main() -> None:
    motor = crear_motor_bd(os.environ.get('DATABASE_URL', 'sqlite:///ov.db'))
    try:
        with Session(motor) as sesion:
            creadas = sembrar(sesion)
            sesion.commit()
    finally:
        motor.dispose()
    print(f'Entrevistas de ejemplo creadas: {creadas} de {len(ENTREVISTAS)}.')


if __name__ == '__main__':
    main()
