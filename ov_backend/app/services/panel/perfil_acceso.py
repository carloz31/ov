"""Acceso al perfil de un estudiante (ajuste panel-estudiantes). Toda ruta del perfil (lecturas y acciones de notas)
pasa por `estudiante_de_orientadora`: la cuenta debe ser orientadora y el estudiante de uno de sus salones
(`es_de_su_salon`); si no, 404 «Estudiante no encontrado»."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import ErrorAccion
from app.models import Cuenta, Rol
from app.services.investigaciones.acciones import exigir_orientadora
from app.services.panel.comun import Alcance, alcance_de_salones


@dataclass(frozen=True)
class Acceso:
    orientadora: Cuenta
    estudiante: Cuenta
    salon: Alcance
    """El salón del estudiante como alcance (los avisos comparan con su salón)."""

    @property
    def solo(self) -> Alcance:
        """El alcance de solo este estudiante."""
        return Alcance(salones=self.salon.salones, salon=self.salon.salon, ahora=self.salon.ahora,
                       estudiantes=[e for e in self.salon.estudiantes if e.id == self.estudiante.id])


def estudiante_de_orientadora(sesion: Session, codigo_cuenta: str, codigo_estudiante: str,
                              ahora: datetime) -> Acceso:
    # Auditoría del panel (H4): la orientadora y sus salones se leen una vez; «de su salón» es la misma condición que
    # `es_de_su_salon` (el salón del estudiante está entre los suyos), y del alcance solo se lee el salón del estudiante.
    orientadora, ids_salones = exigir_orientadora(sesion, codigo_cuenta)
    estudiante = sesion.scalar(select(Cuenta).where(Cuenta.codigo == codigo_estudiante, Cuenta.rol == Rol.ESTUDIANTE))
    if estudiante is None or estudiante.salon_id not in ids_salones:
        raise ErrorAccion("Estudiante no encontrado", estado_http=404)
    return Acceso(orientadora, estudiante, alcance_de_salones(sesion, ids_salones, ahora, salon_id=estudiante.salon_id))
