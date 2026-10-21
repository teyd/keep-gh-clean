import { useSyncExternalStore } from 'react'
import { ENV } from 'varlock/env'
import { rateLimitStore } from '../lib/github'
import { useSession } from '../lib/session'

function RateLimits() {
  const limits = useSyncExternalStore(rateLimitStore.subscribe, rateLimitStore.getSnapshot)
  if (limits.length === 0) return null
  return (
    <span>
      API calls left:{' '}
      {limits
        .map((l) => `${l.resource} ${l.remaining.toLocaleString()}/${l.limit.toLocaleString()}`)
        .join(' · ')}
    </span>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { viewer, scopes, can, signOut } = useSession()
  const missing = [
    !can.privateRepos && 'private repos (repo)',
    !can.delete && 'deleting (delete_repo)',
    !can.orgs && 'org repos (read:org)',
  ].filter(Boolean)

  return (
    <div className="flex min-h-screen w-full flex-col gap-4 px-4 py-4 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">keep-gh-clean</h1>
        <div className="flex items-center gap-3 text-sm">
          <a
            href={viewer.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:underline"
          >
            <img src={viewer.avatarUrl} alt="" className="size-6 rounded-full" />
            {viewer.login}
          </a>
          <button
            onClick={signOut}
            className="text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </header>

      {scopes !== null && missing.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Your token can't do everything: missing {missing.join(', ')}. Create a new token with
          those scopes to enable them.
        </p>
      )}

      <main className="flex-1">{children}</main>

      <footer className="flex justify-between text-xs text-zinc-500">
        <RateLimits />
        <a href={ENV.SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
          Source
        </a>
      </footer>
    </div>
  )
}
