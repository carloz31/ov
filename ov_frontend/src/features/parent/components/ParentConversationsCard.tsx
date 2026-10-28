import type { ReactNode } from 'react'
import { ArrowRight, CircleAlert, Gift, LockKeyhole, Mail, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { CardIcon } from '@/components/ui/Status'
import { appPaths } from '@/routes/paths'
import type { EstadoConversaciones } from '../lib/inicio'

// Ajuste inicio-apoderado (boceto C): «Conversaciones con {hijo}», del hijo elegido. Un estado por vez, leído
// del servidor; con error no se muestran datos de demostración.
export function ParentConversationsCard({
  nombre,
  estado,
  onReintentar,
}: {
  nombre: string
  estado: EstadoConversaciones
  onReintentar: () => void
}) {
  const titulo = `Conversaciones con ${nombre}`
  if (estado.tipo === 'cargando')
    return (
      <Card className="parent-home-card" aria-busy="true" aria-label={titulo}>
        <div className="parent-home-card-head">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="parent-home-card-action h-12 w-48" />
      </Card>
    )
  if (estado.tipo === 'bloqueada')
    return (
      <Tarjeta icono={<CardIcon icon={MessageCircle} className="rounded-xl" />} titulo={titulo}>
        <p className="flex items-start gap-2 text-muted-foreground">
          <LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {estado.mensaje}
        </p>
        <Accion enlace={appPaths.parent.conversations} texto="Ver conversaciones" />
      </Tarjeta>
    )
  if (estado.tipo === 'carta')
    return (
      <Tarjeta icono={<CardIcon icon={Mail} className="rounded-xl" />} titulo={titulo}>
        <p className="text-muted-foreground">Antes de conversar, escríbele una carta a {nombre}.</p>
        <Accion enlace={appPaths.parent.conversationLetter} texto="Escribir mi carta" principal />
      </Tarjeta>
    )
  if (estado.tipo === 'completas')
    return (
      <Tarjeta
        icono={<CardIcon icon={Gift} className="rounded-xl bg-success-soft text-success-text" />}
        titulo={titulo}
        insignia={
          <Badge variant="success" className="ml-auto">
            {estado.total} de {estado.total}
          </Badge>
        }
      >
        <p className="text-muted-foreground">Conversaron sobre todo. Hay un regalo esperándolos.</p>
        <Accion enlace={appPaths.parent.conversationGift} texto="Abrir el regalo" principal />
      </Tarjeta>
    )
  if (estado.tipo === 'error')
    return (
      <Tarjeta icono={<CardIcon icon={CircleAlert} className="rounded-xl bg-danger-soft text-danger-text" />} titulo={titulo}>
        <p role="alert" className="text-muted-foreground">
          No pudimos cargar las conversaciones. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <div className="parent-home-card-action">
          <Button type="button" variant="outline" className="min-h-12 px-6" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      </Tarjeta>
    )
  const teToca = estado.tipo === 'te_toca'
  return (
    <Tarjeta
      icono={<CardIcon icon={MessageCircle} className="rounded-xl" />}
      titulo={titulo}
      insignia={
        teToca && (
          <Badge variant="outline" className="parent-home-aviso ml-auto">
            {nombre} te espera en {estado.esperan}
          </Badge>
        )
      }
    >
      <div className="space-y-2">
        <Progress
          value={estado.total ? (estado.completadas / estado.total) * 100 : 0}
          aria-label="Avance de las conversaciones"
        />
        <p className="text-sm text-muted-foreground">
          {estado.completadas} de {estado.total} conversaciones{teToca ? '' : ` · ahora le toca a ${nombre}`}
        </p>
      </div>
      <Accion
        enlace={appPaths.parent.conversations}
        texto={teToca ? 'Seguir conversando' : 'Ver conversaciones'}
        principal={teToca}
      />
    </Tarjeta>
  )
}

function Tarjeta({
  icono,
  titulo,
  insignia,
  children,
}: {
  icono: ReactNode
  titulo: string
  insignia?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="parent-home-card">
      <div className="parent-home-card-head">
        {icono}
        <h2 className="text-lg font-bold">{titulo}</h2>
        {insignia}
      </div>
      {children}
    </Card>
  )
}

function Accion({ enlace, texto, principal = false }: { enlace: string; texto: string; principal?: boolean }) {
  return (
    <div className="parent-home-card-action">
      <Button asChild variant={principal ? 'default' : 'outline'} className="min-h-12 px-6">
        <Link to={enlace}>
          {texto}
          {principal && <ArrowRight className="shrink-0" aria-hidden="true" />}
        </Link>
      </Button>
    </div>
  )
}
