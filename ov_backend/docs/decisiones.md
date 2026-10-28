# Decisiones de la spec en curso

## Ajuste F07a · Mis planes v4.2 (jerarquía A / B / C)

- **Sin contador de planes listos y sin «Lista para comparar» en pantalla.** El requisito de dos planes lo muestra el camino en `t-comparar`; `lista_para_comparar` sigue en el contrato. En su lugar, el sello «Plan completo» (cuatro secciones Lista) junto a «Tu primer interés»; en el perfil, «Plan completo» o «N de 4 secciones listas».
- **Orden con «Hacer mi plan A».** En B y C, una sola permutación (esa carrera primero, las demás se corren) y el toast «{carrera} ahora es tu plan A»; se retiran «Subir / Bajar prioridad».
- **Secciones como casillas independientes.** Sin línea ni secuencia; en A con título y estado, en B y C solo ícono o número. El detalle «{n} · {título} · {estado}» y el mensaje de bloqueo van solo en el tooltip.
- **Sin plan A, el primer espacio libre ocupa la columna principal**, compacto como los demás; B, C y los espacios restantes van en «Rutas alternas».
