---
name: session-full
description: Work through the current project's backlog issue after issue with the `session` skill, merging each PR yourself once CI is green, with no usage reserve — keep going until the 5-hour usage window is spent, and leave the work clean and resumable before it runs out. Use only when the maintainer invokes it ("/session-full", "work through the roadmap until the limit"). Stops for architectural or business decisions and for problems that need the maintainer.
---

# Session to the limit

The same loop as `session-reserve`, without the reserve: the maintainer has given this run the whole
5-hour window. The mandate lasts for this invocation only.

Read the `session-reserve` skill (`../session-reserve/SKILL.md`, next to this one) for **Merging**,
**Stop and ask the maintainer when** and **Ending** — they apply here unchanged, including: red CI is
never merged unless every failure is proven unrelated and already failing on the default branch, and
the PR comment says so; a PR that touches protected paths is never merged and is left for the owner.

## The loop

Repeat:

1. **Check the usage** with `mcp__ccd_session_mgmt__get_usage` — the `5-hour limit` entry of
   `plan.windows`.
2. **Run one issue with the `session` skill**, all seven phases.
3. **Wait for CI**, merge on green — except a PR that touches protected paths, which the owner
   merges.
4. `git fetch origin` and take the next issue.

Check the usage again **between phases** of a long issue (after Build, after Verify), not only
between issues — there is no reserve to absorb a surprise.

## Before the window runs out

The aim is that the window never runs out on dirty work. From about **90% used**, or earlier if the
remaining issue is large:

- do not start a new issue you cannot plausibly finish;
- bring the current one to a clean point: push the branch (every phase is already committed), open or
  update a **draft** PR, comment on the issue with what is done and exactly what is left, and record
  the partial state in the project's state file on that branch;
- nothing may exist only in the working tree.

Then report as in *Ending*, including when the window resets.

## Resuming

A session cannot wake itself once the window is spent — nothing runs until something starts a new
turn. Resuming after the reset needs an **external trigger**: a desktop scheduled task or a cloud
routine that starts a session with `/session-full` after the reset time. Do not create one unless the
maintainer asks; mention in the final report that it is how to resume automatically.

## When the usage cannot be read

If `get_usage` is missing (a cloud session, an older app) or reports `unavailable` or
`not_applicable`, **do not guess.** Tell the maintainer the usage cannot be read here, and fall back
to plain `session`: finish the current issue, do not merge unless they confirm, and do not start
another.
