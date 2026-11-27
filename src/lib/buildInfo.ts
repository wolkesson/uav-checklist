/** Text for the version label: just the version on production, plus branch and commit on previews. */
export function versionLabel(version: string, branch: string, commit: string): string {
  const production = !branch || branch === 'main' || /^v\d/.test(branch)
  return production ? `v${version}` : [`v${version}`, branch, commit].filter(Boolean).join(' · ')
}

export const appVersionLabel = () => versionLabel(__APP_VERSION__, __APP_BRANCH__, __APP_COMMIT__)
