import { useStudentProfile } from '@/features/discovery/hooks/useStudentProfile'
import { Eye } from 'lucide-react'
import { useSeccionesAcceso } from '@/features/adventure/hooks/useSeccionesAcceso'
import { useStudentOverlays } from '@/features/adventure/context/overlayContext'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { ProfileHeader } from '@/features/discovery/components/ProfileHeader'
import { ProfileAchievements } from '@/features/discovery/components/ProfileAchievements'
import { ProfileHelena } from '@/features/discovery/components/ProfileHelena'
import { ProfilePlans } from '@/features/discovery/components/ProfilePlans'

export function StudentProfileView() {
  const perfil = useStudentProfile()
  const planes = useSeccionesAcceso()('PLANES')
  const { openGuide } = useStudentOverlays()
  return (
    <DiscoveryStage ambient="profile">
      <ProfileHeader
        nombre={perfil.nombre}
        iniciales={perfil.iniciales}
        level={perfil.level}
        tramos={perfil.tramos}
        requeridas={perfil.requeridas}
        vitrina={perfil.visibleBadges}
      />
      <div className="sx-d-columns">
        <ProfileAchievements sellos={perfil.sellos} obtenidas={perfil.badges.length} siguiente={perfil.siguiente} />
        <ProfileHelena destacada={perfil.destacada} pages={perfil.pages} />
        <ProfilePlans
          plans={perfil.plans}
          favoritos={perfil.favoritos}
          bloqueo={planes.bloqueada ? planes.mensaje : undefined}
          onBloqueado={planes.pasos ? () => openGuide(planes.pasos!) : undefined}
        />
      </div>
      <p className="sx-d-privacy">
        <Eye aria-hidden="true" />
        Tus compañeros solo ven tu título y los sellos de tu vitrina. Lo demás lo ven tú y tu orientadora.
      </p>
    </DiscoveryStage>
  )
}
