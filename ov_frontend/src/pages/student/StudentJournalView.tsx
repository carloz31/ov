import { useJournalPage } from '@/features/journal/hooks/useJournalPage'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import '@/features/journal/styles/journal.css'
import { JournalHome } from '@/features/journal/components/JournalHome'
import { JournalEditor } from '@/features/journal/components/JournalEditor'
import { JournalDetail } from '@/features/journal/components/JournalDetail'
function StudentJournalView() {
  const {
    state,
    now,
    bond,
    screen,
    setScreen,
    grouping,
    setGrouping,
    query,
    setQuery,
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
    filteredEntries,
    selected,
    usedTags,
    openEditor,
    startBlankEntry,
    startOnboardingEntry,
    addTag,
    saveEntry,
    editEntry,
    deleteEntry,
  } = useJournalPage()
  return (
    <DiscoveryStage ambient="journal">
      {saveNotice && (
        <p role="status" className="sx-j-save-notice">
          {saveNotice}
          <button type="button" aria-label="Cerrar aviso" onClick={() => setSaveNotice('')}>
            <X aria-hidden="true" size={18} />
          </button>
        </p>
      )}
      {screen === 'home' && (
        <JournalHome
          entries={filteredEntries}
          grouping={grouping}
          onChangeGrouping={setGrouping}
          onSuggested={({ prompt, tags: defaultTags, activityId, title }) => {
            openEditor({ prompt, linkedActivityId: activityId, title, lockedTags: defaultTags })
          }}
          now={now}
          onDailyQuestion={openEditor}
          onNew={startBlankEntry}
          onOpen={(entry) => {
            setSelectedId(entry.id)
            setScreen('detail')
          }}
          query={query}
          setQuery={setQuery}
          bond={bond}
          onboarding={!state.journalOnboardingSeen}
          onBegin={startOnboardingEntry}
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
              La conversación dejará de estar disponible. Esto no reduce la amistad ni reinicia el límite
              diario.
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
