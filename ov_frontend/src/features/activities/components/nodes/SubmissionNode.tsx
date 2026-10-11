import { useEffect, useRef, useState } from 'react'
import { Check, Star } from 'lucide-react'
import type { Actividad, Entregable, NodoConsigna } from '@/types/activities'
import { applyCompletion, latestSubmission, studentId, validateSubmission } from '@/lib/activities/logic'
import { journeyEnServidor, updateJourney, useJourney } from '@/store/journeyStore'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { FollowUp } from '../followup/FollowUp'
import { getFollowUpRecord, recoverFollowUp, setFollowUpRecord } from '../../store/followUpStore'
import { criteria, personalizations, reflectionCopy } from '@/data/activities/reflectionConfig'
import { beginResponse } from '../../lib/reflection/evaluation'
import { getReflections, updateReflections, useReflections } from '@/store/reflectionStore'
import { prepareQuestion, questionInfluencesLater } from '../../lib/reflection/personalization'
import { HighlightedQuestion } from '@/features/activities/components/reflection/HighlightedQuestion'
import { QuestionMemory } from '../reflection/QuestionMemory'
import { LumiMedallion } from '@/components/student/LumiMedallion'
export function SubmissionNode({
  activity,
  node,
  onSaved,
  onKeep,
}: {
  activity: Actividad
  node: NodoConsigna
  onSaved: () => void
  onKeep?: () => void
  edit?: boolean
}) {
  const state = useJourney()
  const existing = latestSubmission(state, activity.id, node.id)
  const draftKey = `${activity.id}/${node.id}`
  const reflections = useReflections()
  const shownQuestion = reflections.preguntas[draftKey]
  const needsQuestion = !!personalizations[draftKey] || !!criteria[draftKey]
  const influencesLater = questionInfluencesLater(activity.id, node.id)
  const [intro, setIntro] = useState(false)
  const [text, setText] = useState(
    state.drafts[draftKey] ?? (existing?.contenido.tipo === 'texto' ? existing.contenido.texto : ''),
  )
  const [selection, setSelection] = useState<string[]>(
    existing?.contenido.tipo === 'opcion' ? existing.contenido.seleccion : [],
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const evaluated = !!criteria[draftKey] && activity.plantilla?.tipo !== 'matriz'
  const [following, setFollowing] = useState(
    () =>
      evaluated &&
      getReflections().respuestas[draftKey]?.estado === 'EN_SEGUIMIENTO' &&
      !!getFollowUpRecord(draftKey),
  )
  const initialRecord = useRef(getFollowUpRecord(draftKey))
  const [recovering, setRecovering] = useState(
    () =>
      activity.tipo === 'registro' &&
      !evaluated &&
      activity.plantilla?.tipo !== 'matriz' &&
      !!initialRecord.current &&
      !initialRecord.current.versionCondensada &&
      initialRecord.current.turnos.some((turn) => !turn.omitida && !!turn.respuesta?.trim()),
  )
  const spec = node.entregable
  useEffect(() => {
    if (needsQuestion) void prepareQuestion(activity, node).catch((reason: Error) => setError(reason.message))
    if (influencesLater && (!needsQuestion || shownQuestion) && !getReflections().introVista) {
      if (updateReflections((s) => ({ ...s, introVista: true }))) setIntro(true)
    }
  }, [activity, node, needsQuestion, shownQuestion, influencesLater])
  useEffect(() => {
    if (
      activity.tipo !== 'registro' ||
      evaluated ||
      spec.tipo !== 'texto' ||
      activity.plantilla?.tipo === 'matriz' ||
      !initialRecord.current ||
      initialRecord.current.versionCondensada
    )
      return
    let cancelled = false
    void recoverFollowUp(activity, node).then((result) => {
      if (cancelled) return
      if (result.saved && result.text !== undefined) setText(result.text)
      setRecovering(false)
    })
    return () => {
      cancelled = true
    }
  }, [activity, node, spec.tipo, evaluated])
  useEffect(() => {
    if (spec.tipo === 'archivo' && !node.obligatoria) onSaved()
  }, [spec.tipo, node.obligatoria, onSaved])
  async function submit() {
    setError('')
    let content: Entregable['contenido'] = { tipo: 'texto', texto: text.trim() }
    if (spec.tipo === 'opcion') content = { tipo: 'opcion', seleccion: selection }
    const validation = validateSubmission(node, content)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    try {
      const entry: Entregable = {
        id: crypto.randomUUID(),
        estudianteId: studentId,
        actividadId: activity.id,
        nodoId: node.id,
        contenido: content,
        version: (existing?.version ?? 0) + 1,
        enviadoEn: new Date().toISOString(),
      }
      if (
        updateJourney((current) => {
          const drafts = { ...current.drafts }
          delete drafts[draftKey]
          const next = {
            ...current,
            submissions: [...current.submissions, entry],
            drafts,
          }
          return evaluated || journeyEnServidor() ? next : applyCompletion(activity, next)
        })
      ) {
        if (evaluated && content.tipo === 'texto') {
          if (
            !beginResponse(activity, node, entry) ||
            !setFollowUpRecord(draftKey, {
              textoInicial: content.texto,
              versionInicial: entry.version,
              turnos: [],
            })
          ) {
            setError(
              'Tu entrega se guardó, pero falta guardar el seguimiento. Libera espacio y vuelve a intentarlo.',
            )
            return
          }
          setFollowing(true)
        } else onSaved()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la entrega.')
    } finally {
      setBusy(false)
    }
  }
  if (spec.tipo === 'archivo') return <p>Esta entrega no está disponible en la plataforma.</p>
  if (recovering) return <p role="status">Recuperando tu respuesta…</p>
  if (needsQuestion && !shownQuestion)
    return (
      <div role="status" className="sx-question-loading">
        <LumiMedallion />
        <p>{reflectionCopy.loading}</p>
        {error && <p role="alert">{error}</p>}
      </div>
    )
  if (following) return <FollowUp activity={activity} node={node} onContinue={onSaved} />
  return (
    <form
      className="sx-submission-form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {node.hablanteId && <CharacterAvatar id={node.hablanteId} size="sm" />}
      {intro && <p className="sx-submission-help">{reflectionCopy.intro}</p>}
      {shownQuestion && (
        <QuestionMemory
          question={shownQuestion}
          compact={activity.plantilla?.tipo === 'matriz'}
          hideNotice={activity.plantilla?.tipo === 'matriz'}
        />
      )}
      {node.id === 'future-aspiracion' &&
        state.submissions.some((e) => e.nodoId === 'mission-future-entry') && (
          <details className="sx-question-memory">
            <summary>Tu historial privado de Mi horizonte</summary>
            <div>
              {state.submissions
                .filter((e) => e.actividadId === activity.id && e.nodoId === 'mission-future-entry')
                .map((e) => (
                  <article key={e.id}>
                    <strong>Versión {e.version} · Solo tú puedes verla</strong>
                    <p className="sx-memory-full">{e.contenido.tipo === 'texto' ? e.contenido.texto : ''}</p>
                  </article>
                ))}
            </div>
          </details>
        )}
      <p className="sx-submission-visibility">
        {node.visibilidad === 'solo_estudiante'
          ? 'Solo tú puedes ver esta entrega.'
          : node.visibilidad === 'estudiante_orientadora'
            ? 'Visible para ti y tu orientadora.'
            : 'Visible para ti, tu orientadora y tu familia.'}{' '}
        Guardado en este navegador.
      </p>
      <label className="sx-submission-label">
        <span className="sx-submission-premise">
          <HighlightedQuestion text={shownQuestion?.texto ?? node.premisa} quote={shownQuestion?.cita} />
        </span>
        {node.ayuda && <span className="sx-submission-help">{node.ayuda}</span>}
        {influencesLater && (
          <span className="sx-use-notice">
            <Star size={16} aria-hidden="true" />
            <span>{reflectionCopy.useNotice}</span>
          </span>
        )}
        {spec.tipo === 'texto' && (
          <textarea
            className="sx-submission-textarea"
            value={text}
            placeholder={node.placeholder}
            maxLength={spec.maxCaracteres}
            onChange={(event) => {
              setText(event.target.value)
              updateJourney((current) => ({
                ...current,
                drafts: { ...current.drafts, [draftKey]: event.target.value },
              }))
            }}
          />
        )}
      </label>
      {spec.tipo === 'texto' && (
        <p className="sx-submission-help">
          {text.trim().length} / {spec.maxCaracteres ?? '∞'} caracteres · mínimo {spec.minCaracteres ?? 1}
        </p>
      )}
      {spec.tipo === 'opcion' && (
        <fieldset className="sx-submission-options">
          <legend className="sr-only">Elige tu respuesta</legend>
          {spec.opciones.map((option) => (
            <label
              className={`sx-submission-option ${selection.includes(option) ? 'is-selected' : ''}`}
              key={option}
            >
              <input
                type={spec.multiple ? 'checkbox' : 'radio'}
                name={node.id}
                checked={selection.includes(option)}
                onChange={() =>
                  setSelection(
                    spec.multiple
                      ? selection.includes(option)
                        ? selection.filter((value) => value !== option)
                        : [...selection, option]
                      : [option],
                  )
                }
              />
              {option}
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions">
        <button type="submit" className="sx-primary-button" disabled={busy}>
          {busy ? 'Guardando…' : existing ? 'Guardar nueva versión' : 'Guardar y continuar'}
          <Check size={18} />
        </button>
        {existing && onKeep && (
          <button type="button" className="sx-secondary-button" onClick={onKeep}>
            Mantener esta respuesta y continuar
          </button>
        )}
      </div>
    </form>
  )
}
