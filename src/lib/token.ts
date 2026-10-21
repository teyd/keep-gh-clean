import { rest } from './github'

const KEY = 'keep-gh-clean:token'

export const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,delete_repo,read:org&description=keep-gh-clean'

export function loadToken(): string | null {
  return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY)
}

export function saveToken(token: string, remember: boolean) {
  clearToken()
  ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(KEY)
  localStorage.removeItem(KEY)
}

export type Viewer = { login: string; avatar_url: string; html_url: string; name: string | null }

/**
 * `scopes` is null for fine-grained tokens, which don't report scopes; in that
 * case we allow every action and let the API reject what isn't permitted.
 */
export type Session = { token: string; viewer: Viewer; scopes: string[] | null }

export async function verifyToken(token: string): Promise<Session> {
  const { data, headers } = await rest<Viewer>(token, '/user')
  const header = headers.get('x-oauth-scopes')
  const scopes = header === null ? null : header.split(',').map((s) => s.trim()).filter(Boolean)
  return { token, viewer: data, scopes }
}

export type Capabilities = { privateRepos: boolean; admin: boolean; delete: boolean; orgs: boolean }

export function capabilities(scopes: string[] | null): Capabilities {
  if (scopes === null) return { privateRepos: true, admin: true, delete: true, orgs: true }
  const has = (s: string) => scopes.includes(s)
  return {
    privateRepos: has('repo'),
    admin: has('repo') || has('public_repo'),
    delete: has('delete_repo'),
    orgs: has('read:org') || has('admin:org') || has('write:org'),
  }
}
