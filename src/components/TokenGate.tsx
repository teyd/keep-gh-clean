import { useState } from 'react'
import { ENV } from 'varlock/env'
import { TOKEN_URL, verifyToken, type Session } from '../lib/token'

export function TokenGate({
  onSession,
  initialError,
}: {
  onSession: (session: Session, remember: boolean) => void
  initialError?: string | null
}) {
  const [token, setToken] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSession(await verifyToken(token.trim()), remember)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-lg px-6">
      <h1 className="text-3xl font-semibold tracking-tight">keep-gh-clean</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        See all your GitHub repositories in one table, and archive, delete or change their
        visibility in one click.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">GitHub personal access token</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember on this device
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={!token.trim() || busy}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>

      <div className="mt-8 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="font-medium underline">
            Create a classic token
          </a>{' '}
          with the <code>repo</code>, <code>delete_repo</code> and <code>read:org</code> scopes
          preselected. Leave out <code>delete_repo</code> if you don't want deleting to be possible.
        </p>
        <p>
          Your token stays in this browser and is only sent to <code>api.github.com</code>. There is
          no server and no analytics. Without “remember”, it's cleared when you close the tab.
        </p>
        <p>
          <a href={ENV.SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
            View the source code
          </a>
        </p>
      </div>
    </div>
  )
}
