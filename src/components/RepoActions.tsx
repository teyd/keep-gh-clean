import type { RepoAction } from '../hooks/useRepos'
import type { Repo } from '../lib/queries'
import { useSession } from '../lib/session'

const button =
  'rounded px-2 py-1 text-xs whitespace-nowrap hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800'

export function RepoActions({
  repo,
  onAction,
}: {
  repo: Repo
  onAction: (repo: Repo, action: RepoAction) => void
}) {
  const { can } = useSession()
  // Internal (enterprise) repos go to private; the toggle is otherwise public ⇄ private.
  const nextVisibility = repo.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'

  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        className={button}
        disabled={!can.privateRepos}
        title={can.privateRepos ? undefined : 'Needs the repo scope'}
        onClick={() => onAction(repo, { type: 'visibility', visibility: nextVisibility })}
      >
        Make {nextVisibility.toLowerCase()}
      </button>
      <button
        className={button}
        disabled={!can.admin}
        onClick={() => onAction(repo, { type: 'archive', archived: !repo.archived })}
      >
        {repo.archived ? 'Unarchive' : 'Archive'}
      </button>
      <button
        className={`${button} text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}
        disabled={!can.delete}
        title={can.delete ? undefined : 'Needs the delete_repo scope'}
        onClick={() => onAction(repo, { type: 'delete' })}
      >
        Delete
      </button>
    </div>
  )
}
