---
name: session-reserve
description: Work through the current project's backlog issue after issue with the `session` skill, merging each PR yourself once CI is green, and leaving 20% of the 5-hour usage window to the maintainer — no new issue is started once that window is 80% used. Use only when the maintainer invokes it ("/session-reserve", "work through the roadmap and keep a reserve"). Stops for architectural or business decisions and for problems that need the maintainer.
---

# Session with a reserve

The maintainer has handed you the backlog for this run: take issues one after another, ship and
merge each, and keep going — but leave the last 20% of the 5-hour usage window for their own work.
The mandate lasts for this invocation only; it does not carry into other sessions.

## The loop

Repeat:

1. **Check the usage** (see below). If the 5-hour window is **80% or more used**, do not start a new
   issue — go to *Ending*.
2. **Run one issue with the `session` skill**, all seven phases, exactly as it says. Its stop
   conditions stay in force.
3. **Wait for CI** on the PR (`gh pr checks <N> --watch`), then merge it (see *Merging*) — unless
   it touches protected paths, which the owner merges.
4. `git fetch origin` and start again from the default branch — the next issue builds on what was
   just merged.

A PR left for the owner's merge is not on the default branch yet. Take a next issue only if it does
not build on that PR; if the next issue in order needs it, end the loop and say so.

The 80% check happens **before each new issue**, not in the middle of one. An issue already under
way is finished — through verify, ship, merge and record — even if the window crosses 80% meanwhile.
If it is clear the window will run out before the issue is done, stop at a clean point instead:
push the WIP branch, open or update a draft PR, comment on the issue with what is done and what is
left, and record the partial state in the project's state file.

## Checking the usage

Read the usage with the **CLI probe** — one tiny request, the same command on the owner's machine
and in a cloud session:

```bash
claude -p "ok" --model haiku --max-turns 1 --output-format stream-json --verbose 2>/dev/null   | grep -m1 '"rate_limit_event"'
```

It prints one line of JSON. Read `rate_limit_info.unifiedWindows.five_hour` and `.seven_day`, each
`{utilization, resetsAt}`: `utilization` is a fraction from 0 to 1 (`0.41` is 41%), `resetsAt` is
Unix seconds (`date -d @<resetsAt>` shows it as a time).

- `five_hour.utilization` **< 0.80** → start the next issue.
- `five_hour.utilization` **≥ 0.80** → do not start one.
- **Unknown** — nothing printed (no `claude` on the PATH, a CLI that is not logged in —
  `claude auth status` shows `"loggedIn": false` —, no network), a line that does not parse, or a
  `five_hour.utilization` that is missing or not a number from 0 to 1. Unknown is **never** read as
  0%. **Do not guess**: tell the maintainer the usage cannot be read here and why, and fall back to
  plain `session` — finish the current issue, do not merge unless they confirm, and do not start
  another.

**When to probe.** The probe is a real request: if no 5-hour window is running, it opens one. Run it
only where this skill says — right before work the session is about to do anyway — and never to wait
or poll for a reset.

The weekly window (`seven_day`) is not this skill's rule; if it is nearly spent (≥ 0.95), mention it
when you stop.

## Merging

Merge your own PR with the project's usual merge method (look at how recent PRs were merged; default
`gh pr merge <N> --merge --delete-branch`) when:

- every CI check is green,
- the PR says honestly what landed and what did not, and `Closes #N` is used only for its own,
  finished issue (P4, A5), and
- it touches **no protected path** (see `session`, *Rules for every phase*; STANDARD A6, P6). A PR
  that does is left open for the owner: say so in the PR and the issue, and go on with the loop.

**Red CI is not merged.** Fix it. The only exception: every failing check is proven unrelated to
this PR *and* already failing on the default branch before it (show the same failure on the default
branch's latest run). Then merge, and leave a PR comment that names each failing check, why it is
unrelated, and where it fails on the default branch. If you cannot prove both, stop and ask.

Never merge with a pending check, never bypass branch protection, never force-push the default
branch.

## Stop and ask the maintainer when

- an issue needs an architectural or business decision the project's docs do not make;
- an issue turns out to be wrong, or the roadmap's next step is unclear;
- a problem needs the maintainer's hands — credentials, an account, a paid service, a broken
  environment you cannot repair;
- CI is red and you cannot fix it or prove it unrelated;
- an issue would change protected paths beyond what it asks;
- the backlog has no issue a coding session may take.

When you stop for a question, comment on the issue with the question, the options and your
recommendation, add the `needs:maintainer` label (A4), tell the maintainer the same, and leave the
work in the clean state described above.

## Ending

When the loop ends — reserve reached, a stop condition, or an empty backlog — report in a few lines:
the PRs merged (with links), the PRs waiting for the owner's merge, anything left open or partial
and why, the usage at the stop and when
the window resets, and what the next issue is.
