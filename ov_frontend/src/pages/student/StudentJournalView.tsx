import { useJournalPage } from '@/features/journal/hooks/useJournalPage'
import { BookOpen, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import '@/features/journal/styles/journal.css'
import { JournalHome } from '@/features/journal/components/JournalHome'
import { JournalEditor } from '@/features/journal/components/JournalEditor'
import { JournalDetail } from '@/features/journal/components/JournalDetail'
import { DailyQuestionCard } from '@/features/journal/components/DailyQuestionCard'
import { BuzonLumi } from '@/features/journal/components/BuzonLumi'
import { LumiBondPanel } from '@/features/journal/components/LumiBondPanel'
import { CuadernoDiario } from '@/features/journal/components/CuadernoDiario'
import { HistoriaLumi } from '@/features/journal/components/HistoriaLumi'
import { StudentActivityPlayer } from '@/features/activities/components/StudentActivityPlayer'
function StudentJournalView() {
  const {
    state,
    now,
    bond,
    screen,
    setScreen,
    cuadernoCompleto,
    entries,
    setSelectedId,
    editingId,
    body,
    setBody,
    tags,
    setTags,
    lockedTags,
    tagDraft,
    setTagDraft,
    promptShown,
    entryTitle,
    setEntryTitle,
    deleteOpen,
    setDeleteOpen,
    returnFocus,
    saveNotice,
    setSaveNotice,
    selected,
    usedTags,
    openEditor,
    startBlankEntry,
    startOnboardingEntry,
    addTag,
    saveEntry,
    editEntry,
    deleteEntry,
    diarioServidor,
    hoy,
    buzon,
    historia,
    capitulo,
    verCapitulo,
    cerrarCapitulo,
  } = useJournalPage()
  // Ajuste del diario (F05): un recuerdo de Lumi se ve en el reproductor de actividades y vuelve al diario.
  if (capitulo)
    return (
      <div className="sx-player-host">
        <StudentActivityPlayer
          key={capitulo.id}
          activity={capitulo}
          imageUrl="/images/background/forest.png"
          onClose={cerrarCapitulo}
          salida={{ texto: 'Volver al diario', onClick: cerrarCapitulo }}
        />
      </div>
    )
  const abrirEntrada = (id: string) => {
    setSelectedId(id)
    setScreen('detail')
  }
  return (
    <DiscoveryStage ambient="journal">
      {saveNotice && (
        <AvisoToast
          key={saveNotice.id}
          icono={saveNotice.error ? TriangleAlert : BookOpen}
          etiqueta="Mi diario"
          titulo={saveNotice.titulo}
          descripcion={saveNotice.descripcion}
          onDismiss={() => setSaveNotice(null)}
        />
      )}
      {diarioServidor?.error && (
        <p role="status" className="sx-j-save-notice">
          {diarioServidor.error}
        </p>
      )}
      {screen === 'home' && (
        <JournalHome
          onboarding={!state.journalOnboardingSeen}
          onBegin={startOnboardingEntry}
          hoy={<DailyQuestionCard now={now} hoy={hoy} onRespond={openEditor} onFree={startBlankEntry} />}
          buzon={
            <BuzonLumi
              cartas={buzon.cartas}
              ahora={now}
              enRedaccion={buzon.enRedaccion}
              acciones={{ onResponder: buzon.responder, onAbrir: buzon.abrir, onArchivar: buzon.archivar }}
              limite={3}
              verTodas
              actualizar={buzon.enRedaccion.length ? buzon.actualizar : undefined}
            />
          }
          lumi={
            <LumiBondPanel
              bond={bond}
              siguienteRecuerdo={historia.siguienteRecuerdo}
              historia={<HistoriaLumi capitulos={historia.capitulos} onVer={(c) => verCapitulo(c.codigo)} />}
            />
          }
          cuaderno={
            <CuadernoDiario
              entries={entries}
              onOpen={(entry) => abrirEntrada(entry.id)}
              completo={cuadernoCompleto}
            />
          }
        />
      )}
      {screen === 'write' && (
        <JournalEditor
          body={body}
          editing={Boolean(editingId)}
          title={entryTitle}
          onTitleChange={setEntryTitle}
          remainingToday={bond.remainingToday}
          lockedTags={lockedTags}
          onAddTag={addTag}
          onBack={() => setScreen(editingId ? 'detail' : 'home')}
          onBodyChange={setBody}
          onRemoveTag={(tag) =>
            !lockedTags.includes(tag) && setTags((current) => current.filter((item) => item !== tag))
          }
          onSave={saveEntry}
          onTagDraftChange={setTagDraft}
          prompt={promptShown}
          suggestedTags={usedTags.filter((tag) => !tags.includes(tag))}
          tagDraft={tagDraft}
          tags={tags}
          servidor={diarioServidor && { escribiendo: false }}
        />
      )}
      {screen === 'detail' && selected && (
        <JournalDetail
          entry={selected}
          onBack={() => setScreen('home')}
          onDelete={() => setDeleteOpen(true)}
          onEdit={() => editEntry(selected)}
        />
      )}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent {...returnFocus} className="sx-root sx-j-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar esta entrada</DialogTitle>
            <DialogDescription>
              {diarioServidor && selected?.etiqueta === 'Carta de Lumi'
                ? 'Se borrará tu respuesta y la carta quedará archivada en tu buzón.'
                : 'Se borrará la entrada.'}
            </DialogDescription>
          </DialogHeader>
          <div className="sx-d-actions">
            <button
              className="sx-d-action sx-d-action-ghost"
              onClick={() => setDeleteOpen(false)}
              type="button"
            >
              Conservar
            </button>
            <button className="sx-d-action" onClick={deleteEntry} type="button">
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DiscoveryStage>
  )
}

export { StudentJournalView }
