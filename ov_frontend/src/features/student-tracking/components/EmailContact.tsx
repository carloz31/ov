import { Mail } from 'lucide-react'

export function EmailContact({ email }: { email?: string }) {
  return email ? (
    <a
      href={`mailto:${email}`}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Mail className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{email}</span>
    </a>
  ) : (
    <p className="text-sm text-muted-foreground">Sin correo registrado</p>
  )
}
