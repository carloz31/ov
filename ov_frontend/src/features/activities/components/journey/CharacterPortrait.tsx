export function CharacterPortrait({ id, expression }: { id: string; expression?: string }) {
  const thoughtful = expression === 'dudoso' || expression === 'pensativo'
  const smiling = ['sonrie', 'contento', 'animado'].includes(expression ?? '')
  if (id === 'companero')
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path d="m40 9 10 20 21 11-21 10-10 21-10-21L9 40l21-11Z" fill="#c7a65a" />
        <circle cx="40" cy="40" r="17" fill="#fff0b6" />
        <circle cx="34" cy="38" r="2" fill="#6b623a" />
        <circle cx="46" cy="38" r="2" fill="#6b623a" />
        <path
          d={thoughtful ? 'M37 47h7' : 'M35 45q5 6 10 0'}
          fill="none"
          stroke="#6b623a"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  const hair = id === 'mara' ? '#775342' : id === 'aurelio' ? '#ddd7bf' : '#414f48'
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path
        d="M7 80q3-25 33-25t33 25"
        fill={id === 'mara' ? '#647f62' : id === 'aurelio' ? '#ae8057' : '#5a8586'}
      />
      <path d="M19 42V29Q19 6 41 10q23 1 22 25v26H17Z" fill={hair} />
      <rect x="33" y="48" width="15" height="17" rx="5" fill="#cf9b77" />
      <ellipse cx="40" cy="35" rx="20" ry="24" fill="#e7bc94" />
      <path d="M20 32Q12 8 40 9q27-1 23 22-16-3-24-16-5 14-19 17" fill={hair} />
      <path
        d={thoughtful ? 'm27 29 9-3m9 2 8 3' : 'M27 28h8m10 0h8'}
        stroke="#70513c"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="31" cy="35" r="2" fill="#4d4739" />
      <circle cx="49" cy="35" r="2" fill="#4d4739" />
      {id === 'aurelio' && <path d="M21 44q4 19 19 18 17-2 20-19-5 9-20 7-13 2-19-6" fill={hair} />}
      <path
        d={smiling ? 'M33 45q7 9 14 0' : thoughtful ? 'm35 48 11-2' : 'M35 46q5 3 10 0'}
        stroke="#976d55"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
