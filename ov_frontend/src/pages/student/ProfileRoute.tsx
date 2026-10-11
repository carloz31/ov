import { useSearchParams } from 'react-router'
import { StudentPassportView } from '@/features/discovery/components/StudentPassportView'
import { StudentProfileView } from '@/pages/student/StudentProfileView'
export function ProfileRoute() {
  const [params] = useSearchParams()
  return params.get('section') === 'passport' ? <StudentPassportView /> : <StudentProfileView />
}
