---
name: session
description: Run one work session on the current project end to end — orient in the project's own docs, take the next issue from its roadmap or backlog, branch, build, verify with the project's own commands, open a PR, comment on the issue, and leave the project's state file true for the next session. Use this whenever work is about to start or resume in a repository: "what's next", "take the next task", "let's continue", "pick something from the roadmap", "open a PR for this", "wrap up the session". Also use it when entering mid-way — something is already built and needs the verify / ship / record half done properly. One issue, one branch, one PR; it never merges and ignores usage limits (the looping variants are `session-reserve` and `session-full`).
---

# Session

A project built by sessions that do not share memory continues only through the handoff at the end
of each one: the docs describe reality, the issue says what is really left, and the next session can
start cold from the repository alone.

Most of the cost of getting this wrong is invisible at the time. An issue closed over unfinished
work, a caveat buried in a commit message, a decision made in code instead of in the docs — none of
them break the build. They break the session three weeks later that trusts the docs.

**This skill knows no project.** Everything project-specific — where the backlog lives, the order of
work, the verification commands, the state file, which issues a coding session does not take — comes
from the project's own `CLAUDE.md` / `AGENTS.md` and the files they point to. When the project's docs
and this skill disagree, the project's docs win. When the project's docs are silent on something a
session needs, say so in the PR — that gap is worth fixing.

## Phases

| # | Phase | Ends when |
| --- | --- | --- |
| 1 | Orient | The checkout is current, and you can name the project's current stage and the next issue |
| 2 | Pick | One issue is chosen, open, with its dependencies met |
| 3 | Branch | You are off the freshly fetched default branch |
| 4 | Build | Code and its tests exist |
| 5 | Verify | Every check the project's docs list passes |
| 6 | Ship | PR open, issue commented |
| 7 | Record | The project's state file describes what the PR does |

Entering mid-way is fine — if the code exists and only the shipping half is left, start at
**Verify**, but still skim Orient.

---

### 1. Orient

**Make the checkout current before reading anything.**

```bash
git fetch origin
```

Find the default branch (`git symbolic-ref refs/remotes/origin/HEAD`, usually `main`). In a git
worktree it is usually checked out elsewhere, so read files from the fetched ref
(`git show origin/main:AGENTS.md`) and branch off `origin/<default>` by name.

Then read, from that ref, and actually read them — they move:

1. `CLAUDE.md` and `AGENTS.md` (either may be missing). They name the entry documents.
2. Whatever they point to for **what exists and what is next** (a state file such as
   `docs/PROJECT_STATE.md`), for **the order of work** (a roadmap, a slice plan, a board), and for
   **how to verify a change**.
3. The spec sections and decision records (ADRs) the next issue depends on.

If the project has no such docs, find the equivalent (README, open issues, CI workflow) and say that
the project lacks a state file — do not invent a layout for it without asking.

Then say, in two or three lines: the current stage (if the project has stages), the next issue, and
anything that blocks it.

### 2. Pick

Take the issue the project's docs say comes next — usually the first open one in the roadmap's order
whose dependencies are met — **not the first interesting one**. Confirm it is still open on the
tracker (`gh issue view <N>`). Respect any rule the project states about issues a coding session
does not take (content work, the maintainer's own tasks).

**Stop and ask the maintainer before building when:**

- the issue needs an architectural or business decision the project's docs do not make — check the
  spec's open decisions and the state file's open questions first;
- the issue turns out to be wrong. The plan may move; say why in the PR;
- a problem needs the maintainer's hands — credentials, an account, a paid service, a machine only
  they can fix.

When you ask, give the options and your recommendation.

### 3. Branch

```bash
git checkout -b <prefix>/<issue>-<short-slug> origin/<default>
```

Prefix by what the change is — `feat/`, `fix/`, `test/`, `docs/`, `chore/` — unless the project says
otherwise. **One issue per branch. Never commit to the default branch.**

### 4. Build

Follow the project's coding guidelines, architecture rules and decision records. Generally:

- **Tests ship with the code, not after.**
- **A decision that outlives the session goes where the project keeps decisions** (an ADR, the
  spec), not in a commit message.
- Stay inside the issue. Something worth fixing outside it becomes a note in the PR or a new issue.

### 5. Verify

Run **every** check the project's docs list — read them there, not from memory, and not only the
ones that look relevant. If the project keeps a test-count baseline, it is a ratchet: when it drops
because the thing tested is gone, say so in the PR.

A failure caused by the environment (a stopped Docker daemon, a flaky network) is not a code
problem — fix the environment or say plainly that the check could not run. Never report a check as
passing that did not run.

### 6. Ship

Commit, push, open a PR that names the issue.

- The PR body says what landed **and what was deliberately left out**.
- `Closes #N` **only when the issue is genuinely finished.** Partial work references the issue
  without a closing keyword and leaves it open.
- Comment on the issue with the same summary.

**Plain `session` does not merge.** The maintainer merges, unless they say otherwise for this
session. `session-reserve` and `session-full` are the variants that merge and loop.

### 7. Record

Update the project's docs **in the same PR as the code**:

- The state file: what now exists (or what is left of a partial issue), what is next, the date, the
  test baseline, anything else the file itself says to keep current.
- The design documents the change touches (domain model, schema, API) when the project keeps them.
- Open questions: anything a future session would otherwise have to rediscover.

When a stage's exit criterion has been shown to work, say so in the state file and move the current
stage on.

---

## Partial work is normal

Some issues span several pull requests. Say so plainly, every time, in the PR body, the issue
comment and the state file. Partial is fine. Ambiguous is not.
