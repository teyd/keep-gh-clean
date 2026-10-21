import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  const { token, viewer } = useSession()
  return useQuery({
    queryKey: reposKey(viewer.login),
    queryFn: () => fetchRepos(token),
    staleTime: 5 * 60_000,
  })
}

export function useRepoDetail(repo: Repo) {
  const { token } = useSession()
  return useQuery({
    queryKey: ['repo-detail', repo.fullName, repo.pushedAt],
    queryFn: () => fetchRepoDetail(token, repo.owner, repo.name),
  })
}

export function useContributors(repo: Repo) {
  const { token } = useSession()
  return useQuery({
    queryKey: ['contributors', repo.fullName, repo.pushedAt],
    queryFn: () => fetchContributors(token, repo.fullName),
  })
}

export type RepoAction =
  | { type: 'visibility'; visibility: Visibility }
  | { type: 'archive'; archived: boolean }
  | { type: 'delete' }

export function runAction(token: string, repo: Repo, action: RepoAction) {
  switch (action.type) {
    case 'visibility':
      return setVisibility(token, repo.fullName, action.visibility)
    case 'archive':
      return setArchived(token, repo.fullName, action.archived)
    case 'delete':
      return deleteRepo(token, repo.fullName)
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
  const { token, viewer } = useSession()
  const queryClient = useQueryClient()
  const key = reposKey(viewer.login)

  return useMutation({
    mutationFn: ({ repo, action }: { repo: Repo; action: RepoAction }) =>
      runAction(token, repo, action),
    onMutate: async ({ repo, action }) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<Repo[]>(key, (repos) => repos && applyAction(repos, repo.id, action))
    },
    onError: (_err, { repo, action }) => {
      queryClient.setQueryData<Repo[]>(key, (repos) => {
        if (!repos) return repos
        if (action.type === 'delete') return repos.some((r) => r.id === repo.id) ? repos : [...repos, repo]
        return repos.map((r) => (r.id === repo.id ? repo : r))
      })
    },
  })
}
