# Project State

**The living state of the project: what exists, what is next, and how to verify a change.** Update it
in the same pull request as the work it describes.

- **Last updated:** 2026-10-01
- **Current stage:** S0 · The standard — `STANDARD.md` 1.0 is written; the labels file, issue forms,
  PR template (#2) and CI with a protected `main` (#3) are next; see [ROADMAP.md](ROADMAP.md)
- **Board:** <https://github.com/users/shoraLBRT/projects/5>
- **What gets built:** [SPEC.md](SPEC.md)

---

## What exists

| Part | State | Where |
| --- | --- | --- |
| Specification | Agreed 2026-10-01 | [`docs/SPEC.md`](SPEC.md) |
| Roadmap and backlog | 13 issues in stages S0–S2 on the board, with native *blocked by* relations | [`docs/ROADMAP.md`](ROADMAP.md) |
| `STANDARD.md` | Version 1.0: requirements D1–D8, B1–B8, I1–I6, P1–P6 (repository) and A1–A6, V1–V2 (agents, versions), each with its check | [`STANDARD.md`](../STANDARD.md) |
| Skills | Still only in the owner's `~/.claude/skills` — #4 | — |
| CI, branch protection | Not yet — #3 | — |
| Labels | The standard's set exists on habze and bellboy (created by hand on 2026-10-01) | GitHub |

## Verification

No CI yet (#3). A change is documents and skills; check Markdown renders and links resolve.

## habze against its own standard

habze does not yet meet all of `STANDARD.md` 1.0. Known gaps, and where they close:

- **D2** — `CLAUDE.md` lacks the line ``This project follows [habze](…) `1.0`.``; `CLAUDE.md` is a
  protected path, so the owner adds it (or approves a PR that does).
- **D7, P1–P3** — no verification commands, CI or protection yet: #3.
- **I5, I6** — no issue forms or PR template yet: #2.
- **I3** — #7's title starts with `Spike:`, which the type-prefix rule flags; the type is already its
  `type:research` label.

## Open questions for the owner

- **Organisation-owned repositories.** The standard defines *the owner* as the account that owns the
  repository (eligibility A1, protected paths P6). For a repository owned by an organisation that
  is the organisation itself, which never opens issues; a later version needs a way to name the
  maintainers (for example in `AGENTS.md`).
- The licence — tracked in [shoraLBRT/bellboy#5](https://github.com/shoraLBRT/bellboy/issues/5) for
  both repositories.
