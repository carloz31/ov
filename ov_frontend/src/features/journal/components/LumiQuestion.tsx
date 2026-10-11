import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
export function LumiQuestion({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="size-14 shrink-0">
        <LumiPortrait />
      </span>
      <div className="rounded-2xl rounded-tl-none border border-[#c7a65a]/25 bg-[#fff9e9] px-5 py-4">
        <p className="text-xs font-bold tracking-wide text-[#8c6b2c]">Lumi</p>
        <p className="mt-1 text-base font-medium leading-7 text-[#4b4066]">{prompt}</p>
      </div>
    </div>
  )
}
