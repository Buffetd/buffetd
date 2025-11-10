export function isStale(expires_at: string | null | undefined): boolean {
  if (!expires_at) return false
  return Date.now() >= Date.parse(expires_at)
}
