<!-- markdownlint-disable-file MD041 -- a section to paste into ~/.claude/CLAUDE.md -->
## Commits, PR titles and versions (habze standard)

Projects follow [habze](https://github.com/shoraLBRT/habze/blob/main/STANDARD.md). In short:

- **The PR title is the commit.** PRs are squash-merged and the squash commit title is the PR
  title, so the PR title must be a Conventional Commit: `<type>[(scope)][!]: <description>`.
  A required check (`pr-title / check`) rejects anything else.
- **English only**, no Cyrillic, header at most 100 characters, imperative description
  ("add", not "added").
- **Types:** `feat` (minor), `fix` / `perf` (patch), `docs style refactor test build ci chore
  revert` (no release). Breaking change: `!` after the type/scope or a `BREAKING CHANGE:` footer.
  There is no `hotfix` type: a hotfix is a `fix`.
- **Take the type from the issue label:** `type:feature`→`feat`, `type:bug`/`type:security`→`fix`,
  `type:docs`→`docs`, `type:qa`→`test`, `type:tech-debt`→`refactor`, `type:infra`→`ci`/`build`/
  `chore`, `type:research`→`docs`/`chore`. If the change itself says otherwise (a behaviour change
  is a `fix`, anything incompatible needs `!`), the change wins.
- Branch commits are free-form, but write them conventionally too; one PR, one type of change.
- **Never hand-edit versions or `CHANGELOG.md`.** release-please owns `<Version>` in
  `Directory.Build.props`, `version` in `package.json`, `.release-please-manifest.json` and the
  CHANGELOG; they change only through its Release PR. Never merge the Release PR unless asked.
- Dependency PRs from Renovate are already conventional (`fix(deps)` / `chore(deps)`); leave them
  to automerge unless they fail.
- To bring a repository onto the standard, use the `adopt-versioning` skill.
