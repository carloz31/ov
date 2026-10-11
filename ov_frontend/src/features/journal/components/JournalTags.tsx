export function JournalTags({ tags }: { tags: string[] }) {
  return (
    <div className="sx-j-tags">
      {tags.map((tag) => (
        <span key={tag}>#{tag}</span>
      ))}
    </div>
  )
}
