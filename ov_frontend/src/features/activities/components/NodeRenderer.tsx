import { useActivityPlayer } from '@/features/activities/hooks/useActivityPlayer'
import { studentId } from '@/lib/activities/logic'
import type { Actividad } from '@/types/activities'
import { DialogueBox } from '@/features/activities/components/DialogueBox'
import { FinishScreen } from '@/features/activities/components/FinishScreen'
import { ChoiceNode } from '@/features/activities/components/nodes/ChoiceNode'
import { SlideNode } from '@/features/activities/components/nodes/SlideNode'
import { QuestionNode } from '@/features/activities/components/nodes/QuestionNode'
import { ItemNode } from '@/features/activities/components/nodes/ItemNode'
import { SubmissionNode } from '@/features/activities/components/nodes/SubmissionNode'
import { MatrixNode } from '@/features/activities/components/nodes/MatrixNode'
import { ResultNode } from '@/features/activities/components/nodes/ResultNode'
import { RegistroConsignaNode } from '@/features/activities/components/nodes/RegistroConsignaNode'
import { borradorRegistro, turnosRegistro } from '@/features/activities/hooks/useRegistroServidor'
import { RegistroSeguimiento } from '@/features/activities/components/followup/RegistroSeguimiento'
export function NodeRenderer({
  model,
  activity,
  edit,
  direct,
}: {
  model: ReturnType<typeof useActivityPlayer>
  activity: Actividad
  edit: boolean
  direct: boolean
}) {
  const {
    nodes,
    index,
    node,
    reaction,
    reactions,
    setReactions,
    matrix,
    previous,
    guardando,
    respuestaPendiente,
    itemResponse,
    advance,
    move,
    cierreServidor,
    yaCompletada,
    openResources,
    itemServidor,
    item,
    itemOptions,
    valorServidor,
    existingItemAnswer,
    setErrorServidor,
    revisionInstrumento,
    itemOcupado,
    itemSoloLectura,
    puedeTerminarEncuentro,
    registro,
  } = model
  const itemRegistro =
    node?.tipo === 'consigna' && registro.registroEnServidor
      ? registro.items.find((i) => i.codigo === node.item)
      : undefined
  const { pendiente, cierre } = registro
  return reaction ? (
    <div className="sx-player-scene">
      <div className="sx-scene-space" />
      <DialogueBox
        key={reaction.id}
        speakerId={reaction.hablanteId}
        text={reaction.texto}
        hint="Escucha, a tu ritmo."
        onContinue={() => setReactions(reactions.slice(1))}
      />
    </div>
  ) : registro.enSeguimiento ? (
    <div className="sx-card-stage">
      <section className="sx-glass sx-player-card sx-submission-card case-scrollbar">
        <RegistroSeguimiento
          key={pendiente ? `${pendiente.item}-${pendiente.conversacion.length}` : 'cierre'}
          item={pendiente?.item}
          hilo={pendiente && turnosRegistro(pendiente)}
          ocupado={registro.ocupado === 'evaluando'}
          error={registro.error}
          porAmpliar={(cierre && (cierre.items_por_ampliar ?? []))?.map((i) => ({
            nombre: registro.items.find((item) => item.codigo === i.item)?.nombre ?? i.item,
            pista: i.pista,
          }))}
          onResponder={(texto) => void registro.responder(texto)}
          onOmitir={() => void registro.omitir()}
          onReintentar={() => void registro.reintentar()}
          onContinuar={registro.continuar}
        />
      </section>
    </div>
  ) : !node ? (
    <FinishScreen
      activity={activity}
      yaCompletada={yaCompletada}
      desbloqueosServidor={cierreServidor?.nuevos_desbloqueos}
    />
  ) : matrix ? (
    <MatrixNode
      activity={activity}
      onContinue={() => {
        const last = nodes.findLastIndex((node) => node.tipo === 'consigna')
        move(nodes[last + 1])
      }}
    />
  ) : node.tipo === 'dialogo' ? (
    <div className="sx-player-scene">
      <div className="sx-scene-space" />
      <DialogueBox
        key={node.id}
        speakerId={node.hablanteId}
        text={node.texto}
        hint="Una conversación, un paso más."
        onContinue={advance}
      />
    </div>
  ) : node.tipo === 'eleccion' ? (
    <ChoiceNode
      node={node}
      previous={previous?.tipo === 'dialogo' ? previous : undefined}
      onChoose={(option) =>
        move(
          nodes[index + 1],
          (current) =>
            node.registrar
              ? {
                  ...current,
                  choices: [
                    ...current.choices.filter(
                      (choice) => !(choice.actividadId === activity.id && choice.nodoId === node.id),
                    ),
                    {
                      estudianteId: studentId,
                      actividadId: activity.id,
                      nodoId: node.id,
                      opcionId: option.id,
                      respondidaEn: new Date().toISOString(),
                    },
                  ],
                }
              : current,
          option.reaccion,
        )
      }
    />
  ) : node.tipo === 'diapositiva' ? (
    <SlideNode node={node} onContinue={advance} onResources={openResources} />
  ) : node.tipo === 'pregunta' ? (
    <QuestionNode
      key={node.id}
      activity={activity}
      node={node}
      onContinue={advance}
      fresh={edit && activity.tipo === 'encuentro'}
      onResources={openResources}
    />
  ) : node.tipo === 'item' ? (
    <ItemNode
      key={node.id}
      node={node}
      text={itemServidor?.enunciado ?? item?.texto ?? 'Este ítem aún no está disponible.'}
      options={
        itemServidor
          ? itemServidor.escala.opciones.map((o) => ({ value: o.orden, text: o.etiqueta }))
          : itemOptions
      }
      existing={
        itemServidor
          ? valorServidor === undefined
            ? undefined
            : { valor: valorServidor }
          : existingItemAnswer
      }
      busy={itemOcupado}
      readOnly={itemSoloLectura}
      direct={direct}
      onAnswer={itemResponse}
      onContinue={() => {
        if (!guardando && !respuestaPendiente.current) {
          setErrorServidor('')
          advance()
        }
      }}
    />
  ) : node.tipo === 'consigna' && itemRegistro ? (
    <div className="sx-card-stage">
      <section className="sx-glass sx-player-card sx-submission-card case-scrollbar">
        <RegistroConsignaNode
          key={node.id}
          node={node}
          item={itemRegistro}
          inicial={borradorRegistro(registro.respuestaDe(itemRegistro.codigo))}
          ultimo={registro.esUltimaConsigna(node.id)}
          ocupado={!!registro.ocupado}
          error={registro.error}
          onGuardar={(texto, opciones) => void registro.guardar(node, texto, opciones)}
        />
      </section>
    </div>
  ) : node.tipo === 'consigna' ? (
    <div className="sx-card-stage">
      <section className="sx-glass sx-player-card sx-submission-card case-scrollbar">
        <SubmissionNode
          key={node.id}
          activity={activity}
          node={node}
          onSaved={advance}
          onKeep={advance}
          edit={edit}
        />
        {!node.obligatoria && (
          <button type="button" className="sx-secondary-button" onClick={advance}>
            Dejar para después
          </button>
        )}
      </section>
    </div>
  ) : (
    <div className="sx-card-stage">
      <section className="sx-glass-dark sx-player-card sx-result-card case-scrollbar">
        <ResultNode activity={activity} instrumentId={node.instrumentoId} />
        {puedeTerminarEncuentro && (
          <button className="sx-primary-button" disabled={guardando} onClick={advance}>
            {revisionInstrumento ? 'Volver a la ciudad' : 'Terminar encuentro'}
          </button>
        )}
      </section>
    </div>
  )
}
