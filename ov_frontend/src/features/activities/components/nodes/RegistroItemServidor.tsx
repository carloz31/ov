import type { NodoConsigna } from '@/types/activities'
import type { ItemRegistroCuenta } from '@/types/servidor'
import type { useRegistroServidor } from '../../hooks/useRegistroServidor'
import { RegistroItemNode } from './RegistroItemNode'
import { RegistroLecturaNode } from './RegistroLecturaNode'
import { PantallaLumi } from './PantallaLumi'

// Un ítem de un registro del servidor (ajuste front de registros, lote 1): por responder, en edición, en lectura o
// la pantalla de Lumi, según el estado que lleva el hook. Quién habla en la consigna es el personaje del nodo; la
// pantalla de Lumi es siempre de Lumi.
export function RegistroItemServidor({
  node,
  item,
  registro,
  onAnterior,
}: {
  node: NodoConsigna
  item: ItemRegistroCuenta
  registro: ReturnType<typeof useRegistroServidor>
  onAnterior?: () => void
}) {
  const vista = registro.vista(node)
  const { lumi, ocupado, error } = registro
  if (vista === 'lumi' && lumi)
    return (
      <PantallaLumi
        key={`${item.codigo}-${lumi.estado.tipo}`}
        eleccion={lumi.eleccion}
        texto={lumi.texto}
        estado={lumi.estado}
        ocupado={ocupado}
        error={error}
        onResponder={registro.responderRepregunta}
        onSeguir={() => registro.continuar(node)}
        onContinuar={() => registro.continuar(node)}
      />
    )
  if (vista === 'lectura')
    return (
      <RegistroLecturaNode
        item={item}
        hablanteId={node.hablanteId}
        ocupado={ocupado}
        error={error}
        onModificar={() => registro.modificar(node)}
        onReenviar={() => registro.reenviar(node)}
        onContinuar={() => registro.continuar(node)}
        onAnterior={onAnterior}
      />
    )
  const edicion = vista === 'edicion' ? { pista: item.respuesta?.pista ?? null } : undefined
  return (
    <RegistroItemNode
      key={edicion ? 'edicion' : 'por-responder'}
      item={item}
      hablanteId={node.hablanteId}
      borrador={registro.borradorDe(item.codigo)}
      onBorrador={(borrador) => registro.guardarBorrador(item.codigo, borrador)}
      edicion={edicion}
      ocupado={ocupado}
      error={error}
      onEnviar={() => registro.enviar(node)}
      onAnterior={onAnterior}
      onCancelar={() => registro.cancelar(node)}
    />
  )
}
