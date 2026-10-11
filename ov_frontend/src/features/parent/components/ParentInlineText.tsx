

export function ParentInlineText({ text }: { text: string }) {
  return text
    .split(/\*\*(.*?)\*\*/g)
    .map((fragment, index) => (index % 2 ? <strong key={index}>{fragment}</strong> : fragment))
}
