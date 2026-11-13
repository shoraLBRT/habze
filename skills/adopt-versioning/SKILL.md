---
name: adopt-versioning
description: >-
  Bring one repository onto the habze standard for commits and versioning, end to end: detect the
  stack (.NET or Node), set the single version source and the starting version, copy habze's
  templates (PR-title check, release-please, Renovate), open a PR, and change repository
  settings only after asking. Use when asked to "adopt habze", "set up
  versioning/commits in this repo", "add release-please / conventional commits / semantic
  versioning here", or "bring this project onto the standard". Never merges.
---

# Adopt habze versioning in a repository

The rules are habze's [STANDARD.md](https://github.com/shoraLBRT/habze/blob/main/STANDARD.md);
read it first. One repository, one branch, one PR. Stop and ask whenever a step below says so.

## 1. Orient

```sh
gh repo view --json nameWithOwner,defaultBranchRef --jq '.nameWithOwner + " " + .defaultBranchRef.name'
git status --short; git fetch --tags origin
```

Work from an up-to-date default branch with a clean tree. If the repo already has
`release-please-config.json`, `.github/workflows/*release*`, semantic-release, GitVersion or
MinVer, stop: tell the user what exists and ask whether to replace it.

**Stack:** `*.sln`, `*.slnx` or `*.csproj` → `dotnet`; `package.json` at the root → `node`.
Both, or neither → ask which one owns the version. Templates come from
`https://github.com/shoraLBRT/habze/tree/v1/templates/<stack>`; get them with
`gh repo clone shoraLBRT/habze <scratch dir> -- --depth 1 --branch v1`.

## 2. Choose the starting version

Look for an existing version, newest first:

```sh
git tag --list --sort=-v:refname | head -5
gh release list --limit 5
grep -rn --include='*.props' --include='*.csproj' -E '<(Version|VersionPrefix)>' .
node -p "require('./package.json').version"   # node
```

- **Found `X.Y.Z`** (a SemVer tag, release or declared version): keep it. Manifest
  `{ ".": "X.Y.Z" }`, and the version source says `X.Y.Z`. The first Release PR bumps from it.
  If the tags have no `v` prefix, add `"include-v-in-tag": false` to the package config.
- **Nothing found:** propose a first version and say why: `0.1.0` if the project has not been
  released or used for real yet (breaking changes stay cheap while `0.x`); `1.0.0` if people
  already depend on it. Wait for the user's choice. Then manifest `{ ".": "0.0.0" }`,
  `"initial-version": "<choice>"` in the package config, version source `0.0.0`; the first
  Release PR releases exactly `<choice>`.

## 3. Make the changes (branch `claude/adopt-habze`)

1. **Version source.**
   - dotnet: `<Version>` in `Directory.Build.props` at the solution root (merge the template's
     `PropertyGroup` into an existing file). Remove `Version`, `VersionPrefix`, `VersionSuffix`,
     `AssemblyVersion`, `FileVersion` and `PackageVersion` from individual `.csproj` files so the
     props file is the only source. If the props file declares an `xmlns`, change the xpath in
     `release-please-config.json` to `//*[local-name()='Version']`.
   - node: `version` in `package.json` (add it if missing).
2. **Copy the templates** to the same paths: `.github/workflows/pr-title.yml`,
   `.github/workflows/release.yml`, `renovate.json`, `release-please-config.json`,
   `.release-please-manifest.json`. Then:
   - `bootstrap-sha` = `git rev-parse origin/<default>` (history before adoption is ignored);
   - the manifest version from step 2;
   - `branches: [main]` in `release.yml` → the real default branch;
   - an existing Renovate config (`renovate.json`, `.github/renovate.json`, `renovate.json5`,
     `.renovaterc*`): add `github>shoraLBRT/habze//renovate/default#v1` to `extends`, keep the
     project's own rules, drop settings the preset already covers.
3. **CI must run on `pull_request` to the default branch** (the Release PR's checks are
   approval-required `pull_request` runs that `release.yml` approves). List the required checks
   and make sure each comes from a `pull_request`-triggered workflow:

   ```sh
   gh api repos/<owner>/<repo>/branches/<default>/protection --jq '.required_status_checks.contexts'
   gh api repos/<owner>/<repo>/rules/branches/<default>
   ```

4. **Version display (recommended, keep it small):** if the app has a `--version`, an About
   screen or a startup log line, make it show the full version (.NET `InformationalVersion`, which
   carries `+<sha>`). Otherwise mention it in the PR as a follow-up.

## 4. Verify

- Every JSON file parses: `node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"`.
- `actionlint` if available; otherwise read the workflows once more for indentation and `on:`.
- The project's own build and tests (`dotnet build` / `dotnet test`, or `npm ci && npm run build`)
  pass; for .NET check that the built assembly reports the expected version.

Never report a check that did not run.

## 5. Open the PR

Commit and push, then open the PR with a conventional title, for example
`ci: adopt the habze commits and versioning standard`. The body lists: the stack and release
type, the starting version and why, `bootstrap-sha`, removed per-project version properties,
and the pending settings from step 6. Do not merge it.

**The settings of step 6 must be in place before this PR is merged, and it must be
squash-merged.** release-please reads only first-parent commits; a `Merge pull request #N`
commit is unparseable and its work never reaches a release (this happened to habze itself).

## 6. Repository settings: only after asking

Show the user exactly this list for `<owner>/<repo>` and **wait for an explicit yes**; apply
only what they approve, then read the settings back and report them.

```sh
gh api -X PATCH repos/<owner>/<repo> -F allow_squash_merge=true -F allow_merge_commit=false \
  -F allow_rebase_merge=false -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY -F delete_branch_on_merge=true -F allow_auto_merge=true
current=$(gh api repos/<owner>/<repo>/actions/permissions/workflow --jq .default_workflow_permissions)
gh api -X PUT repos/<owner>/<repo>/actions/permissions/workflow \
  -f default_workflow_permissions="$current" -F can_approve_pull_request_reviews=true
```

The second call keeps the repository's current default token permissions and only turns on
"Allow GitHub Actions to create and approve pull requests".

- Required check `pr-title / check` on the default branch:
  - classic protection exists → `echo '{"contexts":["pr-title / check"]}' | gh api -X POST
    repos/<owner>/<repo>/branches/<default>/protection/required_status_checks/contexts --input -`;
  - a ruleset protects the branch → show the ruleset's JSON with the check added to its
    `required_status_checks` rule, then `gh api -X PUT repos/<owner>/<repo>/rulesets/<id>
    --input <file>`;
  - no protection at all → propose a ruleset (require a PR, required checks `pr-title / check`
    plus the CI checks) and show its JSON before creating it.
- `can_approve_pull_request_reviews` is what GitHub calls "Allow GitHub Actions to create and
  approve pull requests"; release-please needs it to open its PR.

## 7. Renovate and hand-off

Renovate is installed if the repo has a "Dependency Dashboard" issue or PRs from
`app/renovate` (`gh pr list --author app/renovate --state all --limit 1`). If not, remind the user
to install the Renovate GitHub App (<https://github.com/apps/renovate>) for this repository; the
skill cannot do it.

Report: PR link, stack and starting version, checks run and their results, settings applied or
still pending, and what happens next: after the PR is merged, the `Release` workflow opens the
first Release PR and runs the required checks on it; merging that PR tags the first release.
