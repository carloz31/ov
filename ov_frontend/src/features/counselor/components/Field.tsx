import { Input } from '@/components/ui/Input'

export function Field({
  defaultValue,
  disabled,
  label,
  placeholder,
}: {
  defaultValue?: string
  disabled?: boolean
  label: string
  placeholder?: string
}) {
  const id = label.toLowerCase().replaceAll(' ', '-')
  return (
    <label className="space-y-2 text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      <Input defaultValue={defaultValue} disabled={disabled} id={id} placeholder={placeholder} />
    </label>
  )
}
