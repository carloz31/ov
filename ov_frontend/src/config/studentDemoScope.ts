// Temporary presentation scope. Disable this flag to restore the complete pilot.
// Access changes never rewrite stored completions, responses or optional unlocks.
export const studentDemoEnabled = true
export const studentDemoActivityIds = [
  'mission-welcome',
  'enc-mitos',
  'act-07',
  'mission-story',
  'extra-ecos',
]

export function isWithinStudentDemo(activityId: string) {
  return !studentDemoEnabled || studentDemoActivityIds.includes(activityId)
}
