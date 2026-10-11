// A3: las funciones del mapa se cargan desde sus módulos finales.
export function loadMapPoints(load) {
  return Object.assign({}, ...['mapPoints', 'caminoPoints', 'ciudadPoints', 'pointDetails', 'missionSync']
    .map(name => load(`src/features/adventure/lib/${name}.ts`)))
}
