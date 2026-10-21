import { useEffect, useRef } from 'react'
import type { Repo } from '../lib/queries'
import type { Sort, SortKey } from '../lib/filter'
import { formatCount, formatSize, fullDate, relativeTime } from '../lib/format'

export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'zinc' | 'amber' | 'green' }) {
  const tones = {
    zinc: 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400',
    amber: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400',
    green: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400',
  }
  return (
    <span className={`inline-block rounded-full border px-2 py-px text-xs whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === sortKey
  return (
    <th
      className={`px-3 py-2 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}
    >
      <button onClick={() => onSort(sortKey)} className="hover:text-zinc-900 dark:hover:text-zinc-100">
        {label}
        <span className={active ? '' : 'invisible'}>{sort.desc ? ' ↓' : ' ↑'}</span>
      </button>
    </th>
  )
}

function DateCell({ iso }: { iso: string | null }) {
  return (
    <td className="px-3 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400" title={fullDate(iso)}>
      {relativeTime(iso)}
    </td>
  )
}

export function RepoTable({
  repos,
  sort,
  onSort,
  renderActions,
  onOpen,
  selected,
  onToggle,
  onToggleAll,
}: {
  repos: Repo[]
  sort: Sort
  onSort: (key: SortKey) => void
  renderActions: (repo: Repo) => React.ReactNode
  onOpen: (repo: Repo) => void
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (checked: boolean) => void
}) {
  const header = { sort, onSort }
  const selectedCount = repos.filter((r) => selected.has(r.id)).length
  const allRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedCount > 0 && selectedCount < repos.length
  }, [selectedCount, repos.length])

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
          <tr>
            <th className="w-8 py-2 pl-3">
              <input
                ref={allRef}
                type="checkbox"
                aria-label="Select all"
                checked={repos.length > 0 && selectedCount === repos.length}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <SortHeader label="Repository" sortKey="name" {...header} />
            <SortHeader label="Visibility" sortKey="visibility" {...header} />
            <SortHeader label="Language" sortKey="language" {...header} />
            <SortHeader label="Stars" sortKey="stars" align="right" {...header} />
            <SortHeader label="Forks" sortKey="forks" align="right" {...header} />
            <SortHeader label="Size" sortKey="sizeKb" align="right" {...header} />
            <SortHeader label="Created" sortKey="createdAt" {...header} />
            <SortHeader label="Last push" sortKey="pushedAt" {...header} />
            <SortHeader label="Updated" sortKey="updatedAt" {...header} />
            <th className="px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {repos.map((repo) => (
            <tr
              key={repo.id}
              onClick={() => onOpen(repo)}
              className={`cursor-pointer ${
                selected.has(repo.id) ? 'bg-sky-50 dark:bg-sky-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              } ${repo.archived ? 'text-zinc-500' : ''}`}
            >
              <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Select ${repo.fullName}`}
                  checked={selected.has(repo.id)}
                  onChange={() => onToggle(repo.id)}
                />
              </td>
              <td className="max-w-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <img src={repo.ownerAvatar} alt="" className="size-5 rounded-full" />
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="truncate font-medium hover:underline"
                  >
                    <span className="text-zinc-500">{repo.owner}/</span>
                    {repo.name}
                  </a>
                  {repo.archived && <Badge tone="amber">Archived</Badge>}
                  {repo.fork && <Badge>{repo.parent ? `Fork of ${repo.parent}` : 'Fork'}</Badge>}
                  {repo.template && <Badge>Template</Badge>}
                </div>
                {repo.description && (
                  <p className="mt-0.5 truncate text-zinc-500" title={repo.description}>
                    {repo.description}
                  </p>
                )}
              </td>
              <td className="px-3 py-2">
                <Badge tone={repo.visibility === 'PUBLIC' ? 'green' : 'zinc'}>
                  {repo.visibility.toLowerCase()}
                </Badge>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {repo.language ? (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: repo.languageColor ?? '#999' }} />
                    {repo.language}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(repo.stars)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(repo.forks)}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatSize(repo.sizeKb)}</td>
              <DateCell iso={repo.createdAt} />
              <DateCell iso={repo.pushedAt} />
              <DateCell iso={repo.updatedAt} />
              <td className="px-3 py-2">{renderActions(repo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {repos.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No repositories match.</p>}
    </div>
  )
}
