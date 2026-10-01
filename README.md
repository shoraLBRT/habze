# habze

*Habze* is the unwritten code of conduct of the Circassians. This is its counterpart for software
projects built by Claude Code agents: **one way of working, the same in every project.**

The work is the same everywhere — update the default branch, take the next task from the backlog,
branch, build, verify, open a PR, merge when allowed, record the state, take the next one. What
differs between projects lives in each project's own documents. habze holds what does not:

- **The standard** — what every project must have: its documents, a GitHub Projects backlog with
  stages and dependencies, issue and PR rules, required CI on a protected `main`, which issues an
  agent may take and in what order.
- **The skills** — `session`, `session-reserve`, `session-full` — the same on your machine and in
  Anthropic's cloud.
- **The adoption tools** — a check that says whether a repository follows the standard, a skill that
  brings it there, and a guide to give a project its cloud routine.

[Bellboy](https://github.com/shoraLBRT/bellboy), a Telegram assistant that starts and reports agent
work across projects, relies on it.

## The standard

[`STANDARD.md`](STANDARD.md) — version 1.0 — lists every requirement a project must meet, each with
the check that verifies it.

## The skills

[`skills/`](skills) holds `session`, `session-reserve` and `session-full`. habze is the only place
they are edited. Until they are delivered to projects through the repository, install them on your
machine by copying them over your user skills, from the root of a current checkout of habze:

```bash
cp -r skills/session skills/session-reserve skills/session-full ~/.claude/skills/
```

Copy again after the skills change on `main`; never edit the installed copies.
`session-reserve` and `session-full` read usage through the `claude` CLI, so it must be logged in on
that machine (`claude auth status`; `claude auth login` if not) — the desktop app's own login does
not count.

## The conformance check

[`tools/conformance.sh`](tools/conformance.sh) says whether one repository follows the standard. It
checks every requirement of `STANDARD.md`, prints a line for each with the fix for each failure, and
exits non-zero when any fails:

```bash
bash tools/conformance.sh owner/name
```

It needs only `gh`, logged in with the `repo` and `read:project` scopes (`gh auth refresh -s
read:project`), and runs in bash on Linux and in Git Bash on Windows. It checks a project against
the version of the standard its `CLAUDE.md` names. A3 (whose words an agent obeys) is reviewed by
hand; A1 and A2 print the eligible issues in order, the first being the next task.

## Status

The standard is written, the skills are in habze, and the conformance check exists; delivering the
skills to projects and the `adopt-standard` skill are not done yet. See
[docs/SPEC.md](docs/SPEC.md), [docs/ROADMAP.md](docs/ROADMAP.md) and the
[board](https://github.com/users/shoraLBRT/projects/5).
