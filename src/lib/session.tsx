import { createContext, useContext } from 'react'
import { capabilities, type Capabilities, type Session } from './token'

type SessionValue = Session & { can: Capabilities; signOut: () => void }

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({
  session,
  signOut,
  children,
}: {
  session: Session
  signOut: () => void
  children: React.ReactNode
}) {
  const value = { ...session, can: capabilities(session.scopes), signOut }
  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
