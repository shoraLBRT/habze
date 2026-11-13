# Commit-message hook for Claude Code

[`conventional-commit.mjs`](conventional-commit.mjs) is a `PreToolUse` hook for the `Bash` and
`PowerShell` tools. Before Claude runs a command it checks:

- `git commit` with an inline message: `-m "..."`, `-m '...'`, `--message=...`, several `-m`,
  a bash heredoc `-m "$(cat <<'EOF' ... EOF)"`, a PowerShell here-string `-m @' ... '@`;
- `gh pr create` / `gh pr edit` with `--title` / `-t`.

The header (first line) must be `<type>[(scope)][!]: <description>` with a type from
[STANDARD.md](../../STANDARD.md), in English (no Cyrillic), at most 100 characters. Git's own
`Merge ...`, `Revert "..."` and `fixup!`/`squash!`/`amend!` headers pass. A violation exits with
code 2 and the reason on stderr, which blocks the tool call and shows Claude the reason. A message
it cannot see (`-F file`, the editor, `$VARIABLES`, `--fill`) is allowed.

## Install

Node 18 or newer, no dependencies. Copy the script somewhere stable, e.g.
`~/.claude/hooks/conventional-commit.mjs`, and add this to `~/.claude/settings.json` (merge it
into an existing `hooks` object). Use the absolute path; on Windows write it with forward slashes,
e.g. `C:/Users/you/.claude/hooks/conventional-commit.mjs`.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["/home/you/.claude/hooks/conventional-commit.mjs"],
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

With `args` the command runs without a shell, so the path needs no quoting. Check it with
`/hooks` in Claude Code, then ask Claude to `git commit -m "update"`: the call is blocked.

## Test

```sh
node --test claude/hooks/conventional-commit.test.mjs
```
