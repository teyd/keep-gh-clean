import type { Repo } from './queries'

export type TriState = 'all' | 'yes' | 'no'

export type Filters = {
  q: string
  owner: string
  visibility: 'all' | 'PUBLIC' | 'PRIVATE' | 'INTERNAL'
  archived: TriState
  fork: TriState
  language: string
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  owner: 'all',
  visibility: 'all',
  archived: 'all',
  fork: 'all',
  language: 'all',
}

export type SortKey =
  | 'name'
  | 'visibility'
  | 'language'
  | 'stars'
  | 'forks'
  | 'sizeKb'
  | 'createdAt'
  | 'pushedAt'
  | 'updatedAt'

export type Sort = { key: SortKey; desc: boolean }

const matchTri = (state: TriState, value: boolean) => state === 'all' || (state === 'yes') === value

export function filterRepos(repos: Repo[], f: Filters): Repo[] {
  const q = f.q.trim().toLowerCase()
  return repos.filter(
    (r) =>
      (!q ||
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false)) &&
      (f.owner === 'all' || r.owner === f.owner) &&
      (f.visibility === 'all' || r.visibility === f.visibility) &&
      (f.language === 'all' || (r.language ?? 'none') === f.language) &&
      matchTri(f.archived, r.archived) &&
      matchTri(f.fork, r.fork),
  )
}

function sortValue(r: Repo, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return r.fullName.toLowerCase()
    case 'language':
      return r.language?.toLowerCase() ?? '\uffff'
    case 'createdAt':
    case 'pushedAt':
    case 'updatedAt':
      return r[key] ? new Date(r[key]).getTime() : 0
    default:
      return r[key]
  }
}

export function sortRepos(repos: Repo[], { key, desc }: Sort): Repo[] {
  const dir = desc ? -1 : 1
  return [...repos].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va < vb) return -dir
    if (va > vb) return dir
    return a.fullName.localeCompare(b.fullName)
  })
}

/** Text-like columns start ascending; numbers and dates start with the largest/newest. */
export function defaultDesc(key: SortKey): boolean {
  return !['name', 'visibility', 'language'].includes(key)
}
