const API = 'https://api.github.com'

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export type RateLimit = { resource: string; limit: number; remaining: number; reset: number }

type Listener = () => void
const rateLimits = new Map<string, RateLimit>()
let rateSnapshot: RateLimit[] = []
const listeners = new Set<Listener>()

export const rateLimitStore = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => rateSnapshot,
}

function trackRateLimit(res: Response) {
  const remaining = res.headers.get('x-ratelimit-remaining')
  if (remaining === null) return
  const resource = res.headers.get('x-ratelimit-resource') ?? 'core'
  rateLimits.set(resource, {
    resource,
    remaining: Number(remaining),
    limit: Number(res.headers.get('x-ratelimit-limit')),
    reset: Number(res.headers.get('x-ratelimit-reset')) * 1000,
  })
  rateSnapshot = [...rateLimits.values()]
  listeners.forEach((l) => l())
}

async function errorFrom(res: Response): Promise<GitHubError> {
  let message = `${res.status} ${res.statusText}`
  try {
    const body = await res.json()
    if (body?.message) message = body.message
  } catch {
    // non-JSON error body
  }
  if (res.status === 401) message = 'Token is invalid or expired.'
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000)
    message = `Rate limit exceeded. Resets at ${reset.toLocaleTimeString()}.`
  }
  return new GitHubError(res.status, message)
}

export async function rest<T = unknown>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  trackRateLimit(res)
  if (!res.ok) throw await errorFrom(res)
  const data = (res.status === 204 ? null : await res.json()) as T
  return { data, headers: res.headers }
}

export async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  trackRateLimit(res)
  if (!res.ok) throw await errorFrom(res)
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (body.errors?.length && !body.data) {
    throw new GitHubError(200, body.errors.map((e) => e.message).join('; '))
  }
  return body.data as T
}
