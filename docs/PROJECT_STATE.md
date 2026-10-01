# Project State

**The living state of the project: what exists, what is next, and how to verify a change.** Update it
in the same pull request as the work it describes.

- **Last updated:** 2026-10-01
- **Current stage:** S0 · The standard — nothing is written yet beyond the specification; see
  [ROADMAP.md](ROADMAP.md)
- **Board:** <https://github.com/users/shoraLBRT/projects/5>
- **What gets built:** [SPEC.md](SPEC.md)

---

## What exists

| Part | State | Where |
| --- | --- | --- |
| Specification | Agreed 2026-10-01 | [`docs/SPEC.md`](SPEC.md) |
| Roadmap and backlog | 13 issues in stages S0–S2 on the board, with native *blocked by* relations | [`docs/ROADMAP.md`](ROADMAP.md) |
| `STANDARD.md` | Not yet — #1 | — |
| Skills | Still only in the owner's `~/.claude/skills` — #4 | — |
| CI | The `docs` check: Markdown lint and relative link check, on PRs and pushes to `main` — #3 | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Branch protection of `main` | Not yet: the owner turns it on with the `docs` check required — #3 | GitHub settings |
| Labels | The standard's set exists on habze and bellboy (created by hand on 2026-10-01) | GitHub |

## Verification

A change is documents and skills. Run from the repository root (Node.js with `npx`; on Windows, Git
Bash); CI runs the same commands as the `docs` check
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

```bash
npx --yes markdownlint-cli2@0.23.3
git ls-files -z '*.md' | xargs -0 -n1 npx --yes markdown-link-check@3.15.0 -q -c .markdown-link-check.json
```

The first lints every Markdown file with [`.markdownlint-cli2.jsonc`](../.markdownlint-cli2.jsonc)
(prose wraps at 100 columns). The second checks every relative link and anchor in tracked Markdown
files; external links are not checked, so a flaky site cannot fail CI.

## Open questions for the owner

- The licence — tracked in [shoraLBRT/bellboy#5](https://github.com/shoraLBRT/bellboy/issues/5) for
  both repositories.
