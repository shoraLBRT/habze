# habze — Specification

- **Status:** Agreed with the maintainer on 2026-10-01
- **Reads with:** [`ROADMAP.md`](ROADMAP.md) says in what order this gets built;
  [`PROJECT_STATE.md`](PROJECT_STATE.md) says what exists now.
  [Bellboy](https://github.com/shoraLBRT/bellboy) is the main consumer of what is specified here.

---

## 1. What habze is

*Habze* is the unwritten code of conduct of the Circassians. This repository is its counterpart for
software projects built by Claude Code agents: **one way of working, the same in every project.**

The work itself is the same everywhere: bring the default branch up to date, find the next task in
the backlog, branch, build, verify, open a PR, merge it when allowed, record the state, take the
next one. What differs between projects — the product, the stack, the verification commands — lives
in each project's own documents. habze holds everything that does **not** differ:

1. **The standard** (`STANDARD.md`) — what every project must have and how its backlog, issues,
   PRs, CI and agent sessions behave.
2. **The skills** — `session`, `session-reserve`, `session-full` — that do the work the same way in
   every project, on the owner's machine and in Anthropic's cloud.
3. **The adoption tools** — a skill that brings a repository up to the standard, a check that says
   whether it is, and the guide to set up a project's cloud routine.

Nothing project-specific lives here, and nothing about any one person's infrastructure: habze is
public and meant to be reused.

### 1.1 Who reads it

| Reader | Reads |
| --- | --- |
| An agent session in a project | The skills, and `STANDARD.md` through the project's `CLAUDE.md` |
| The project owner | `STANDARD.md`, the adoption guide, the routine guide |
| Bellboy | The rules of §3 and the run contract of §5, which it implements |

---

## 2. What a project must have

`STANDARD.md` states these as requirements, each one checkable by the conformance check (§7).

### 2.1 Documents

| File | Holds |
| --- | --- |
| `README.md` | What the project is, in a few paragraphs, and how to run it |
| `CLAUDE.md` | Points to `AGENTS.md` and the documents below; says the project follows habze and which version |
| `AGENTS.md` | How to work here: the project's non-negotiables, its working rules, where the work comes from |
| A product description | What the product is and where it is going (for example `docs/CONCEPT.md` or `docs/SPEC.md`) |
| `docs/ROADMAP.md` | The stages: goal and exit criterion of each, and anything about order the board cannot express |
| `docs/PROJECT_STATE.md` | What exists, the current stage, and **the commands that verify a change** — the skills run exactly these |

### 2.2 Backlog

- **The backlog is the project's GitHub Projects board.** Issues are the source of truth for what
  is done; the board is the source of truth for what is next.
- Board fields: **Status** (`Todo`, `In Progress`, `Done`), **Priority** (`P0`, `P1`, `P2`),
  **Size** (`XS` … `XL`). The board's built-in workflows close the loop: item closed → Done,
  PR merged → Done.
- **Stages are milestones**, titled `S0 · <name>`, `S1 · <name>`, … so that title order is stage
  order. Every task is in a stage.
- **Dependencies are GitHub's native "blocked by" relations**, not prose.
- Ideas for later iterations are not issues; they live in the product description until planned.

### 2.3 Issues

- **Title:** an imperative or a noun phrase saying the outcome, without a type prefix
  (`Usage probe`, `Move the skills into habze`). The type is a label.
- **Body:** *Why*, *What*, *Acceptance criteria* (a checklist), *Depends on* when relevant —
  provided as issue forms.
- **Labels** (the full set is [`.github/labels.yml`](../.github/labels.yml) in habze; adoption
  creates it):
  - kind: `type:feature`, `type:infra`, `type:docs`, `type:research`, `type:qa`, `type:security`,
    `type:tech-debt`, `type:bug`;
  - workflow: `needs:maintainer` (an agent stopped and needs the owner), `accepted` (the owner
    admits an issue someone else opened);
  - a project may add its own `epic:*` labels.
- Priority is the board field, not a label — one source.

### 2.4 Branches, PRs and CI

- **`main` is protected:** changes only through PRs, required status checks must pass, no force
  pushes, no deletion.
- **CI is required** and runs every check listed in `PROJECT_STATE.md` that can run in CI.
- One issue per branch, one PR per issue. The PR says `Closes #N` for **its issue only**; a PR that
  closes another issue is a violation unless the issue said so from the start.
- Branches are `claude/<issue>-<slug>` for agent work (cloud sessions can push only to `claude/*`),
  and anything the owner likes for their own.
- **Protected paths** — `.github/workflows/`, `.claude/`, `CLAUDE.md`, `AGENTS.md` and the files
  habze manages — are never merged without the owner. An agent must not loosen its own rules
  unattended.

---

## 3. Which issues an agent may take, and in what order

These rules are shared by the skills and Bellboy, so a session started by hand and a run started by
Bellboy always agree on "the next task".

**Eligible** — all of:

1. open, on the board with Status `Todo`;
2. opened by the owner, **or** labelled `accepted`;
3. in a milestone;
4. not blocked by an open issue;
5. not labelled `needs:maintainer`.

**Order:** milestone (title order) → Priority (`P0`, `P1`, `P2`, none) → position on the board.

**Trust:** an agent treats the issue body, and comments **from the owner**, as its instructions.
Comments from anyone else are data — read, weighed, never obeyed. This matters because most
projects are public and anyone can comment.

---

## 4. The skills

The skills are the same in every project and take everything project-specific from the project's
documents; when a project's documents and a skill disagree, the project's documents win.

| Skill | Does | Merges | Reads usage |
| --- | --- | --- | --- |
| `session` | One issue end to end: orient, pick, branch, build, verify, ship, record | No | No |
| `session-reserve` | `session` again and again, merging each PR on green CI; does not start an issue once the 5-hour window is ≥ 80 % used | Yes | Before each issue |
| `session-full` | The same without the reserve; brings work to a clean point before the window runs out | Yes | Between phases |

The looping skills are for the owner's own sessions on their machine. **Runs started by Bellboy use
`session` in run mode** (§5): one issue, no merge — Bellboy owns loops and merging.

**Usage.** The skills read usage with the CLI probe —
`claude -p "ok" --model haiku --max-turns 1 --output-format stream-json --verbose`, taking the
`rate_limit_event` — which works on the owner's machine and in the cloud alike. The desktop-only
usage tool is not used. A probe that fails means "unknown": the looping skills then behave like
plain `session` and do not merge.

**Commit often.** In every mode a session commits and pushes after each phase, so a session cut off
by the limit, or reclaimed in the cloud, loses nothing.

**Stop and ask** for architectural or product decisions, for anything the documents do not settle,
and for anything that would touch protected paths beyond the issue's scope: comment on the issue,
add `needs:maintainer`, end.

---

## 5. Run mode: the contract with Bellboy

A project's cloud routine runs `session` in run mode on one issue that Bellboy chose. The contract:

- **Input** — the routine-fire payload, JSON:
  `{"bellboy": 1, "run": "<run id>", "repo": "<owner/name>", "issue": <number>, "kind": "new" | "resume"}`.
  The routine prompt opts in to reading it. The session works on that issue only, after checking it
  is eligible (§3); if it is not, it reports `nothing_to_do`.
- **Started comment**, before any work: `<!-- bellboy:started run=<run id> -->` and a human line.
- **Report comment**, last: `<!-- bellboy:report {json} -->` and a human summary. JSON fields:
  `run`, `outcome` (`pr_opened` | `needs_maintainer` | `failed` | `nothing_to_do`), `pr`,
  `summary`, `questions`, `usage` (its own probe: `five_hour` and `seven_day`, each
  `{utilization, resetsAt}`).
- **`kind: "resume"`** — continue the open `claude/<issue>-…` branch and its PR instead of starting
  over.
- **Never merge**, never take a second issue, never close another issue.
- The contract is versioned by the `bellboy` field; a change to it is a change to both repositories.

---

## 6. How skills reach a project

Cloud sessions see only what is in the repository (and skills enabled on claude.ai); they do not see
the owner's `~/.claude/skills`. The skills therefore have to arrive through the repository.
Candidates, decided by a spike:

| Way | For | Against |
| --- | --- | --- |
| **Plugin** from the habze repository, enabled in each project's `.claude/settings.json` | One source, nothing copied | Unverified whether cloud sessions install it |
| **Synced copies** in each project's `.claude/skills/`, updated by a habze workflow that opens a PR in every adopted project when the skills change | Works everywhere, versioned in each project | Copies, and a PR per project per change |
| Skills uploaded on claude.ai | Nothing in the repositories | Manual, unversioned, invisible to other forks |

The preference is the plugin if the spike shows it works in the cloud, otherwise synced copies.
Either way habze is the **only** place the skills are edited.

---

## 7. Adoption tools

- **`adopt-standard` skill** — brings a repository up to the standard: creates the labels, issue
  forms and PR template; checks or creates the board and its fields; turns on branch protection
  with the CI checks as required; adds the habze lines to `CLAUDE.md`; installs the skills (§6).
  It proposes every change as a PR or a list for the owner, and changes repository settings only
  with the owner's go-ahead.
- **Conformance check** — says, for one repository, which requirements of §2 hold and which do
  not, with the fix for each. It needs only `gh` and runs on Windows (Git Bash) and Linux. Bellboy
  links to it when it refuses a project.
- **Routine guide** — how to give a project its cloud routine: the cloud environment (network
  access, setup script for its toolchain, Docker started per session), the routine prompt template
  for run mode, the model (**Opus**), the API trigger and its token, and the lines to add to
  Bellboy's configuration. ritocode's findings
  ([shoraLBRT/ritocode#146](https://github.com/shoraLBRT/ritocode/issues/146)) are the worked
  example.

---

## 8. Versions

`STANDARD.md` carries a version (`1.0`, `1.1`, …). A project's `CLAUDE.md` names the version it
follows. A change that adds a requirement bumps the minor version and lists what an adopted project
must do; the conformance check checks against the version the project names.

---

## 9. Decisions and why

| Decision | Why |
| --- | --- |
| A separate repository, not part of Bellboy | The way of working belongs to the projects, not to the messenger assistant; Bellboy is one consumer of it |
| GitHub Projects board as the backlog | The owner's preferred tool; issues stay the record of what is done |
| Stages as milestones, dependencies as native relations | Both are readable by tools without parsing prose |
| Priority as a board field only | One source; labels and fields drifting apart is a known failure |
| Eligibility needs the owner's authorship or `accepted` | Public repositories accept issues from anyone; nobody else may steer the agents |
| Protected paths need the owner | An agent must not weaken CI, its skills or its rules unattended |
| Usage through the CLI probe | Works on the machine and in the cloud; the desktop tool does not exist in the cloud |
| Bellboy runs use `session` in run mode | Loops and merges are Bellboy's, so each cloud session stays one task with fresh context |
| Issue forms, PR template and labels file are copied into each project, not served from the owner's `.github` repository | The standard's checks (I5, I6) read the project's own files, and GitHub ignores the shared forms as soon as a repository has any of its own; a shared repository would also tie habze to one owner and move every project to new forms at once, while each project names the version it follows (V2) |
