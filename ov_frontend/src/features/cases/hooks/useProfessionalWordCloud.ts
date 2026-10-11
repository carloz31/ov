import { useState } from 'react'
import { forestFireWordCloud } from '@/data/content/forestFireCase'
import { occupationCatalog } from '@/data/catalog/occupations'
export function useProfessionalWordCloud(selectedProfessionalId: string) {
  const [openProfessionalId, setOpenProfessionalId] = useState<string>()
  const cloudEntries = forestFireWordCloud.some((entry) => entry.occupationId === selectedProfessionalId)
    ? forestFireWordCloud
    : [...forestFireWordCloud, { occupationId: selectedProfessionalId, mentions: 0, comments: [] }]
  const selectedEntry = cloudEntries.find((entry) => entry.occupationId === openProfessionalId)
  const selectedProfessional = occupationCatalog.find((occupation) => occupation.id === openProfessionalId)
  const cloudColors = [
    'text-[#ff9a72]',
    'text-[#a9a2ff]',
    'text-[#61c7a5]',
    'text-[#78b9ef]',
    'text-[#f1c05c]',
  ]

  return {
    openProfessionalId,
    setOpenProfessionalId,
    cloudEntries,
    selectedEntry,
    selectedProfessional,
    cloudColors,
  }
}
