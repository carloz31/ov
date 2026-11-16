import { Fragment } from 'react'
import { conDichos } from '@/components/common/ConDichos'

export function ParentInlineText({ text }: { text: string }) {
  return text
    .split(/\*\*(.*?)\*\*/g)
    .map((fragment, index) =>
      index % 2 ? <strong key={index}>{conDichos(fragment)}</strong> : <Fragment key={index}>{conDichos(fragment)}</Fragment>,
    )
}
