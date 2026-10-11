export function HighlightedQuestion({ text, quote }: { text: string; quote?: string }) {
  if (!quote || !text.includes(`«${quote}»`)) return <>{text}</>
  const [before, after] = text.split(`«${quote}»`)
  return (
    <>
      {before}
      <mark>«{quote}»</mark>
      {after}
    </>
  )
}
