import { useMemo, useState } from 'react'
import { useRepos } from '../hooks/useRepos'
import { DEFAULT_FILTERS, defaultDesc, filterRepos, sortRepos, type Sort, type SortKey } from '../lib/filter'
import { Filters } from './Filters'
import { RepoTable } from './RepoTable'

export function Dashboard() {
  const { data: repos, isPending, error, refetch, isFetching } = useRepos()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState<Sort>({ key: 'pushedAt', desc: true })

  const owners = useMemo(() => [...new Set(repos?.map((r) => r.owner))].sort(), [repos])
  const languages = useMemo(
    () => [...new Set(repos?.flatMap((r) => (r.language ? [r.language] : [])))].sort(),
    [repos],
  )
  const visible = useMemo(
    () => sortRepos(filterRepos(repos ?? [], filters), sort),
    [repos, filters, sort],
  )

  function onSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: defaultDesc(key) }))
  }

  if (isPending) return <p className="py-12 text-center text-sm text-zinc-500">Loading repositories…</p>
  if (error) {
    return (
      <div className="py-12 text-center text-sm">
        <p className="text-red-600">{error.message}</p>
        <button onClick={() => refetch()} className="mt-2 underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters filters={filters} onChange={setFilters} owners={owners} languages={languages} />
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>
            {visible.length === repos.length ? repos.length : `${visible.length} of ${repos.length}`} repos
          </span>
          <button onClick={() => refetch()} disabled={isFetching} className="underline disabled:opacity-50">
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <RepoTable repos={visible} sort={sort} onSort={onSort} />
    </div>
  )
}
