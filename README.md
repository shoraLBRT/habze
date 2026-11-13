# habze

One standard, and the shared CI that enforces it, for **commit conventions and versioning**
across my projects (mostly .NET solutions, one Vite/TypeScript app).

The rules are in [STANDARD.md](STANDARD.md): Conventional Commits, squash merge with the PR title
as the commit, SemVer computed by release-please, dependency updates by Renovate.

## How projects use it

1. **As live references, like a library.** A project calls habze's reusable workflows and extends
   its Renovate preset at the floating tag `v1`:

   ```yaml
   jobs:
     pr-title:
       uses: shoraLBRT/habze/.github/workflows/pr-title.yml@v1
   ```

   ```json
   { "extends": ["github>shoraLBRT/habze//renovate/default#v1"] }
   ```

   | What | File | Does |
   | --- | --- | --- |
   | Reusable workflow | [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) | checks the PR title is a Conventional Commit |
   | Reusable workflow | [`.github/workflows/release.yml`](.github/workflows/release.yml) | release-please: Release PR, tag, GitHub Release; runs the required checks on the Release PR |
   | Renovate preset | [`renovate/default.json`](renovate/default.json) | semantic dependency PRs; automerge except majors and 0.x |

2. **As copied files.** The small per-project files (the two caller workflows, `renovate.json`,
   `release-please-config.json`, `.release-please-manifest.json`, a `Directory.Build.props`
   snippet) live in [`templates/dotnet/`](templates/dotnet) and [`templates/node/`](templates/node).

## Adopting it in a repository

Use the Claude Code skill [`skills/adopt-versioning`](skills/adopt-versioning/SKILL.md) ("adopt
habze in this repo"). It detects the stack, sets the single version source and the starting
version, copies the templates, opens a PR, and changes repository settings only after asking.

For Claude Code itself: paste [`claude/CLAUDE-section.md`](claude/CLAUDE-section.md) into
`~/.claude/CLAUDE.md`, and install the commit-message hook from [`claude/hooks/`](claude/hooks).

## What `@v1` means and how updates arrive

- `v1` always points at the newest `1.x.y` release of habze. A compatible change (new option,
  fix, clearer rule) is released as `1.x`, and every project picks it up on its next workflow run
  or Renovate run, with no PR.
- A breaking change is released as `2.0.0` with a new tag `v2`. Renovate opens a PR in each
  project to move `@v1` → `@v2` (workflows and preset); it is a major update, so it is never
  automerged. Read habze's release notes before merging it.

habze versions itself with the same tools: its own PR-title check, release-please, and a job
that moves `v1` to every new release.
