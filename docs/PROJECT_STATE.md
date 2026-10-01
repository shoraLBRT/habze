# Project State

**The living state of the project: what exists, what is next, and how to verify a change.** Update it
in the same pull request as the work it describes.

- **Last updated:** 2026-10-01
- **Current stage:** S0 · The standard — `STANDARD.md` 1.0, the `docs` CI check, the labels file,
  issue forms and PR template exist; S0 is done once the owner turns on the protection of `main`.
  S1's work has started (#4 done, #5 in review); see [ROADMAP.md](ROADMAP.md)
- **Board:** <https://github.com/users/shoraLBRT/projects/5>
- **What gets built:** [SPEC.md](SPEC.md)

---

## What exists

| Part | State | Where |
| --- | --- | --- |
| Specification | Agreed 2026-10-01 | [`docs/SPEC.md`](SPEC.md) |
| Roadmap and backlog | 13 issues in stages S0–S2 on the board, with native *blocked by* relations | [`docs/ROADMAP.md`](ROADMAP.md) |
| `STANDARD.md` | Version 1.0: requirements D1–D8, B1–B8, I1–I6, P1–P6 (repository) and A1–A6, V1–V2 (agents, versions), each with its check | [`STANDARD.md`](../STANDARD.md) |
| Skills | `session`, `session-reserve`, `session-full`, aligned with `STANDARD.md` 1.0 (eligibility and order query, trust, commit after each phase, own issue only, protected paths never merged by an agent, `claude/<issue>-<slug>`); installed by hand per the README until #8. The looping skills read usage with the CLI probe of SPEC §4 (no desktop tool); a probe without an answer is *unknown* and stops merging and looping — #4, #5 | [`skills/`](../skills) |
| CI | The `docs` check: Markdown lint and relative link check, on PRs and pushes to `main` — #3 | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Branch protection of `main` | Not yet: the owner turns it on with the `docs` check required — #3 | GitHub settings |
| Labels | The standard's set exists on habze and bellboy (created by hand on 2026-10-01) and matches the labels file exactly (checked 2026-10-01) | GitHub |
| Labels file, issue forms, PR template | The ten labels of I1 with colours and descriptions; forms for feature, infra, docs, research and bug, each with *Why*, *What*, *Acceptance criteria*, *Depends on* and its `type:*` label; the PR template — #2 | [`.github/labels.yml`](../.github/labels.yml), [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE), [`.github/pull_request_template.md`](../.github/pull_request_template.md) |

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

## habze against its own standard

habze does not yet meet all of `STANDARD.md` 1.0. Known gaps, and where they close:

- **D2** — `CLAUDE.md` lacks the line ``This project follows [habze](…) `1.0`.``; `CLAUDE.md` is a
  protected path, so the owner adds it (or approves a PR that does).
- **D7, P1–P3** — no verification commands, CI or protection yet: #3.
- **I5, I6** — close when #2 is merged.
- **I3** — #7's title starts with `Spike:`, which the type-prefix rule flags; the type is already its
  `type:research` label.

## Open questions for the owner

- **Heading level of form-made issues (I4).** GitHub renders each issue-form field as a `### Why`
  heading, while I4 asks for `## Why` (habze's own issues, written by hand, use `##`). Recommended:
  the conformance check (#10) accepts both levels, and a later version of the standard says so.
- **Issue kinds without a form.** Forms exist for the five kinds #2 names; `type:qa`,
  `type:security` and `type:tech-debt` issues are opened blank and labelled by hand. Blank issues
  stay enabled for that reason.
- **Organisation-owned repositories.** The standard defines *the owner* as the account that owns the
  repository (eligibility A1, protected paths P6). For a repository owned by an organisation that
  is the organisation itself, which never opens issues; a later version needs a way to name the
  maintainers (for example in `AGENTS.md`).
- The licence — tracked in [shoraLBRT/bellboy#5](https://github.com/shoraLBRT/bellboy/issues/5) for
  both repositories.
- **#4's second criterion** — that a local session in a project following the standard picks the
  task the order rule gives — is not yet shown with the skills installed from habze. #4 was closed
  when #17 was merged (the PR was linked to it), so the check is left to the owner's first session.
- **The CLI is not logged in on the owner's laptop** (`claude auth status`: `"loggedIn": false`,
  2026-10-01); the desktop app has its own login. Until `claude auth login` is run there, the probe
  answers *unknown* and the looping skills behave like plain `session` on that machine. #5's
  laptop and cloud runs of the probe wait for it.
