# CLAUDE.md

habze is the standard plus shared CI for **commit conventions and versioning** in the owner's
projects. Start with [README.md](README.md) (how projects consume it) and
[STANDARD.md](STANDARD.md) (the rules). Nothing else belongs in this repository.

## Layout

- `.github/workflows/pr-title.yml`, `release.yml`: reusable workflows projects call at `@v1`.
- `.github/workflows/ci.yml` (job `docs`, required by main's protection: do not rename it),
  `self-pr-title.yml`, `self-release.yml`: habze's own CI, calling the reusable ones locally.
- `renovate/default.json`: the Renovate preset; `renovate.json` uses it for habze itself.
- `templates/<stack>/`: files the adopt skill copies into a project.
- `claude/`: the CLAUDE.md section, the commit-message hook and its tests.
- `skills/adopt-versioning/SKILL.md`: brings a repository onto the standard.

## Rules for changes here

- habze follows itself: squash merge, conventional PR title, release-please owns the version,
  `CHANGELOG.md` and `.release-please-manifest.json`. Never edit them by hand.
- Every project tracks `@v1`, so a change to a reusable workflow's inputs/outputs, the preset's
  behaviour or a rule is a contract change. Incompatible changes need `!` (they ship as `v2`).
- Pin third-party actions to a major tag and check their docs when bumping.

## Verification (what CI's `docs` job runs)

```sh
npx --yes markdownlint-cli2@0.24.1
node --test claude/hooks/conventional-commit.test.mjs
npx --yes --package renovate@44.239.1 -- renovate-config-validator --strict --no-global \
  renovate.json renovate/default.json templates/dotnet/renovate.json templates/node/renovate.json
actionlint .github/workflows/*.yml templates/*/.github/workflows/*.yml
```

plus `node tools/check-json.mjs` (parses every tracked `*.json`). The Renovate validator needs
Node 24.
