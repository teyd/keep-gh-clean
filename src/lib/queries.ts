import { graphql, RequestError, type GitHub } from './github'

export type Visibility = 'PUBLIC' | 'PRIVATE' | 'INTERNAL'

export type Repo = {
  id: string
  name: string
  owner: string
  ownerAvatar: string
  fullName: string
  url: string
  description: string | null
  visibility: Visibility
  archived: boolean
  fork: boolean
  parent: string | null
  template: boolean
  stars: number
  forks: number
  language: string | null
  languageColor: string | null
  sizeKb: number
  createdAt: string
  pushedAt: string | null
  updatedAt: string
  defaultBranch: string | null
}

const REPO_LIST = /* GraphQL */ `
  query Repos($after: String) {
    viewer {
      repositories(
        first: 100
        after: $after
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          name
          nameWithOwner
          url
          description
          visibility
          isArchived
          isFork
          isTemplate
          stargazerCount
          forkCount
          diskUsage
          createdAt
          pushedAt
          updatedAt
          viewerPermission
          owner { login avatarUrl }
          parent { nameWithOwner }
          primaryLanguage { name color }
          defaultBranchRef { name }
        }
      }
    }
  }
`

type RepoNode = {
  id: string
  name: string
  nameWithOwner: string
  url: string
  description: string | null
  visibility: Visibility
  isArchived: boolean
  isFork: boolean
  isTemplate: boolean
  stargazerCount: number
  forkCount: number
  diskUsage: number | null
  createdAt: string
  pushedAt: string | null
  updatedAt: string
  viewerPermission: string | null
  owner: { login: string; avatarUrl: string }
  parent: { nameWithOwner: string } | null
  primaryLanguage: { name: string; color: string | null } | null
  defaultBranchRef: { name: string } | null
}

type RepoListResponse = {
  viewer: {
    repositories: {
      totalCount: number
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: (RepoNode | null)[]
    }
  }
}

function toRepo(n: RepoNode): Repo {
  return {
    id: n.id,
    name: n.name,
    owner: n.owner.login,
    ownerAvatar: n.owner.avatarUrl,
    fullName: n.nameWithOwner,
    url: n.url,
    description: n.description,
    visibility: n.visibility,
    archived: n.isArchived,
    fork: n.isFork,
    parent: n.parent?.nameWithOwner ?? null,
    template: n.isTemplate,
    stars: n.stargazerCount,
    forks: n.forkCount,
    language: n.primaryLanguage?.name ?? null,
    languageColor: n.primaryLanguage?.color ?? null,
    sizeKb: n.diskUsage ?? 0,
    createdAt: n.createdAt,
    pushedAt: n.pushedAt,
    updatedAt: n.updatedAt,
    defaultBranch: n.defaultBranchRef?.name ?? null,
  }
}

/** Every repo the viewer can administer: their own, plus org repos where they're an admin. */
export async function fetchRepos(
  gh: GitHub,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Repo[]> {
  const repos: Repo[] = []
  let loaded = 0
  let after: string | null = null
  do {
    const data: RepoListResponse = await graphql<RepoListResponse>(gh, REPO_LIST, { after })
    const page = data.viewer.repositories
    for (const node of page.nodes) {
      if (node && node.viewerPermission === 'ADMIN') repos.push(toRepo(node))
    }
    loaded += page.nodes.length
    onProgress?.(loaded, page.totalCount)
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (after)
  return repos
}

export type Commit = {
  oid: string
  message: string
  date: string
  url: string
  author: string | null
  login: string | null
  avatar: string | null
}

export type RepoDetail = {
  commitCount: number | null
  commits: Commit[]
  topics: string[]
  openIssues: number
  openPullRequests: number
  watchers: number
  license: string | null
  homepage: string | null
}

const REPO_DETAIL = /* GraphQL */ `
  query RepoDetail($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      homepageUrl
      licenseInfo { spdxId name }
      watchers { totalCount }
      issues(states: OPEN) { totalCount }
      pullRequests(states: OPEN) { totalCount }
      repositoryTopics(first: 20) { nodes { topic { name } } }
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 5) {
              totalCount
              nodes {
                oid
                messageHeadline
                committedDate
                url
                author { name user { login avatarUrl } }
              }
            }
          }
        }
      }
    }
  }
`

type RepoDetailResponse = {
  repository: {
    homepageUrl: string | null
    licenseInfo: { spdxId: string | null; name: string } | null
    watchers: { totalCount: number }
    issues: { totalCount: number }
    pullRequests: { totalCount: number }
    repositoryTopics: { nodes: { topic: { name: string } }[] }
    defaultBranchRef: {
      target: {
        history?: {
          totalCount: number
          nodes: {
            oid: string
            messageHeadline: string
            committedDate: string
            url: string
            author: { name: string | null; user: { login: string; avatarUrl: string } | null } | null
          }[]
        }
      }
    } | null
  }
}

export async function fetchRepoDetail(gh: GitHub, owner: string, name: string): Promise<RepoDetail> {
  const { repository: r } = await graphql<RepoDetailResponse>(gh, REPO_DETAIL, { owner, name })
  const history = r.defaultBranchRef?.target.history
  return {
    commitCount: history?.totalCount ?? null,
    commits: (history?.nodes ?? []).map((c) => ({
      oid: c.oid,
      message: c.messageHeadline,
      date: c.committedDate,
      url: c.url,
      author: c.author?.name ?? null,
      login: c.author?.user?.login ?? null,
      avatar: c.author?.user?.avatarUrl ?? null,
    })),
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    openIssues: r.issues.totalCount,
    openPullRequests: r.pullRequests.totalCount,
    watchers: r.watchers.totalCount,
    license: r.licenseInfo ? (r.licenseInfo.spdxId ?? r.licenseInfo.name) : null,
    homepage: r.homepageUrl || null,
  }
}

export type Contributor = { login: string; avatar: string; url: string; contributions: number }

export async function fetchContributors(gh: GitHub, repo: Repo): Promise<Contributor[]> {
  try {
    const { data } = await gh.request('GET /repos/{owner}/{repo}/contributors', {
      owner: repo.owner,
      repo: repo.name,
      per_page: 10,
    })
    // Empty repositories respond with 204 and no body.
    return (Array.isArray(data) ? data : []).flatMap((c) =>
      c.login
        ? [{ login: c.login, avatar: c.avatar_url ?? '', url: c.html_url ?? '', contributions: c.contributions }]
        : [],
    )
  } catch (err) {
    // GitHub refuses to compute contributors for very large repositories.
    if (err instanceof RequestError && err.status === 403) return []
    throw err
  }
}

export async function setVisibility(gh: GitHub, repo: Repo, visibility: Visibility) {
  await gh.request('PATCH /repos/{owner}/{repo}', {
    owner: repo.owner,
    repo: repo.name,
    visibility: visibility === 'PUBLIC' ? 'public' : 'private',
  })
}

export async function setArchived(gh: GitHub, repo: Repo, archived: boolean) {
  await gh.request('PATCH /repos/{owner}/{repo}', { owner: repo.owner, repo: repo.name, archived })
}

export async function deleteRepo(gh: GitHub, repo: Repo) {
  await gh.request('DELETE /repos/{owner}/{repo}', { owner: repo.owner, repo: repo.name })
}
