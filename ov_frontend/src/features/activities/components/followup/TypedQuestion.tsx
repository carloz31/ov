import { InlineDialogue } from '@/features/activities/components/InlineDialogue'
import { useTypewriter } from '@/hooks/useTypewriter'
export function TypedQuestion({ text }: { text: string }) {
  const { visible } = useTypewriter(text)
  return (
    <div>
      <div aria-hidden="true">
        <InlineDialogue speakerId="companero" text={visible} light />
      </div>
      <p className="sr-only">Lumi: {text}</p>
    </div>
  )
}
