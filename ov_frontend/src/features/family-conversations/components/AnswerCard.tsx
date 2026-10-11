export function AnswerCard({ label, question, text }: { label: string; question: string; text: string }) {
  return (
    <article className="min-h-48 rounded-2xl border bg-card p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <h2 className="mt-3 text-sm font-bold leading-6">{question}</h2>
      <p className="mt-4 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-7">{text}</p>
    </article>
  )
}
