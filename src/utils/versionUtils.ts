import packageJson from '../../package.json'

export const APP_VERSION = packageJson.version

/**
 * 比较远端 Tag 版本号与当前本地版本号，判断是否有新版本
 */
export function isNewerVersion(remoteVersion: string, localVersion: string = APP_VERSION): boolean {
  if (!remoteVersion || remoteVersion === 'latest') return false

  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)

  const remoteParts = parse(remoteVersion)
  const localParts = parse(localVersion)

  const maxLength = Math.max(remoteParts.length, localParts.length)
  for (let i = 0; i < maxLength; i++) {
    const r = remoteParts[i] ?? 0
    const l = localParts[i] ?? 0
    if (r > l) return true
    if (r < l) return false
  }

  return false
}
