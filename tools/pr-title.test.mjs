// Keeps the three copies of the rules in step: the commit-message hook, the reusable pr-title.yml
// workflow and STANDARD.md. Runs the workflow's own "habze rules" script with bash, so it needs
// bash, grep -P and a UTF-8 locale (ubuntu-latest, Git Bash). Run: node --test tools/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { MAX_HEADER, TYPES, validateHeader } from '../claude/hooks/conventional-commit.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const workflow = read('.github/workflows/pr-title.yml');
const standard = read('STANDARD.md');

// The lines of a YAML block scalar (`key: |`) that starts after `start` in `text`, dedented.
function blockAfter(text, start) {
  const lines = text.slice(text.indexOf(start)).split('\n');
  const head = lines.findIndex((l) => / \|$/u.test(l));
  assert.notEqual(head, -1, `no block scalar after ${start}`);
  const indent = lines[head].search(/\S/u);
  const body = [];
  for (const line of lines.slice(head + 1)) {
    if (line.trim() !== '' && line.search(/\S/u) <= indent) break;
    body.push(line);
  }
  const strip = Math.min(...body.filter((l) => l.trim()).map((l) => l.search(/\S/u)));
  return body.map((l) => l.slice(strip)).join('\n').trimEnd();
}

const workflowTypes = blockAfter(workflow, 'types:').split('\n').map((t) => t.trim());
const script = blockAfter(workflow, '- name: habze rules');

function workflowAccepts(title) {
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, TITLE: title, TYPES: workflowTypes.join('\n'), MAX: String(MAX_HEADER) },
  });
  assert.ok(r.status === 0 || r.status === 1, `script crashed for "${title}": ${r.stderr}`);
  return r.status === 0;
}

test('the workflow default types are the hook types', () => {
  assert.deepEqual(workflowTypes, TYPES);
});

test('the workflow default max-length is the hook limit', () => {
  const m = /max-length:[\s\S]*?default: (\d+)/u.exec(workflow);
  assert.equal(Number(m?.[1]), MAX_HEADER);
});

test('the STANDARD.md type table lists exactly the hook types', () => {
  const table = [...standard.matchAll(/^\| `([a-z]+)` \|/gmu)].map((m) => m[1]);
  assert.deepEqual(table, TYPES);
  assert.match(standard, new RegExp(`at most ${MAX_HEADER} characters`, 'u'));
});

test('the workflow script and the hook agree on PR titles', () => {
  for (const title of [
    'feat: add export to CSV',
    'fix(api): handle empty pagination cursor',
    'feat!: drop .NET 6 support',
    'refactor(core)!: split the parser',
    'chore(deps): update dependency xunit to v2.9.3',
    'fix(my area): a scope with a space',
    'revert: feat: add export to CSV',
    `fix: ${'a'.repeat(95)}`, // exactly 100 characters
    `fix: ${'é'.repeat(95)}`, // 100 characters, more than 100 bytes
    `fix: ${'a'.repeat(96)}`, // 101 characters
    'add export',
    'feature: add export',
    'hotfix: patch prod',
    'Feat: add export',
    'feat:add export',
    'feat:  two spaces',
    'feat(): add export',
    'feat(api) : add export',
    'feat(a(b)): nested scope',
    'fix: исправить ошибку',
    'fix(модуль): handle it',
    'WIP',
  ]) {
    assert.equal(workflowAccepts(title), validateHeader(title) === null, title);
  }
});
