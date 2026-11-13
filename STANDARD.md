# The habze standard: commits and versioning

This is the whole standard. Its version is habze's own version (the GitHub Releases and
`CHANGELOG.md`, both written by release-please): a breaking change to these rules is a new
major, `v2`.

## 1. Commit messages: Conventional Commits

The header of every commit on the default branch is a
[Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[(scope)][!]: <description>

[body]

[footers, e.g. BREAKING CHANGE: ..., Closes #12]
```

- English only: no Cyrillic anywhere in the header.
- The header is at most 100 characters; the description is short and imperative ("add", not
  "added").
- The scope is optional: a module, project or area, e.g. `fix(api): ...`.
- There is no `hotfix` type. A hotfix is an ordinary `fix` PR.

| Type | Use it for | Release |
| --- | --- | --- |
| `feat` | a new user-visible capability | minor |
| `fix` | a bug fix, including security fixes and `fix(deps)` runtime dependency updates | patch |
| `perf` | a performance improvement | patch |
| `docs` | documentation only | none |
| `style` | formatting, no code change | none |
| `refactor` | code change that neither fixes a bug nor adds a feature | none |
| `test` | tests only | none |
| `build` | build system, SDK, packaging | none |
| `ci` | CI configuration and workflows | none |
| `chore` | maintenance: tooling, dev/test/CI dependency updates (`chore(deps)`) | none |
| `revert` | reverts an earlier commit: `revert: <original header>` | none |
| any type with `!`, or a `BREAKING CHANGE:` footer | an incompatible change | major |

While a project is still `0.x`, a breaking change bumps the minor version, not the major
(release-please `bump-minor-pre-major: true`). Releasing `1.0.0` is a deliberate decision.

### Picking the type from the issue label

Agents writing a PR title take the type from the issue's label:

| Issue label | PR type |
| --- | --- |
| `type:feature` | `feat` |
| `type:bug`, `type:security` | `fix` |
| `type:docs` | `docs` |
| `type:qa` | `test` |
| `type:tech-debt` | `refactor` |
| `type:infra` | `ci` (workflows), `build` (build/SDK/packaging) or `chore` (anything else) |
| `type:research` | `docs` if it leaves a written result, otherwise `chore` |

The label is guidance; the change itself decides. A `type:tech-debt` issue whose fix changes
behaviour users see is a `fix`; anything incompatible gets `!`.

## 2. Pull requests: squash merge, the title is the commit

- **Squash merge only.** The squash commit title is the PR title, so **the PR title is what must
  be conventional**. A required check (`pr-title / check`, habze's reusable `pr-title.yml`)
  enforces it. Commits inside a branch are free-form.
- One PR, one change: a PR that needs two types is two PRs.
- Breaking changes say so in the title (`feat!: ...`) and explain the migration in the PR body.

Repository settings (applied by the adopt skill, only after the owner agrees):

| Setting | Value |
| --- | --- |
| Allow merge commits / rebase merging | off |
| Allow squash merging | on, default commit title = **pull request title**, message = PR description |
| Automatically delete head branches | on |
| Allow auto-merge | on (Renovate uses it) |
| Actions → "Allow GitHub Actions to create and approve pull requests" | on (release-please) |
| Default branch protection / ruleset | requires `pr-title / check` plus the project's CI checks |

## 3. Versioning: SemVer, owned by release-please

- Versions are [SemVer](https://semver.org/) `X.Y.Z`; tags are `vX.Y.Z`.
- [release-please](https://github.com/googleapis/release-please) (habze's reusable
  `release.yml`) keeps a **Release PR** open with the next version and the CHANGELOG, computed
  from the Conventional Commits since the last release. Merging it tags the release and publishes
  the GitHub Release. Nobody bumps versions or edits `CHANGELOG.md` by hand.
- History before adoption is ignored: `bootstrap-sha` in `release-please-config.json` is the
  commit the standard was adopted at, and `.release-please-manifest.json` holds the starting
  version.
- **Required checks on the Release PR.** A PR opened with `GITHUB_TOKEN` triggers no
  `pull_request` workflows, so its required checks would never run. habze's `release.yml`
  therefore starts the project's checks itself with `workflow_dispatch` on the release branch
  (input `dispatch-workflows`, default `ci.yml pr-title.yml`). Every workflow that provides a
  required check needs a `workflow_dispatch:` trigger.
  - Fallback, not implemented: run release-please with a GitHub App installation token
    (`actions/create-github-app-token`) instead of `GITHUB_TOKEN`; PRs it opens trigger
    `pull_request` normally. It costs an App plus two secrets per repository (or organisation),
    and `release.yml` would need a `token` secret input. Switch only if dispatching stops working.

### One source of the version

| Stack | Source | release-please |
| --- | --- | --- |
| .NET | `<Version>` in `Directory.Build.props` at the solution root | `release-type: simple` + `extra-files` xml updater, xpath `/Project/PropertyGroup/Version` |
| Node | `version` in `package.json` | `release-type: node` (also updates `package-lock.json`) |

- `simple` would also update a `version.txt`, but only if one exists (release-please does not
  create it); habze does not add one. The manifest and `Directory.Build.props` are both updated
  in the same Release PR, so they cannot drift.
- If `Directory.Build.props` declares the MSBuild XML namespace, use the xpath
  `//*[local-name()='Version']` instead.
- Show the full build version in UI, CLI `--version` output and startup logs. The .NET SDK
  already appends `+<commit sha>` to `InformationalVersion`; print that, not `AssemblyVersion`.
  For Node, inject `package.json`'s version at build time (e.g. Vite `define`) plus the commit
  SHA from CI.

## 4. Dependency updates: Renovate

Projects extend habze's preset (`renovate/default.json`) and install the Renovate GitHub App.

- Based on `config:recommended`, with semantic commits: runtime dependencies are `fix(deps)` (they
  ship, so they release a patch); dev, test and CI dependencies are `chore(deps)`. For NuGet,
  packages of `*.Tests` projects, test/analyzer packages and GitHub Actions are `chore`.
- Grouping: one PR for non-major GitHub Actions, one for non-major npm devDependencies, plus
  Renovate's recommended monorepo groups.
- **Automerge everything except majors**, through GitHub auto-merge with squash, once the required
  checks pass. **Packages still at `0.x` never automerge.** Majors always wait for a human.
- habze itself is a dependency: `@v1` → `@v2` of its workflows and preset is a major update, so it
  arrives as a PR to review, never automerged.

## 5. habze's own version

`v1` is a floating tag that always points at the newest `1.x.y` release. Compatible changes to
these rules, the workflows or the preset are `1.x` and reach every project on its next run.
Incompatible ones ship as `v2`; Renovate then opens a PR in each project.
