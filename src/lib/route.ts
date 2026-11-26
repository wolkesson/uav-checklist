// View <-> URL hash, so the browser Back button returns from a checklist view to the list.
export type View = { name: 'list' } | { name: 'edit' | 'run' | 'print'; id: string }

export function parseHash(hash: string): View {
  const m = /^#\/(edit|run|print)\/(.+)$/.exec(hash)
  if (!m) return { name: 'list' }
  return { name: m[1] as 'edit' | 'run' | 'print', id: decodeURIComponent(m[2]) }
}

export function formatHash(v: View): string {
  return v.name === 'list' ? '' : `#/${v.name}/${encodeURIComponent(v.id)}`
}
