import { UserRound } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import { dimensionNames, type RiasecDimension } from '../lib/catalogDetails'
import { textosComparacion } from '../data/catalogoTextos'

const nombre = (letra: string) => dimensionNames[letra as RiasecDimension] ?? letra

// La frase de lo que comparten la profesión y el estudiante.
function fraseComparacion(profesion: string[], estudiante: string[]) {
  if (profesion[0] && profesion[0] === estudiante[0]) return textosComparacion.principal(nombre(profesion[0]))
  const comunes = profesion.filter((letra) => estudiante.includes(letra))
  return comunes.length ? textosComparacion.alguna(comunes.map(nombre).join(' y ')) : textosComparacion.ninguna
}

function FilaSellos({ etiqueta, letras, estudiante = false }: { etiqueta: string; letras: string[]; estudiante?: boolean }) {
  return (
    <div className="sx-c-comparacion-fila">
      <span>
        {estudiante && <UserRound aria-hidden="true" size={16} />}
        {etiqueta}
      </span>
      <span className="sx-d-seal-row" data-estudiante={estudiante}>
        {letras.map((d) => (
          <Seal key={d} state="revealed">
            {d}
          </Seal>
        ))}
      </span>
      <small>{letras.map(nombre).join(' · ')}</small>
    </div>
  )
}

// Ajuste catalogo-datos-reales (F6b): las seis dimensiones de la profesión de mayor a menor (las de su código, en
// color fuerte) y, si el estudiante ya tiene su resultado RIASEC, la comparación con él.
export function PerfilIntereses({
  puntajes,
  codigo,
  resultado,
}: {
  puntajes: Record<string, number>
  codigo: string[]
  resultado: string[] | null
}) {
  const filas = Object.entries(puntajes).sort((a, b) => b[1] - a[1])
  return (
    <Parchment title="Perfil de intereses">
      <p className="sx-c-conteo">Cuánto pesa cada interés en esta profesión</p>
      <div className="sx-c-barras">
        {filas.map(([letra, valor]) => (
          <div className="sx-c-barra-interes" key={letra} data-fuerte={codigo.includes(letra)}>
            <span>{nombre(letra)}</span>
            <span className="sx-c-barra-fondo">
              <span style={{ width: `${valor}%` }} />
            </span>
            <span>{valor} %</span>
          </div>
        ))}
      </div>
      {resultado && resultado.length > 0 && (
        <div className="sx-c-comparacion">
          <p className="sx-c-conteo">Comparado con tu resultado</p>
          <FilaSellos etiqueta="Esta profesión" letras={codigo} />
          <FilaSellos etiqueta="Tú" letras={resultado} estudiante />
          <p>{fraseComparacion(codigo, resultado)}</p>
        </div>
      )}
    </Parchment>
  )
}
