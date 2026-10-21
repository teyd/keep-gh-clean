import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TokenGate } from './components/TokenGate'
import { SessionProvider } from './lib/session'
import { clearToken, loadToken, saveToken, verifyToken, type Session } from './lib/token'

export default function App() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [restoring, setRestoring] = useState(() => loadToken() !== null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    const stored = loadToken()
    if (!stored) return
    verifyToken(stored)
      .then(setSession)
      .catch((err) => {
        clearToken()
        setRestoreError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setRestoring(false))
  }, [])

  function signOut() {
    clearToken()
    queryClient.clear()
    setSession(null)
  }

  if (restoring) return <p className="p-6 text-sm text-zinc-500">Loading…</p>

  if (!session) {
    return (
      <TokenGate
        initialError={restoreError}
        onSession={(s, remember) => {
          saveToken(s.token, remember)
          setSession(s)
        }}
      />
    )
  }

  return (
    <SessionProvider session={session} signOut={signOut}>
      <main className="mx-auto max-w-7xl p-6">
        <p>Signed in as {session.viewer.login}</p>
      </main>
    </SessionProvider>
  )
}
