import { useCallback, useMemo, useState } from 'react'
import { useBulkActions } from '../hooks/useBulkActions'
import { useRepoActions } from '../hooks/useRepoActions'
import { useRepos } from '../hooks/useRepos'
import { DEFAULT_FILTERS, defaultDesc, filterRepos, sortRepos, type Sort, type SortKey } from '../lib/filter'
import { BulkBar, BulkResultBanner } from './BulkBar'
import { Filters } from './Filters'
import { RepoActions } from './RepoActions'
import { RepoDetail } from './RepoDetail'
import { RepoTable } from './RepoTable'

export function Dashboard() {
  const { data: repos, isPending, error, refetch, isFetching } = useRepos()
  const { perform, dialog } = useRepoActions()
  const bulk = useBulkActions()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState<Sort>({ key: 'pushedAt', desc: true })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  // Looked up from the live list so the drawer reflects actions and closes when the repo is deleted.
  const openRepo = repos?.find((r) => r.id === openId)
  const closeDetail = useCallback(() => setOpenId(null), [])

  const owners = useMemo(() => [...new Set(repos?.map((r) => r.owner))].sort(), [repos])
  const languages = useMemo(
    () => [...new Set(repos?.flatMap((r) => (r.language ? [r.language] : [])))].sort(),
    [repos],
  )
  const visible = useMemo(
    () => sortRepos(filterRepos(repos ?? [], filters), sort),
    [repos, filters, sort],
  )
  // Bulk actions only touch selected repos that are currently visible, so a filter can't hide what you act on.
  const selected = useMemo(() => visible.filter((r) => selectedIds.has(r.id)), [visible, selectedIds])

  function onSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: defaultDesc(key) }))
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visible.map((r) => r.id)) : new Set())
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

      <BulkBar
        selected={selected}
        progress={bulk.progress}
        onAction={async (action) => {
          if (await bulk.runBulk(selected, action)) setSelectedIds(new Set())
        }}
        onClear={() => setSelectedIds(new Set())}
      />
      {bulk.result && <BulkResultBanner result={bulk.result} onDismiss={bulk.clearResult} />}

      <RepoTable
        repos={visible}
        sort={sort}
        onSort={onSort}
        renderActions={(repo) => <RepoActions repo={repo} onAction={perform} />}
        onOpen={(repo) => setOpenId(repo.id)}
        selected={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
      />
      {openRepo && <RepoDetail repo={openRepo} onClose={closeDetail} onAction={perform} />}
      {dialog}
      {bulk.dialog}
    </div>
  )
}
