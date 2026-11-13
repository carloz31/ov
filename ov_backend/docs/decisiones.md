# Decisiones de la spec en curso

- Casos de la Central (c1–c6, conjunto `contenido`): el mínimo para superarlos baja un punto a pedido del usuario (6→5 en los de 8 y 8→7 en los de 10), porque resultaban difíciles. Se adaptan `test_carga_contenido.py` y `test_casos_contenido.py`; `ruta` (`t-caso`, congelado) no cambia.
- Vista explicada de partida y llegada (api): se quita la frase de Helena del front bajo el título (`ResultHeader`), a pedido del usuario; queda solo la `lectura` del instrumento. Se adapta `servidor-partida-llegada.test.mjs`.
