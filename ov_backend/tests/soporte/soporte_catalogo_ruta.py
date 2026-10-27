"""Códigos reales de las carreras, instituciones y ubicaciones con que la ruta demuestra cada mecánica
(`datos/ruta.py`, ajuste catalogo-datos-reales). Las pruebas los nombran por su papel, no por su código."""

from datos.ruta import CARRERAS_RUTA, INSTITUCIONES_RUTA, UBICACIONES_RUTA


PSICOLOGIA = CARRERAS_RUTA['psychology']
ING_CIVIL = CARRERAS_RUTA['civil-engineering']
ING_AMBIENTAL = CARRERAS_RUTA['environmental-engineering']
PERIODISMO = CARRERAS_RUTA['journalism']
ENFERMERIA = CARRERAS_RUTA['nursing']
VETERINARIA = CARRERAS_RUTA['veterinary-medicine']

INST_UNI = INSTITUCIONES_RUTA['t-uni']
INST_PRIVADA = INSTITUCIONES_RUTA['t-privada']
INST_CUSCO_PRIVADA = INSTITUCIONES_RUTA['t-cusco-privada']
INST_TECNICO = INSTITUCIONES_RUTA['t-tecnico']
INST_FFAA = INSTITUCIONES_RUTA['t-ffaa']

UBIC_LIMA = UBICACIONES_RUTA['t-lima']
UBIC_CUSCO = UBICACIONES_RUTA['t-cusco']
UBIC_AREQUIPA = UBICACIONES_RUTA['t-arequipa']
