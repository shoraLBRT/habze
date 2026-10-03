# Project State

**The living state of the project: what exists, what is next, and how to verify a change.** Update it
in the same pull request as the work it describes.

- **Last updated:** 2026-10-03
- **Current stage:** S0 · The standard — `STANDARD.md` 1.0, the `docs` CI check, the labels file,
  issue forms and PR template exist; S0 is done once the owner turns on the protection of `main`.
  S1's work has started (#4 and #5 done; #6 is next); see [ROADMAP.md](ROADMAP.md)
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
| Conformance check | Every requirement of `STANDARD.md` 1.0 checked or listed as manual (A3), with a fix per failure; exit 1 on failure — #10 | [`tools/conformance.sh`](../tools/conformance.sh) |
| Labels | The standard's set exists on habze and bellboy (created by hand on 2026-10-01) and matches the labels file exactly (checked 2026-10-01) | GitHub |
| Labels file, issue forms, PR template | The ten labels of I1 with colours and descriptions; forms for feature, infra, docs, research and bug, each with *Why*, *What*, *Acceptance criteria*, *Depends on* and its `type:*` label; the PR template — #2 | [`.github/labels.yml`](../.github/labels.yml), [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE), [`.github/pull_request_template.md`](../.github/pull_request_template.md) |

## Verification

A change is documents and skills. Run from the repository root (Node.js with `npx`; on Windows, Git
Bash); CI runs the same commands as the `docs` check
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

```bash
npx --yes markdownlint-cli2@0.23.3
git ls-files -z '*.md' | xargs -0 -n1 npx --yes markdown-link-check@3.15.0 -q -c .markdown-link-check.json
bash -n tools/conformance.sh  # local only
```

The first lints every Markdown file with [`.markdownlint-cli2.jsonc`](../.markdownlint-cli2.jsonc)
(prose wraps at 100 columns). The second checks every relative link and anchor in tracked Markdown
files; external links are not checked, so a flaky site cannot fail CI. The third checks the
conformance check's syntax; it is local only until CI runs it (a workflow change, which the owner
makes). A change to the conformance check is also run against habze and against a repository that
does not follow the standard (`bash tools/conformance.sh octocat/Hello-World`), and the PR shows
the result.

## habze against its own standard

`bash tools/conformance.sh shoraLBRT/habze` on 2026-10-02: 27 passed, 2 failed:

- **P1, P2** — `main` is not protected; P2 has no required checks to match until it is.

Fixed for #10: #7 retitled without `Spike:` (I3) and commented on after its label (A4); #20 added
`CLAUDE.md`'s version line (D2) and made the skills add `needs:maintainer` before the stop comment.
Once the owner protects `main`, #10's last criterion (*passes on habze*) can be shown and #10 closed.

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
- **The probe in a cloud session is not shown yet.** On the laptop it works (2026-10-02: a
  `rate_limit_event` with `five_hour.utilization` 0.07, matching the desktop app's usage card). The
  owner closed #5 on that evidence (2026-10-03, option C); the first cloud session with the skills
  (#7, #8) shows whether the probe answers there.
- **Exceptions to protected paths.** habze has one, in [`AGENTS.md`](../AGENTS.md): an agent
  allowed to merge also merges changes to its documents and skills. The standard has no way for a
  project to declare such an exception; a later version may need one.
