# Decisiones de la spec en curso

## Ajuste catalogo-apoderado

- El apoderado y la orientadora leen el catálogo sin la sección CATALOGO (`exigir_catalogo` retorna para un rol distinto de ESTUDIANTE). No se tocó la audiencia de la sección: abrirla a otros roles habría metido reglas y presentaciones del estudiante en sus portales.
- Las acciones `ver-carrera`, `ver-ocupacion` y `ver-institucion` de un rol no estudiante responden 200 sin eventos ni desbloqueos (la exploración se mide solo en el estudiante).
- Se adaptó `test_catalogo_cerrado_responde_409_en_cada_ruta`: su última línea esperaba 404 del catálogo para `apo-rosa`, lo contrario de lo que pide la spec. Lo cubre la prueba nueva por rol. El 404 sobre la cuenta de otro (guardia del token) tiene su propia prueba.
- Front: `consultarCuentaSesion` (store/servidor/sesion.ts) pide el catálogo con la cuenta de la sesión, de cualquier rol. La ocupación de la Central y el lugar inesperado siguen con `consultarCuenta` (solo estudiante).
- `useModoCatalogo` (features/discovery) decide el modo lectura y las rutas por el rol de la sesión. No hay contexto ni props nuevas para los enlaces: así `TarjetaCatalogo`, `DondeEstudiarla` y los demás funcionan igual en ambos portales.
- Una sola vista de ruta por portal (`ParentExplorarView`, `CounselorExplorarView`) para el listado y el detalle (`:codigo`), que monta `CatalogoPortal`, en lugar de dos vistas por portal.
- Las subrutas van en `routes/SubrutasExplorar.tsx` (como `SubrutasFamilia`), para que `AppRoutes.tsx` no pase de 300 líneas.
- En modo lectura, la ayuda «Filtre por el tipo de interés…» se oculta cuando ya hay letras elegidas, porque entonces se muestra «Código: …».
- `catalogo-portal.css` define todas las variables `--sx-*` del catálogo dentro de `[data-variante='portal']`: en los portales del personal no existe `.sx-root`, que es donde el estudiante las define.
- La espera del detalle en el portal usa `PantallaCargaPortal` (`enSeccion`), el cargador de las secciones del portal, porque los estilos de `PantallaCarga` (Lumi, «Abriendo el atlas») dependen de `.sx-root`. Los esqueletos del listado y de «Mostrar más» son los de F06.
- Los favoritos siguen siendo del estudiante: `favoritos.py` usa `exigir_seccion_catalogo`, que exige CATALOGO siempre. La lectura del catálogo usa `exigir_catalogo`, libre para otros roles. Así `GET /cuentas/apo-rosa/favoritos` sigue en 404 (`test_favoritos_exigen_el_catalogo_abierto`, sin adaptar).
- En modo lectura, «Costos y admisión» del detalle de institución dice «Los costos, becas y fechas de admisión cambian cada año. Revíselos en su página oficial.», sin la mención al presupuesto de la tarjeta (pedido del usuario tras la revisión). El estudiante conserva su texto.
