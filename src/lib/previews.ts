/**
 * Hidden "available previews" list (tap the version label 10 times).
 * This is the app's only request to the internet: it asks GitHub for the open pull requests
 * and derives each Cloudflare preview address from the branch name (see CLAUDE.md).
 * It runs only when asked for; offline or airgapped it shows a message instead.
 */
export const REPO = 'wolkesson/uav-checklist'
export const PREVIEW_DOMAIN = 'henrik-wolkesson.workers.dev'
export const PRODUCTION_URL = `https://uav-checklist.${PREVIEW_DOMAIN}`
export const PULLS_API = `https://api.github.com/repos/${REPO}/pulls?state=open&per_page=50`

/** Cloudflare preview address for a branch: "/" and other characters become "-". */
export function previewUrl(branch: string): string {
  const label = branch.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `https://${label}-uav-checklist.${PREVIEW_DOMAIN}`
}

export interface Preview { number: number; title: string; branch: string; url: string; prUrl: string }

interface GitHubPull { number: number; title: string; html_url: string; head: { ref: string } }

export function toPreviews(pulls: GitHubPull[]): Preview[] {
  return pulls.map((p) => ({ number: p.number, title: p.title, branch: p.head.ref, url: previewUrl(p.head.ref), prUrl: p.html_url }))
}

export type PreviewResult = { ok: true; previews: Preview[] } | { ok: false; message: string }

export async function fetchPreviews(fetcher: typeof fetch = fetch): Promise<PreviewResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, message: 'No internet connection. The list of previews needs to reach GitHub.' }
  }
  try {
    const res = await fetcher(PULLS_API, { headers: { Accept: 'application/vnd.github+json' } })
    if (res.status === 403 || res.status === 429) {
      return { ok: false, message: 'GitHub limits how often this can be checked. Try again in an hour.' }
    }
    if (!res.ok) return { ok: false, message: `GitHub answered with an error (${res.status}).` }
    return { ok: true, previews: toPreviews((await res.json()) as GitHubPull[]) }
  } catch {
    return { ok: false, message: "Can't reach GitHub. The list of previews needs an internet connection." }
  }
}
