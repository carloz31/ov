import { Navigate, useParams } from 'react-router'
import { parentChildren } from '@/features/parent/data/parentPortal'
import { parentHomeUrl, selectedFamilyChild } from '@/features/parent/lib/selectors'

function ParentChildrenView() {
  const { childId } = useParams()
  const child = selectedFamilyChild(parentChildren, childId ?? null)
  return <Navigate replace to={child ? parentHomeUrl(child.id) : '/parent/overview'} />
}
export { ParentChildrenView }
