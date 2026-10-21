import { useEffect, useRef, useState } from 'react'

export type ConfirmOptions = {
  title: string
  body: React.ReactNode
  confirmLabel: string
  danger?: boolean
  /** When set, the user must type this exact text to enable the confirm button. */
  typeToConfirm?: string
}

export function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions | null
  onClose: (confirmed: boolean) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (options && !dialog.open) {
      setTyped('')
      dialog.showModal()
    } else if (!options && dialog.open) {
      dialog.close()
    }
  }, [options])

  const ready = !options?.typeToConfirm || typed === options.typeToConfirm

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose(false)
      }}
      className="m-auto w-full max-w-md rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {options && (
        <form
          method="dialog"
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) onClose(true)
          }}
        >
          <h2 className="text-lg font-semibold">{options.title}</h2>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{options.body}</div>
          {options.typeToConfirm && (
            <label className="block text-sm">
              Type{' '}
              <code className="rounded bg-zinc-100 px-1 font-semibold dark:bg-zinc-800">
                {options.typeToConfirm}
              </code>{' '}
              to confirm
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              autoFocus={!options.typeToConfirm}
              disabled={!ready}
              className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${
                options.danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900'
              }`}
            >
              {options.confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}

/** Promise-based wrapper: `if (await confirm({...})) doIt()`. */
export function useConfirm() {
  const [state, setState] = useState<{
    options: ConfirmOptions
    resolve: (ok: boolean) => void
  } | null>(null)

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setState({ options, resolve }))

  const dialog = (
    <ConfirmDialog
      options={state?.options ?? null}
      onClose={(ok) => {
        state?.resolve(ok)
        setState(null)
      }}
    />
  )

  return { confirm, dialog }
}
