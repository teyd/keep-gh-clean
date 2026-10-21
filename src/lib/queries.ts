import { graphql, rest, GitHubError } from './github'

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
export async function fetchRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = []
  let after: string | null = null
  do {
    const data: RepoListResponse = await graphql<RepoListResponse>(token, REPO_LIST, { after })
    const page = data.viewer.repositories
    for (const node of page.nodes) {
      if (node && node.viewerPermission === 'ADMIN') repos.push(toRepo(node))
    }
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

export async function fetchRepoDetail(token: string, owner: string, name: string): Promise<RepoDetail> {
  const { repository: r } = await graphql<RepoDetailResponse>(token, REPO_DETAIL, { owner, name })
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

export async function fetchContributors(token: string, fullName: string): Promise<Contributor[]> {
  try {
    const { data } = await rest<
      { login: string; avatar_url: string; html_url: string; contributions: number }[] | null
    >(token, `/repos/${fullName}/contributors?per_page=10`)
    return (data ?? []).map((c) => ({
      login: c.login,
      avatar: c.avatar_url,
      url: c.html_url,
      contributions: c.contributions,
    }))
  } catch (err) {
    // GitHub refuses to compute contributors for very large repositories.
    if (err instanceof GitHubError && err.status === 403) return []
    throw err
  }
}

export async function setVisibility(token: string, fullName: string, visibility: Visibility) {
  await rest(token, `/repos/${fullName}`, {
    method: 'PATCH',
    body: { visibility: visibility.toLowerCase() },
  })
}

export async function setArchived(token: string, fullName: string, archived: boolean) {
  await rest(token, `/repos/${fullName}`, { method: 'PATCH', body: { archived } })
}

export async function deleteRepo(token: string, fullName: string) {
  await rest(token, `/repos/${fullName}`, { method: 'DELETE' })
}
