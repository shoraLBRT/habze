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
  assert.deepEqual(ps('git commit -m "fix: say ""hi"""'), ['fix: say "hi"']);
  assert.deepEqual(ps('git commit -m "fix: a""b" -m "body"'), ['fix: a"b']);
  assert.deepEqual(ps('git commit -m @\'\nfix: here-string\n\nbody $notExpanded\n\'@'), ['fix: here-string']);
  assert.deepEqual(ps('git commit -m @"\nfix: expandable\n"@'), ['fix: expandable']);
  assert.deepEqual(ps('git commit -m @"\n$title\n"@'), []);
  assert.deepEqual(ps('git add -A; if ($?) { git commit -m "wip" }'), ['wip']);
  assert.deepEqual(ps('& git commit -m "docs: a `"quoted`" word"'), ['docs: a "quoted" word']);
  assert.deepEqual(ps('gh pr create --title "chore: tidy" --body @\'\nline\n\'@'), ['chore: tidy']);
});

test('length counts characters, not bytes; Cyrillic in every Unicode block is caught', () => {
  assert.equal(validateHeader(`fix: ${'é'.repeat(95)}`), null);
  assert.equal(validateHeader(`fix: ${'😀'.repeat(95)}`), null); // astral: one character each
  assert.match(validateHeader(`fix: ${'😀'.repeat(96)}`), /101 characters/);
  for (const ch of ['ѐ', 'ԯ', 'ᲀ', 'ⷠ', 'Ꙁ']) {
    assert.match(validateHeader(`fix: a ${ch} b`), /Cyrillic/, ch);
  }
});

test('bash: more option shapes of git commit', () => {
  const h = (c) => extractHeaders(c).map((f) => f.header);
  assert.deepEqual(h('git commit --message "fix: spaced"'), ['fix: spaced']);
  assert.deepEqual(h('git commit -sm "fix: signed off"'), ['fix: signed off']);
  assert.deepEqual(h('git commit -a -m "fix: separate"'), ['fix: separate']);
  assert.deepEqual(h('git -c user.name=x commit -m "fix: config"'), ['fix: config']);
  assert.deepEqual(h('git --no-pager commit -m "fix: global flag"'), ['fix: global flag']);
  assert.deepEqual(h("git commit -m $'fix: ansi\\n\\nbody'"), ['fix: ansi']);
  assert.deepEqual(h('git commit \\\n  -m "fix: continued"'), ['fix: continued']);
  assert.deepEqual(h('false || git commit -m "fix: after or"'), ['fix: after or']);
  assert.deepEqual(h('env FOO=1 sudo git commit -m "fix: prefixed"'), ['fix: prefixed']);
  assert.deepEqual(h('/usr/bin/git commit -m "fix: full path"'), ['fix: full path']);
  assert.deepEqual(h('git commit -m "first\nsecond"'), ['first']);
  assert.deepEqual(h('git commit -m "\n\nfix: leading blank lines"'), ['fix: leading blank lines']);
});

test('bash: unparseable or non-inline forms stay allowed', () => {
  for (const cmd of [
    'git commit -m `date`',
    'git commit --message="$MSG"',
    'git commit -Fmsg.txt',
    'git commit --reuse-message=HEAD',
    'git commit --squash=HEAD',
    'git commit --template=tpl.txt',
    'git commit -- -m',
    'git commit -m',
  ]) {
    assert.deepEqual(extractHeaders(cmd), [], cmd);
  }
});

test('several commands: every header is checked', () => {
  const cmd = 'git commit -m "fix: good" && gh pr create --title "bad title"';
  assert.deepEqual(extractHeaders(cmd).map((f) => f.header), ['fix: good', 'bad title']);
  const message = checkCommand(cmd);
  assert.match(message, /gh pr create --title: "bad title"/);
  assert.doesNotMatch(message, /fix: good/);
});

test('gh: other subcommands and dynamic titles are allowed', () => {
  for (const cmd of [
    'gh pr create --title "$TITLE"',
    'gh pr merge 12 --squash',
    'gh issue create --title "anything"',
    'gh pr edit 12 --body "no title change"',
  ]) {
    assert.deepEqual(extractHeaders(cmd), [], cmd);
  }
  assert.equal(extractHeaders('gh.exe pr edit 3 -t"fix: glued"')[0].header, 'fix: glued');
});

test('powershell: backtick continuation, call operator with path', () => {
  const ps = (c) => extractHeaders(c, 'powershell').map((f) => f.header);
  assert.deepEqual(ps('git commit `\n  -m "fix: continued"'), ['fix: continued']);
  assert.deepEqual(ps('& "C:\\Program Files\\Git\\cmd\\git.exe" commit -m "fix: path"'), ['fix: path']);
  assert.deepEqual(ps('git commit -m "fix: $($x.Title)"'), []);
  assert.deepEqual(ps('git commit -m "fix: a`nbody"'), ['fix: a']);
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
