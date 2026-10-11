import { useResearchGuide } from '@/features/discovery/hooks/useResearchGuide'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { updateDiscovery } from '@/store/discoveryStore'
export function ResearchReplacementDialog({ model }: { model: ReturnType<typeof useResearchGuide> }) {
  const { replacementFocus, replacement, setReplacement } = model
  return (
    <Dialog
      open={!!replacement}
      onOpenChange={(open) => {
        if (!open) setReplacement(undefined)
      }}
    >
      <DialogContent {...replacementFocus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>¿Cambiar de ocupación?</DialogTitle>
          <DialogDescription>
            Ya tienes un guion guardado. Reemplazarlo borra ese guion y su borrador de publicación; tus
            entrevistas publicadas se conservan.
          </DialogDescription>
        </DialogHeader>
        <div className="sx-d-actions">
          <button
            type="button"
            className="sx-d-action sx-d-action-ghost"
            onClick={() => setReplacement(undefined)}
          >
            Conservar mi guion
          </button>
          <button
            type="button"
            className="sx-d-action"
            onClick={() => {
              updateDiscovery((s) => ({
                ...s,
                research: { occupationId: replacement!, before: '', ownQuestions: [], guideStep: 0 },
              }))
              setReplacement(undefined)
            }}
          >
            Reemplazar mi guion
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
