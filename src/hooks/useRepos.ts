import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitHub } from '../lib/github'
import { useSession } from '../lib/session'
import {
  deleteRepo,
  fetchContributors,
  fetchRepoDetail,
  fetchRepos,
  setArchived,
  setVisibility,
  type Repo,
  type Visibility,
} from '../lib/queries'

export function reposKey(login: string) {
  return ['repos', login] as const
}

export function useRepos() {
  const { gh, viewer } = useSession()
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null)
  const query = useQuery({
    queryKey: reposKey(viewer.login),
    queryFn: async () => {
      setProgress(null)
      return fetchRepos(gh, (loaded, total) => setProgress({ loaded, total }))
    },
    staleTime: 5 * 60_000,
  })
  return { ...query, progress }
}

export function useRepoDetail(repo: Repo) {
  const { gh } = useSession()
  return useQuery({
    queryKey: ['repo-detail', repo.fullName, repo.pushedAt],
    queryFn: () => fetchRepoDetail(gh, repo.owner, repo.name),
  })
}

export function useContributors(repo: Repo) {
  const { gh } = useSession()
  return useQuery({
    queryKey: ['contributors', repo.fullName, repo.pushedAt],
    queryFn: () => fetchContributors(gh, repo),
  })
}

export type RepoAction =
  | { type: 'visibility'; visibility: Visibility }
  | { type: 'archive'; archived: boolean }
  | { type: 'delete' }

export function runAction(gh: GitHub, repo: Repo, action: RepoAction) {
  switch (action.type) {
    case 'visibility':
      return setVisibility(gh, repo, action.visibility)
    case 'archive':
      return setArchived(gh, repo, action.archived)
    case 'delete':
      return deleteRepo(gh, repo)
  }
}

function applyAction(repos: Repo[], id: string, action: RepoAction): Repo[] {
  if (action.type === 'delete') return repos.filter((r) => r.id !== id)
  return repos.map((r) => {
    if (r.id !== id) return r
    return action.type === 'visibility'
      ? { ...r, visibility: action.visibility }
      : { ...r, archived: action.archived }
  })
}

/**
 * Applies an action to the cached list immediately and rolls that single repo
 * back if the request fails, so concurrent bulk actions don't clobber each other.
 */
export function useRepoAction() {
  const { gh, viewer } = useSession()
  const queryClient = useQueryClient()
  const key = reposKey(viewer.login)

  return useMutation({
    mutationFn: ({ repo, action }: { repo: Repo; action: RepoAction }) =>
      runAction(gh, repo, action),
    onMutate: async ({ repo, action }) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<Repo[]>(key, (repos) => repos && applyAction(repos, repo.id, action))
    },
    onError: (_err, { repo, action }) => {
      queryClient.setQueryData<Repo[]>(key, (repos) => {
        if (!repos) return repos
        if (action.type === 'delete')
          return repos.some((r) => r.id === repo.id) ? repos : [...repos, repo]
        return repos.map((r) => (r.id === repo.id ? repo : r))
      })
    },
  })
}
