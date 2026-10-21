import { useState } from 'react'
import { useConfirm } from '../components/ConfirmDialog'
import type { Repo } from '../lib/queries'
import { runQueue } from '../lib/queue'
import { confirmationFor, verb } from './useRepoActions'
import { useRepoAction, type RepoAction } from './useRepos'

export type BulkProgress = { action: RepoAction; total: number; done: number }
export type BulkResult = {
  action: RepoAction
  succeeded: number
  failed: { repo: Repo; message: string }[]
}

/** Repos the action would actually change; e.g. archiving skips repos that are already archived. */
export function applicable(repos: Repo[], action: RepoAction): Repo[] {
  switch (action.type) {
    case 'visibility':
      return repos.filter((r) => r.visibility !== action.visibility)
    case 'archive':
      return repos.filter((r) => r.archived !== action.archived)
    case 'delete':
      return repos
  }
}

export function useBulkActions() {
  const mutation = useRepoAction()
  const { confirm, dialog } = useConfirm()
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [result, setResult] = useState<BulkResult | null>(null)

  async function runBulk(selected: Repo[], action: RepoAction): Promise<boolean> {
    const targets = applicable(selected, action)
    if (targets.length === 0) return false

    const options = confirmationFor(targets, action) ?? {
      title: `${verb(action)[0].toUpperCase()}${verb(action).slice(1)} ${targets.length} repositories?`,
      body: (
        <p>
          {targets
            .map((r) => r.fullName)
            .slice(0, 8)
            .join(', ')}
          {targets.length > 8 && ` and ${targets.length - 8} more`}.
        </p>
      ),
      confirmLabel: 'Continue',
    }
    if (!(await confirm(options))) return false

    setResult(null)
    setProgress({ action, total: targets.length, done: 0 })
    // Octokit's throttling plugin spaces out writes, so a small pool is plenty.
    const results = await runQueue(
      targets,
      3,
      (repo) => mutation.mutateAsync({ repo, action }),
      (_r, done) => setProgress({ action, total: targets.length, done }),
    )
    setProgress(null)
    const failed = results.flatMap((r) =>
      r.ok
        ? []
        : [{ repo: r.item, message: r.error instanceof Error ? r.error.message : String(r.error) }],
    )
    setResult({ action, succeeded: results.length - failed.length, failed })
    return true
  }

  return { runBulk, progress, result, clearResult: () => setResult(null), dialog }
}
