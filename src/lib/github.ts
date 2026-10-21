import { Octokit } from '@octokit/core'
import { GraphqlResponseError } from '@octokit/graphql'
import { RequestError } from '@octokit/request-error'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

export { RequestError }

const GitHubOctokit = Octokit.plugin(throttling, retry)
export type GitHub = InstanceType<typeof GitHubOctokit>

export type RateLimit = { resource: string; limit: number; remaining: number; reset: number }

type Headers = Record<string, string | number | undefined>
type Listener = () => void
const rateLimits = new Map<string, RateLimit>()
let rateSnapshot: RateLimit[] = []
const listeners = new Set<Listener>()

export const rateLimitStore = {
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => rateSnapshot,
}

function trackRateLimit(headers: Headers | undefined) {
  const remaining = headers?.['x-ratelimit-remaining']
  if (!headers || remaining === undefined) return
  const resource = String(headers['x-ratelimit-resource'] ?? 'core')
  rateLimits.set(resource, {
    resource,
    remaining: Number(remaining),
    limit: Number(headers['x-ratelimit-limit']),
    reset: Number(headers['x-ratelimit-reset']) * 1000,
  })
  rateSnapshot = [...rateLimits.values()]
  listeners.forEach((l) => l())
}

function friendlyMessage(error: RequestError): string {
  const headers = error.response?.headers
  if (error.status === 401) return 'Token is invalid or expired.'
  if (
    (error.status === 403 || error.status === 429) &&
    headers?.['x-ratelimit-remaining'] === '0'
  ) {
    const reset = new Date(Number(headers['x-ratelimit-reset']) * 1000)
    return `Rate limit exceeded. Resets at ${reset.toLocaleTimeString()}.`
  }
  const body = error.response?.data as { message?: string } | undefined
  return body?.message ?? error.message
}

export function createClient(token: string): GitHub {
  const octokit = new GitHubOctokit({
    auth: token,
    throttle: {
      // Primary limit: waiting for the hourly reset is worse than failing with a clear message.
      onRateLimit: (retryAfter, _options, _octokit, retryCount) =>
        retryCount < 1 && retryAfter <= 60,
      // Secondary limit: GitHub asks us to slow down, typically during bulk writes.
      onSecondaryRateLimit: (_retryAfter, _options, _octokit, retryCount) => retryCount < 3,
    },
  })
  octokit.hook.after('request', (response) => trackRateLimit(response.headers))
  octokit.hook.error('request', (error) => {
    if (error instanceof RequestError) {
      trackRateLimit(error.response?.headers)
      error.message = friendlyMessage(error)
    }
    throw error
  })
  return octokit
}

/** Runs a GraphQL query, returning partial data when only some fields failed (e.g. SAML-protected orgs). */
export async function graphql<T>(
  gh: GitHub,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  try {
    return await gh.graphql<T>(query, variables)
  } catch (error) {
    if (error instanceof GraphqlResponseError && error.data) return error.data as T
    throw error
  }
}
