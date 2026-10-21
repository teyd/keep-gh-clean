import { createContext, useCallback, useContext, useState } from 'react'

type Toast = {
  id: number
  message: string
  tone: 'info' | 'error'
  action?: { label: string; onClick: () => void }
}

type ToastInput = Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (input: ToastInput) => {
      const toast = { tone: 'info' as const, ...input, id: nextId++ }
      setToasts((t) => [...t.slice(-4), toast])
      setTimeout(() => dismiss(toast.id), toast.tone === 'error' ? 10_000 : 6_000)
    },
    [dismiss],
  )

  return (
    <ToastContext value={push}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.tone === 'error'
                ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
                : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
            }`}
          >
            <p className="flex-1">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
                className="font-medium underline"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-zinc-400 hover:text-zinc-600">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error('useToast must be used inside ToastProvider')
  return push
}
