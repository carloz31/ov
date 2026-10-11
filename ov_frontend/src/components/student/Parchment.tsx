import type { ComponentPropsWithoutRef } from 'react'
export function Parchment({
  title,
  label,
  children,
  className = '',
  ...props
}: ComponentPropsWithoutRef<'section'> & {
  title?: string
  label?: string
}) {
  return (
    <section {...props} className={`sx-d-parchment ${className}`}>
      {label && <p className="sx-d-eyebrow">{label}</p>}
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}
