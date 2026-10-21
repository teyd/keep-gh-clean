import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useContributors, useRepoDetail, type RepoAction } from '../hooks/useRepos'
import type { Repo } from '../lib/queries'
import { formatCount, formatSize, fullDate, relativeTime } from '../lib/format'
import { Badge } from './RepoTable'
import { RepoActions } from './RepoActions'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

const muted = 'text-sm text-zinc-500'

function Commits({ repo }: { repo: Repo }) {
  const { data, isPending, error } = useRepoDetail(repo)
  if (isPending) return <p className={muted}>Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error.message}</p>
  if (data.commits.length === 0) return <p className={muted}>No commits yet.</p>
  return (
    <ul className="space-y-2">
      {data.commits.map((c) => (
        <li key={c.oid} className="flex items-start gap-2 text-sm">
          {c.avatar ? (
            <img src={c.avatar} alt="" className="mt-0.5 size-5 rounded-full" />
          ) : (
            <span className="mt-0.5 size-5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          )}
          <div className="min-w-0">
            <a href={c.url} target="_blank" rel="noreferrer" className="block truncate hover:underline">
              {c.message}
            </a>
            <p className="text-xs text-zinc-500" title={fullDate(c.date)}>
              {c.login ?? c.author ?? 'unknown'} · {relativeTime(c.date)} ·{' '}
              <code>{c.oid.slice(0, 7)}</code>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Contributors({ repo }: { repo: Repo }) {
  const { data, isPending, error } = useContributors(repo)
  if (isPending) return <p className={muted}>Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error.message}</p>
  if (data.length === 0) return <p className={muted}>No contributor data.</p>
  return (
    <ul className="grid grid-cols-2 gap-2">
      {data.map((c) => (
        <li key={c.login}>
          <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
            <img src={c.avatar} alt="" className="size-5 rounded-full" />
            <span className="truncate">{c.login}</span>
            <span className="ml-auto text-xs text-zinc-500 tabular-nums">{formatCount(c.contributions)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Overview({ repo }: { repo: Repo }) {
  const { data } = useRepoDetail(repo)
  const loading = <span className="text-zinc-400">…</span>
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Field label="Created">{fullDate(repo.createdAt)}</Field>
      <Field label="Last push">{fullDate(repo.pushedAt)}</Field>
      <Field label="Updated">{fullDate(repo.updatedAt)}</Field>
      <Field label="Default branch">{repo.defaultBranch ?? '—'}</Field>
      <Field label="Commits">{data ? (data.commitCount?.toLocaleString() ?? '—') : loading}</Field>
      <Field label="Size">{formatSize(repo.sizeKb)}</Field>
      <Field label="Stars · Forks · Watchers">
        {formatCount(repo.stars)} · {formatCount(repo.forks)} · {data ? formatCount(data.watchers) : loading}
      </Field>
      <Field label="Open issues · PRs">
        {data ? `${formatCount(data.openIssues)} · ${formatCount(data.openPullRequests)}` : loading}
      </Field>
      <Field label="License">{data ? (data.license ?? 'None') : loading}</Field>
      <Field label="Homepage">
        {data?.homepage ? (
          <a href={data.homepage} target="_blank" rel="noreferrer" className="break-all underline">
            {data.homepage}
          </a>
        ) : data ? (
          '—'
        ) : (
          loading
        )}
      </Field>
      {data && data.topics.length > 0 && (
        <div className="col-span-2 flex flex-wrap gap-1">
          {data.topics.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </dl>
  )
}

export function RepoDetail({
  repo,
  onClose,
  onAction,
}: {
  repo: Repo
  onClose: () => void
  onAction: (repo: Repo, action: RepoAction) => void
}) {
  useEffect(() => {
    // Leave Escape to a confirm dialog opened on top of the drawer.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal out of the page layout so parent spacing utilities can't offset the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={repo.fullName}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <header className="sticky top-0 space-y-2 border-b border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-2">
            <img src={repo.ownerAvatar} alt="" className="mt-1 size-6 rounded-full" />
            <a href={repo.url} target="_blank" rel="noreferrer" className="flex-1 text-lg font-semibold break-all hover:underline">
              {repo.fullName}
            </a>
            <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-700">
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge tone={repo.visibility === 'PUBLIC' ? 'green' : 'zinc'}>{repo.visibility.toLowerCase()}</Badge>
            {repo.archived && <Badge tone="amber">Archived</Badge>}
            {repo.fork && <Badge>{repo.parent ? `Fork of ${repo.parent}` : 'Fork'}</Badge>}
            {repo.template && <Badge>Template</Badge>}
            {repo.language && <Badge>{repo.language}</Badge>}
          </div>
          {repo.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{repo.description}</p>}
          <RepoActions repo={repo} onAction={onAction} />
        </header>
        <div className="space-y-6 p-5">
          <Overview repo={repo} />
          <Section title="Recent commits">
            <Commits repo={repo} />
          </Section>
          <Section title="Top contributors">
            <Contributors repo={repo} />
          </Section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
