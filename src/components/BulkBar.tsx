import { applicable, type BulkProgress, type BulkResult } from '../hooks/useBulkActions'
import { describe } from '../hooks/useRepoActions'
import type { RepoAction } from '../hooks/useRepos'
import type { Repo } from '../lib/queries'
import { useSession } from '../lib/session'

const button =
  'rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800'

export function BulkBar({
  selected,
  progress,
  onAction,
  onClear,
}: {
  selected: Repo[]
  progress: BulkProgress | null
  onAction: (action: RepoAction) => void
  onClear: () => void
}) {
  const { can } = useSession()

  if (progress) {
    const pct = Math.round((progress.done / progress.total) * 100)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="whitespace-nowrap">
          Working… {progress.done}/{progress.total}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  if (selected.length === 0) return null

  const actions: { label: string; action: RepoAction; enabled: boolean; danger?: boolean }[] = [
    { label: 'Make private', action: { type: 'visibility', visibility: 'PRIVATE' }, enabled: can.privateRepos },
    { label: 'Make public', action: { type: 'visibility', visibility: 'PUBLIC' }, enabled: can.privateRepos },
    { label: 'Archive', action: { type: 'archive', archived: true }, enabled: can.admin },
    { label: 'Unarchive', action: { type: 'archive', archived: false }, enabled: can.admin },
    { label: 'Delete', action: { type: 'delete' }, enabled: can.delete, danger: true },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="mr-2 text-sm font-medium">{selected.length} selected</span>
      {actions.map(({ label, action, enabled, danger }) => {
        const count = applicable(selected, action).length
        return (
          <button
            key={label}
            disabled={!enabled || count === 0}
            title={count === 0 ? `All selected repos are already ${describe(action).replace(/^made /, '')}` : undefined}
            onClick={() => onAction(action)}
            className={`${button} ${danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950' : ''}`}
          >
            {label}
            {count !== selected.length && count > 0 && <span className="ml-1 text-zinc-500">({count})</span>}
          </button>
        )
      })}
      <button onClick={onClear} className="ml-auto text-sm text-zinc-500 underline">
        Clear selection
      </button>
    </div>
  )
}

export function BulkResultBanner({ result, onDismiss }: { result: BulkResult; onDismiss: () => void }) {
  const ok = result.failed.length === 0
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        ok
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p>
          {result.succeeded} {result.succeeded === 1 ? 'repo' : 'repos'} {describe(result.action)}
          {!ok && `, ${result.failed.length} failed`}.
        </p>
        <button onClick={onDismiss} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
          ✕
        </button>
      </div>
      {!ok && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {result.failed.map(({ repo, message }) => (
            <li key={repo.id}>
              <span className="font-medium">{repo.fullName}</span>: {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
