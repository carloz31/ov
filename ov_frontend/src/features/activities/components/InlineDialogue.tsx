import { CharacterAvatar } from '@/components/student/CharacterAvatar'

export function InlineDialogue({
  speakerId,
  text,
  light = false,
}: {
  speakerId: string
  text: string
  light?: boolean
}) {
  return (
    <div className={`sx-inline-dialogue ${light ? 'sx-glass' : 'sx-glass-dark'}`}>
      <CharacterAvatar id={speakerId} size="sm" />
      <p>{text}</p>
    </div>
  )
}
