export function PlayerAmbient({ mode, imageUrl }: { mode: 'night' | 'sunrise'; imageUrl?: string }) {
  return (
    <div className="sx-player-ambient" aria-hidden="true">
      {imageUrl && (
        <div className="sx-ambient-image" style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }} />
      )}
      <div className="sx-ambient__night" data-active={mode === 'night'} />
      <div className="sx-ambient__sunrise" data-active={mode === 'sunrise'} />
    </div>
  )
}
