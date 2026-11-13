// Tests for conventional-commit.mjs. Run: node --test claude/hooks/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkCommand, extractHeaders, validateHeader } from './conventional-commit.mjs';

const HOOK = fileURLToPath(new URL('./conventional-commit.mjs', import.meta.url));

function runHook(event) {
  return spawnSync(process.execPath, [HOOK], { input: JSON.stringify(event), encoding: 'utf8' });
}

test('valid headers', () => {
  for (const h of [
    'feat: add export to CSV',
    'fix(api): handle empty pagination cursor',
    'feat!: drop .NET 6 support',
    'refactor(core)!: split the parser',
    'perf: cache compiled regexes',
    'docs: explain the release flow',
    'chore(deps): update dependency xunit to v2.9.3',
    'ci: run tests on windows',
    'revert: feat: add export to CSV',
    'Merge branch \'main\' into feature',
    'Revert "feat: add export to CSV"',
    'fixup! fix: typo',
    `fix: ${'a'.repeat(95)}`, // exactly 100 characters
  ]) {
    assert.equal(validateHeader(h), null, h);
  }
});

test('invalid headers', () => {
  for (const h of [
    'add export',
    'feature: add export',
    'hotfix: patch prod',
    'Feat: add export',
    'feat:add export',
    'feat: ',
    'feat(): add export',
    'feat(api) : add export',
    'fix: исправить ошибку',
    'fix(модуль): handle it',
    `fix: ${'a'.repeat(96)}`, // 101 characters
    'WIP',
  ]) {
    assert.notEqual(validateHeader(h), null, h);
  }
});

test('bash: git commit -m with double and single quotes', () => {
  assert.deepEqual(extractHeaders('git commit -m "feat: x"').map((f) => f.header), ['feat: x']);
  assert.deepEqual(extractHeaders("git commit -am 'bad message'").map((f) => f.header), ['bad message']);
  assert.deepEqual(extractHeaders('git commit --message="fix: y"').map((f) => f.header), ['fix: y']);
  assert.deepEqual(extractHeaders('git commit -m"fix: z"').map((f) => f.header), ['fix: z']);
  assert.deepEqual(
    extractHeaders('git commit -m "fix: first" -m "body text"').map((f) => f.header),
    ['fix: first'],
  );
});

test('bash: heredoc inside command substitution', () => {
  const cmd = [
    'git add -A && git commit -m "$(cat <<\'EOF\'',
    'feat(hook): validate commit headers',
    '',
    'Longer body; with "quotes" && separators.',
    '',
    'Co-Authored-By: Someone <x@example.com>',
    'EOF',
    ')"',
  ].join('\n');
  assert.deepEqual(extractHeaders(cmd).map((f) => f.header), ['feat(hook): validate commit headers']);
  assert.equal(checkCommand(cmd), null);
  assert.match(checkCommand(cmd.replace('feat(hook)', 'Added')), /Blocked/);
});

test('bash: chained commands, git global options, prefixes', () => {
  assert.equal(extractHeaders('cd repo && git -C sub commit -m "wip"')[0].header, 'wip');
  assert.equal(extractHeaders('GIT_AUTHOR_NAME=x git commit -m "wip"')[0].header, 'wip');
  assert.equal(extractHeaders('git status; git commit -m "fix: a" | cat')[0].header, 'fix: a');
});

test('bash: things that are not inline commit messages are allowed', () => {
  for (const cmd of [
    'git commit',
    'git commit -F msg.txt',
    'git commit --file=msg.txt',
    'git commit --amend --no-edit',
    'git commit -m "$MSG"',
    'git commit -m "$(generate-message)"',
    'git commit --fixup HEAD~1',
    'git commit -C HEAD',
    'git log --grep "bad message"',
    'echo git commit -m "bad message"',
    'git commit -m "bad" # comment',
    'cat > notes.txt <<\'EOF\'\ngit commit -m "bad message"\nEOF\ngit status',
  ]) {
    const headers = extractHeaders(cmd).map((f) => f.header);
    if (cmd.startsWith('git commit -m "bad" #')) {
      assert.deepEqual(headers, ['bad']); // still checked; the comment is ignored
    } else {
      assert.deepEqual(headers, [], cmd);
    }
  }
});

test('gh pr create / edit titles', () => {
  assert.equal(extractHeaders('gh pr create --title "feat: x" --body "Closes #1"')[0].header, 'feat: x');
  assert.equal(extractHeaders('gh pr edit 12 -t "bad title"')[0].header, 'bad title');
  assert.equal(extractHeaders('gh pr create --title=fix:\\ a')[0].header, 'fix: a');
  assert.deepEqual(extractHeaders('gh pr create --fill'), []);
  assert.deepEqual(extractHeaders('gh pr view 12'), []);
  assert.match(checkCommand('gh pr create --title "Добавить экспорт" --body x'), /Cyrillic/);
});

test('powershell: quotes, here-strings, escapes', () => {
  const ps = (c) => extractHeaders(c, 'powershell').map((f) => f.header);
  assert.deepEqual(ps('git commit -m "feat: x"'), ['feat: x']);
  assert.deepEqual(ps("git commit -m 'it''s fine'"), ["it's fine"]);
  assert.deepEqual(ps('git commit -m @\'\nfix: here-string\n\nbody $notExpanded\n\'@'), ['fix: here-string']);
  assert.deepEqual(ps('git commit -m @"\nfix: expandable\n"@'), ['fix: expandable']);
  assert.deepEqual(ps('git commit -m @"\n$title\n"@'), []);
  assert.deepEqual(ps('git add -A; if ($?) { git commit -m "wip" }'), ['wip']);
  assert.deepEqual(ps('& git commit -m "docs: a `"quoted`" word"'), ['docs: a "quoted" word']);
  assert.deepEqual(ps('gh pr create --title "chore: tidy" --body @\'\nline\n\'@'), ['chore: tidy']);
});

test('hook process: exit codes and stderr', () => {
  const ok = runHook({ tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: ok"' } });
  assert.equal(ok.status, 0);
  const bad = runHook({ tool_name: 'Bash', tool_input: { command: 'git commit -m "update stuff"' } });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /conventional-commit hook/);
  const psBad = runHook({ tool_name: 'PowerShell', tool_input: { command: "gh pr create -t 'misc'" } });
  assert.equal(psBad.status, 2);
  const other = runHook({ tool_name: 'Write', tool_input: { file_path: 'x' } });
  assert.equal(other.status, 0);
  const garbage = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(garbage.status, 0);
});
