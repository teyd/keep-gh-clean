import { useConfirm, type ConfirmOptions } from '../components/ConfirmDialog'
import { useToast } from '../components/Toasts'
import type { Repo } from '../lib/queries'
import { useRepoAction, type RepoAction } from './useRepos'

export function describe(action: RepoAction): string {
  switch (action.type) {
    case 'visibility':
      return `made ${action.visibility.toLowerCase()}`
    case 'archive':
      return action.archived ? 'archived' : 'unarchived'
    case 'delete':
      return 'deleted'
  }
}

export function verb(action: RepoAction): string {
  switch (action.type) {
    case 'visibility':
      return `make ${action.visibility.toLowerCase()}`
    case 'archive':
      return action.archived ? 'archive' : 'unarchive'
    case 'delete':
      return 'delete'
  }
}

function inverse(repo: Repo, action: RepoAction): RepoAction | null {
  switch (action.type) {
    case 'visibility':
      return { type: 'visibility', visibility: repo.visibility }
    case 'archive':
      return { type: 'archive', archived: !action.archived }
    case 'delete':
      return null
  }
}

/** The confirmation an action needs before it runs, or null if it's safe to do in one click. */
export function confirmationFor(repos: Repo[], action: RepoAction): ConfirmOptions | null {
  const one = repos.length === 1 ? repos[0] : null
  const subject = one ? one.fullName : `${repos.length} repositories`

  if (action.type === 'delete') {
    return {
      title: `Delete ${subject}?`,
      body: (
        <p>
          This permanently deletes {one ? 'the repository' : 'these repositories'}, including all
          code, issues, pull requests and wikis. It cannot be undone.
        </p>
      ),
      confirmLabel: 'Delete permanently',
      danger: true,
      typeToConfirm: one ? one.fullName : `delete ${repos.length} repos`,
    }
  }

  if (action.type === 'visibility' && action.visibility === 'PUBLIC') {
    return {
      title: `Make ${subject} public?`,
      body: (
        <p>
          Anyone on the internet will be able to see the code and its full commit history. Check for
          secrets in the history first.
        </p>
      ),
      confirmLabel: 'Make public',
    }
  }

  if (action.type === 'visibility' && action.visibility === 'PRIVATE') {
    const losing = repos.filter((r) => r.visibility === 'PUBLIC' && (r.stars > 0 || r.forks > 0))
    if (losing.length === 0) return null
    return {
      title: `Make ${subject} private?`,
      body: (
        <p>
          GitHub permanently erases stars and watchers and detaches public forks when a public
          repository becomes private. Undo won't bring them back.
          {!one && ` ${losing.length} of the selected repos have stars or forks.`}
        </p>
      ),
      confirmLabel: 'Make private',
      danger: true,
    }
  }

  return null
}

export function useRepoActions() {
  const mutation = useRepoAction()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()

  async function run(repo: Repo, action: RepoAction, { undoable = true } = {}) {
    try {
      await mutation.mutateAsync({ repo, action })
      const undo = undoable ? inverse(repo, action) : null
      toast({
        message: `${repo.fullName} ${describe(action)}.`,
        action: undo
          ? { label: 'Undo', onClick: () => run(repo, undo, { undoable: false }) }
          : undefined,
      })
    } catch (err) {
      toast({
        tone: 'error',
        message: `Couldn't ${verb(action)} ${repo.fullName}: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  async function perform(repo: Repo, action: RepoAction) {
    const options = confirmationFor([repo], action)
    if (options && !(await confirm(options))) return
    await run(repo, action)
  }

  return { perform, confirm, dialog }
}
