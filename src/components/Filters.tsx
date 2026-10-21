import { DEFAULT_FILTERS, type Filters as FilterState, type TriState } from '../lib/filter'

const selectClass =
  'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: [T, string][]
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={selectClass}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

const tri: [TriState, string][] = [
  ['all', 'All'],
  ['no', 'No'],
  ['yes', 'Yes'],
]

export function Filters({
  filters,
  onChange,
  owners,
  languages,
}: {
  filters: FilterState
  onChange: (filters: FilterState) => void
  owners: string[]
  languages: string[]
}) {
  const set = <K extends keyof FilterState>(key: K) => (value: FilterState[K]) =>
    onChange({ ...filters, [key]: value })
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search name or description…"
        value={filters.q}
        onChange={(e) => set('q')(e.target.value)}
        className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {owners.length > 1 && (
        <Select
          label="Owner"
          value={filters.owner}
          onChange={set('owner')}
          options={[['all', 'All'], ...owners.map((o): [string, string] => [o, o])]}
        />
      )}
      <Select
        label="Visibility"
        value={filters.visibility}
        onChange={set('visibility')}
        options={[
          ['all', 'All'],
          ['PUBLIC', 'Public'],
          ['PRIVATE', 'Private'],
          ['INTERNAL', 'Internal'],
        ]}
      />
      <Select label="Archived" value={filters.archived} onChange={set('archived')} options={tri} />
      <Select label="Fork" value={filters.fork} onChange={set('fork')} options={tri} />
      <Select
        label="Language"
        value={filters.language}
        onChange={set('language')}
        options={[
          ['all', 'All'],
          ...languages.map((l): [string, string] => [l, l]),
          ['none', 'None'],
        ]}
      />
      {dirty && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Reset
        </button>
      )}
    </div>
  )
}
