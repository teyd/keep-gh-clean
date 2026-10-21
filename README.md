# keep-gh-clean

See all your GitHub repositories in one table, then change visibility, archive or delete them in one click or in bulk.

**→ [teyd.github.io/keep-gh-clean](https://teyd.github.io/keep-gh-clean/)**

<img width="3200" height="2680" alt="keep-gh-clean-detail" src="https://github.com/user-attachments/assets/ec8b9c6b-8344-4a08-9ce4-72d7ae7b7f19" />
<img width="3200" height="2680" alt="keep-gh-clean-table" src="https://github.com/user-attachments/assets/a15a5362-de4d-4bb2-a6a5-ffae2eb7f41e" />

## Features

- Your repos plus org repos you admin, with search, filters and sorting on every column
- Detail drawer with commits, contributors, topics, license, issues and PRs
- One-click public ⇄ private and archive ⇄ unarchive with undo; delete asks you to type the name
- Bulk actions with progress and a per-repo failure summary

## Privacy

There is no backend. Your token stays in your browser and is only sent to `api.github.com`, which is the only host the Content-Security-Policy allows. There is no analytics.

## Token

[Create a classic token](https://github.com/settings/tokens/new?scopes=repo,delete_repo,read:org&description=keep-gh-clean) with `repo`, `read:org` and, if you want deleting, `delete_repo`. Fine-grained tokens work too (Administration: read and write), but only cover one owner each.

## Tech stack

- [React 19](https://react.dev) and [TypeScript 7](https://www.typescriptlang.org)
- [Vite+](https://viteplus.dev): Vite with [Rolldown](https://rolldown.rs), [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- [Tailwind CSS 4](https://tailwindcss.com)
- [TanStack Query](https://tanstack.com/query) for data fetching and optimistic updates
- [Octokit](https://github.com/octokit/core.js) with the throttling and retry plugins, for GitHub's REST and GraphQL APIs
- [varlock](https://varlock.dev) for build config, [mise](https://mise.jdx.dev) and [pnpm](https://pnpm.io) for tooling
- GitHub Pages and Actions for hosting, [Renovate](https://docs.renovatebot.com) for dependency updates

## Development

```sh
mise install    # Node 24 + pnpm 12
pnpm install
pnpm dev        # dev server
pnpm check      # format, lint and type-check
pnpm build      # production build in dist/
```

Build settings (`BASE_PATH`, `SOURCE_URL`) are defined in [`.env.schema`](.env.schema) and can be overridden in `.env.local`.

Pushes to `main` deploy to GitHub Pages. Renovate opens dependency updates every Monday and merges minor and patch updates on its own once CI passes.

---

<sub>This project, including its code and docs, was written by an AI coding agent (Claude) under human direction.</sub>
