## F4b · Libro de Helena: tarjeta de resumen común (front)

Reemplaza el contenido de cada pergamino de `src/features/discovery/components/HelenaBookPages.tsx`. Vale también como corrección de F4: el libro ya no muestra ocupaciones ni carreras. Todo lo que no sea resumen vive en la vista de resultado completo (`discoveryPaths.helenaPage(id)`).

**Referencia visual:** imágenes «Libro de Helena · resumen común (RIASEC, inteligencias, sellada)» y «Libro · otros estados de la tarjeta (lista, perfil plano, una dominante)», adjuntas por el usuario junto con esta spec el 9 de octubre de 2026. Los originales están en su carpeta Downloads; las capturas de revisión se registran en `plan.md`.

### Estructura común

Todas las páginas usan la misma tarjeta, sin importar el instrumento ni el estado, y comparten el mismo orden de zonas. Las tarjetas de una fila tienen la misma altura, y la zona de acciones queda siempre abajo (`margin-top: auto`).

1. **Cabecera:**
   - antetítulo «Página {numeral} · {sellada | lista para revelar | descifrada}»;
   - `h2` = `title`;
   - fila con la etiqueta «Para tu proyecto» u «Opcional» y el `subtitle`;
   - si `demo`, el aviso que ya existe (`etiquetaDemo` + «Este ejemplo no es tu resultado personal.» / «Este instrumento aún no está disponible.»).
2. **Recuadro protagonista:** un recuadro blanco con borde suave. Su contenido depende del estado y del tipo de resultado (abajo).
3. **«En tu resultado completo»:** solo en páginas descifradas. Es una lista de 1 a 3 líneas con ícono que anuncia lo que hay en la vista completa, sin mostrarlo.
4. **Acciones:** un botón principal y, como máximo, un enlace secundario debajo.

Se elimina del pergamino:
- la lista «Carreras que conducen a ellas»;
- el botón «Ocupaciones afines»;
- el enlace a carreras;
- el párrafo de descripción suelto;
- las filas con ícono `Brain` de inteligencias.

El enlace «Ocupaciones afines» al catálogo (`?afines=1`) se conserva solo dentro de la vista completa (sección 5 de F4).

### Contenido por estado

**Sellada.**
- Recuadro: la niebla con candado (`sx-d-fog`) y el `teaser` en cursiva.
- Debajo del recuadro, la barra «Misiones de Helena · {done} de {total}» con su porcentaje.
- Acción principal: «Ir a la siguiente misión» (botón azul, `activityHref`), como hoy.
- Si `mostrarRequisito`, el requisito va debajo de la barra, como hoy.

**Lista para revelar.**
- La tarjeta lleva un borde dorado con halo.
- Recuadro: el sello grande (`Seal state="ready" large`) y el texto «Helena terminó de leer tus respuestas. Rompe el sello para descubrir {tu código de interés | tus inteligencias más desarrolladas}.».
- Acción principal: «Romper el sello» (botón dorado), con la acción `revelarPagina` actual.

**Descifrada · COINCIDENCIAS (intereses).**
- Recuadro en formato de lista, sin círculos ni porcentajes (los valores quedan para la vista completa):
  - rótulo «Tu código de interés · {código}», por ejemplo «Tu código de interés · CAS»;
  - una fila por cada dimensión de `codigo_interes`, en orden: un marcador cuadrado de 32 px con la letra, el nombre en negrita y, debajo, su `descripcion`;
  - cierre: «Ninguno es mejor que otro: son pistas para explorar.».
- «En tu resultado completo»:
  - «Tu perfil en los {n} tipos de interés»;
  - «{n} ocupaciones afines», solo si hay coincidencias;
  - «{n} carreras que conducen a ellas», solo si hay `carreras_recomendadas`.

  Los conteos salen de `coincidencias.length` y `carreras_recomendadas.length`.
- Acciones: el principal «Ver resultado completo» (dorado, con chevron), que lleva a `discoveryPaths.helenaPage(id)`, y el enlace «¿Qué significa cada letra?», que lleva a la misma ruta con `?guia=1`. La vista completa abre la guía (sección 4 de F4) al recibir `guia=1`.

**Descifrada · COINCIDENCIAS con perfil plano.**
- Recuadro con borde punteado: rótulo «Tu código de interés», título «Tus respuestas no marcaron un interés por encima de otro» y el texto «Respondiste de forma muy parecida a todos los tipos de actividad. Revisa tus encuentros con Mara pensando en lo que de verdad disfrutas.».
- «En tu resultado completo»: solo «Tu perfil en los {n} tipos de interés».
- Acciones: el principal «Revisar mis encuentros con Mara» (azul, `/student/exploration?punto=mara-test`) y el enlace «Ver resultado completo».

**Descifrada · DESTACADAS (inteligencias).**
- Recuadro en el mismo formato de lista, sin porcentajes:
  - rótulo «Tu inteligencia más desarrollada», o «Tus inteligencias más desarrolladas» si hay más de una;
  - una fila por cada destacada: el mismo marcador cuadrado de 32 px con el ícono `Brain` en lugar de la letra, el nombre en negrita y, debajo, su `descripcion`;
  - cierre con varias destacadas: «Destacan por igual. Ninguna es mejor que otra: describen cómo te gusta aprender y resolver.»;
  - cierre con una sola: «Es la que más usas hoy para aprender y resolver. Todas se pueden desarrollar.».
- «En tu resultado completo»: «Tu perfil en las {n} inteligencias» e «Ideas para aprovecharlo con tu familia y tu diario».
- Acciones: el principal «Ver resultado completo» y el enlace «¿Qué es cada inteligencia?» (`?guia=1`).

**Fila de dimensión (común).** Un solo componente, `DimensionSummaryRow`, con un marcador (letra o ícono), el nombre y la descripción. Lo usan ambos tipos, y una página de un tipo futuro solo elige su marcador. En el libro nunca se muestran porcentajes ni barras.

### Reglas

- La tarjeta se elige por `tipoResultado` (desde `resultPages.ts` o `GET /instrumentos`, como en F4), nunca por `p.id`. Elimina los `p.id === 'intereses'` y `p.id === 'inteligencias'` de `HelenaBookPages.tsx`.
- Componentes en `src/features/discovery/components/`:
  - `HelenaPageCard.tsx`: la estructura común;
  - `HelenaPageSummary.tsx`: el recuadro protagonista de las páginas descifradas, con sus filas de dimensión;
  - `DimensionSummaryRow.tsx`: una fila de dimensión (marcador, nombre y descripción);
  - `HelenaPageContents.tsx`: la lista «En tu resultado completo».

  `HelenaBookPages.tsx` solo recorre las páginas.
- Lógica pura en `src/features/discovery/lib/resultPage.ts` (la misma de F4): `resumenPagina(page, resultado) → { rotulo, filas, cierre, contenidos }`. Ninguna vista arma textos.
- Botones dorados: el estilo de `sx-d-action-gold` que ya existe. Botones azules: `sx-d-action`. No se crean variantes nuevas de botón.
- En anchos de teléfono, las tarjetas van en una columna.
- Se conservan el encabezado del libro («El libro de Helena», «{n} de 3 páginas descifradas» y los tres sellos) y la animación de romper el sello.

### Pruebas

Agrega a `tests/servidor-resultado.test.mjs`, sobre `resumenPagina`:
- COINCIDENCIAS: 3 filas en el orden de `codigo_interes` y el rótulo con el código.
- El resumen no lleva porcentajes.
- Los conteos de ocupaciones y carreras, y los contenidos que se omiten cuando no hay datos.
- Perfil plano.
- DESTACADAS con una y con dos destacadas.
