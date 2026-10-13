# Decisiones de la spec en curso

<!-- Spec en curso: B10 · Catálogo, instituciones y favoritos (docs/specs/B10.md). -->

- **Modelo F1 (migración 0014).** Se agregan `high_point`, `tipo_carrera`, `ubicacion`, `institucion`, `institucion_carrera`, `ingreso_carrera` y `rango_ingreso`. `Carrera` y `Ocupacion` suman detalle, `codigo_riasec` y `busqueda`, y `TipoEventoUso` suma VISTA_OCUPACION y VISTA_INSTITUCION. Lo pide la spec, para HU-037 a HU-039.
- **`busqueda` se calcula en el modelo.** Se calcula como valor por defecto del modelo (`busqueda_de`, en `app/models/base.py`), con `sin_tildes`, así que también la reciben las filas creadas en pruebas. La migración rellena las filas existentes con la misma función. El proyecto no usa `unaccent`.
- **Relaciones de solo lectura en el catálogo.** `Carrera`, `Ocupacion`, `Institucion` e `IngresoCarrera` ganan relaciones `viewonly` con `lazy="raise"`, para cargar los detalles con `selectinload`. Así, un acceso perezoso falla en vez de multiplicar consultas. No cambian el esquema.
- **`services/carreras.py` se integra en `services/catalogo.py`.** `ver_carrera` ahora exige la sección CATALOGO, como pide la spec.
- **Pruebas de migración adaptadas por el cambio de modelo.** Se ajustan los conteos de tablas (56 a 63; 58 a 65 sentencias CREATE), la clasificación catálogo/estado y las tablas esperadas. La prueba de downgrade ahora espera que 0014 baje antes de que 0013 se detenga por las batallas.
- **Textos de ocupaciones copiados del front.** `fijos.py` copia de `src/data/catalog/` del front la descripción (`typicalWork`), los lugares (`workplaces`) y las habilidades (`skills`). Las ocupaciones cuyo texto en el front es «por completar» quedan sin detalle; cuando el catálogo base y el adicional repiten una ocupación, se toma la versión con texto real.
- **Modelo F2 (migración 0015).** Se agrega la tabla de estado `favorito` (`tipo` + `id_referencia`, sin clave foránea, como `evento_uso`) y el evento MARCA_FAVORITO, para HU-040. Las pruebas de conteo de tablas, de clasificación y de reinicio la incluyen.
- **Favoritos leídos en el contexto.** `ContextoConsultas.favoritos_de` lee los favoritos de la cuenta una vez por petición, y lo usan el catálogo y el resultado RIASEC (`es_favorita`, HU-026).
