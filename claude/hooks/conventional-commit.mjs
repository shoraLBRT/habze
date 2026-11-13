#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash and PowerShell tools): blocks a `git commit` with an inline
// message, or a `gh pr create` / `gh pr edit` with --title, whose header is not a Conventional
// Commit as defined by habze's STANDARD.md. Exit 2 + stderr blocks the call; anything it cannot
// parse (-F file, editor, variables) is allowed. No dependencies; Node 18+.

import { pathToFileURL } from 'node:url';

export const TYPES = [
  'feat', 'fix', 'perf', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore', 'revert',
];
export const MAX_HEADER = 100;

const CYRILLIC = /[\u0400-\u052F\u1C80-\u1C8F\u2DE0-\u2DFF\uA640-\uA69F]/u;
const HEADER = /^([a-z]+)(\(([^()\s][^()]*)\))?(!)?: (\S.*)$/u;
// Messages git itself writes; let them through untouched.
const GIT_DEFAULTS = [/^Merge /u, /^Revert ".*"$/u, /^(fixup|squash|amend)! /u];

/** Validates one header line. Returns null when it is fine, otherwise the reason. */
export function validateHeader(header) {
  const line = header.trim();
  if (line === '') return 'the header is empty';
  if (CYRILLIC.test(line)) return 'the header contains Cyrillic; write it in English';
  if ([...line].length > MAX_HEADER) {
    return `the header is ${[...line].length} characters; the limit is ${MAX_HEADER}`;
  }
  if (GIT_DEFAULTS.some((re) => re.test(line))) return null;
  const m = HEADER.exec(line);
  if (!m) {
    return 'the header is not "<type>[(scope)][!]: <description>"';
  }
  if (!TYPES.includes(m[1])) {
    return `"${m[1]}" is not an allowed type (allowed: ${TYPES.join(', ')})`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Tokenizer: splits a shell command line into simple commands made of words. Each word is
// { text, dynamic } where dynamic means it contains something only the shell can expand.

const HEREDOC_SUBST = /^\$\(\s*cat\s+<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\2[ \t]*\r?\n?\s*\)/u;

export function tokenize(command, shell = 'bash') {
  const ps = shell === 'powershell';
  const commands = [];
  let words = [];
  let word = null; // { text, dynamic }
  const pendingHeredocs = [];
  let i = 0;
  const s = command;

  const startWord = () => { if (!word) word = { text: '', dynamic: false }; };
  const endWord = () => { if (word) { words.push(word); word = null; } };
  const endCommand = () => { endWord(); if (words.length) commands.push(words); words = []; };

  const skipHeredocBodies = () => {
    // Called right after a newline: skip the bodies of `<<EOF` redirections seen on that line.
    while (pendingHeredocs.length) {
      const { delim, strip } = pendingHeredocs.shift();
      while (i < s.length) {
        let end = s.indexOf('\n', i);
        if (end === -1) end = s.length;
        let line = s.slice(i, end).replace(/\r$/u, '');
        if (strip) line = line.replace(/^\t+/u, '');
        i = end + 1;
        if (line === delim) break;
      }
    }
  };

  while (i < s.length) {
    const c = s[i];
    const next = s[i + 1];

    // Command separators.
    if (c === '\n') { endCommand(); i++; skipHeredocBodies(); continue; }
    if (c === ';' || c === '|' || c === '&' || c === '(' || c === ')' || (c === '{' && !word) || (c === '}' && !word)) {
      if (ps && c === '&' && next !== '&' && !word) { i++; continue; } // call operator
      endCommand();
      i += (c === '&' || c === '|') && next === c ? 2 : 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') { endWord(); i++; continue; }
    if (c === '#' && !word) { // comment to the end of the line
      const end = s.indexOf('\n', i);
      i = end === -1 ? s.length : end;
      continue;
    }

    if (!ps && c === '\\') {
      if (next === '\n') { i += 2; continue; } // line continuation
      startWord(); word.text += next ?? ''; i += 2; continue;
    }
    if (ps && c === '`') {
      if (next === '\n' || (next === '\r' && s[i + 2] === '\n')) { i += next === '\r' ? 3 : 2; endWord(); continue; }
      startWord(); word.text += next === 'n' ? '\n' : (next ?? ''); i += 2; continue;
    }

    // Bash heredoc redirection on the command line (`<<'EOF'`), not a here-string (`<<<`).
    if (!ps && c === '<' && next === '<' && s[i + 2] !== '<') {
      endWord();
      const m = /^<<(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/u.exec(s.slice(i));
      if (m) { pendingHeredocs.push({ delim: m[3], strip: m[1] === '-' }); i += m[0].length; continue; }
      i += 2; continue;
    }

    // PowerShell here-strings: @' ... '@ and @" ... "@ (the opener ends its line).
    if (ps && c === '@' && (next === "'" || next === '"') && /^@['"][ \t]*\r?\n/u.test(s.slice(i))) {
      const quote = next;
      const bodyStart = s.indexOf('\n', i) + 1;
      const close = new RegExp(`\\r?\\n${quote}@`, 'u');
      const rest = s.slice(bodyStart);
      const m = close.exec(rest);
      const body = m ? rest.slice(0, m.index) : rest;
      startWord();
      word.text += body;
      if (quote === '"' && /\$[\w({]/u.test(body)) word.dynamic = true;
      i = m ? bodyStart + m.index + m[0].length : s.length;
      continue;
    }

    if (c === "'") {
      startWord();
      if (ps) {
        i++;
        while (i < s.length) {
          if (s[i] === "'" && s[i + 1] === "'") { word.text += "'"; i += 2; continue; }
          if (s[i] === "'") { i++; break; }
          word.text += s[i++];
        }
      } else {
        const end = s.indexOf("'", i + 1);
        word.text += s.slice(i + 1, end === -1 ? s.length : end);
        i = end === -1 ? s.length : end + 1;
      }
      continue;
    }

    if (!ps && c === '$' && next === "'") {
      // ANSI-C quoting: $'line\nline'
      startWord();
      i += 2;
      while (i < s.length && s[i] !== "'") {
        if (s[i] === '\\' && i + 1 < s.length) {
          const e = s[i + 1];
          word.text += e === 'n' ? '\n' : e === 't' ? '\t' : e;
          i += 2;
        } else {
          word.text += s[i++];
        }
      }
      i++;
      continue;
    }

    if (c === '"') {
      startWord();
      i++;
      while (i < s.length && s[i] !== '"') {
        const d = s[i];
        if (ps && d === '`') { const e = s[i + 1]; word.text += e === 'n' ? '\n' : (e ?? ''); i += 2; continue; }
        if (ps && d === '"' && s[i + 1] === '"') { word.text += '"'; i += 2; continue; }
        if (!ps && d === '\\' && '"\\$`\n'.includes(s[i + 1])) {
          if (s[i + 1] !== '\n') word.text += s[i + 1];
          i += 2;
          continue;
        }
        if (d === '$') {
          const m = ps ? null : HEREDOC_SUBST.exec(s.slice(i));
          if (m) { word.text += m[3]; i += m[0].length; continue; }
          if (/^\$[\w({]/u.test(s.slice(i, i + 2))) {
            word.dynamic = true;
            i = skipSubstitution(s, i);
            continue;
          }
        }
        if (!ps && d === '`') { word.dynamic = true; const end = s.indexOf('`', i + 1); i = end === -1 ? s.length : end + 1; continue; }
        word.text += d;
        i++;
      }
      i++; // closing quote
      continue;
    }

    if (c === '$' && /^\$[\w({]/u.test(s.slice(i, i + 2))) {
      startWord();
      const m = ps ? null : HEREDOC_SUBST.exec(s.slice(i));
      if (m) { word.text += m[3]; i += m[0].length; continue; }
      word.dynamic = true;
      i = skipSubstitution(s, i);
      continue;
    }
    if (!ps && c === '`') {
      startWord();
      word.dynamic = true;
      const end = s.indexOf('`', i + 1);
      i = end === -1 ? s.length : end + 1;
      continue;
    }

    startWord();
    word.text += c;
    i++;
  }
  endCommand();
  return commands;
}

// Skips $name, ${...} or $( ... ) starting at s[i] === '$'; returns the index after it.
function skipSubstitution(s, i) {
  const open = s[i + 1];
  if (open === '(' || open === '{') {
    const close = open === '(' ? ')' : '}';
    let depth = 0;
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === open) depth++;
      else if (s[j] === close && --depth === 0) return j + 1;
    }
    return s.length;
  }
  let j = i + 1;
  while (j < s.length && /[\w:]/u.test(s[j])) j++;
  return j;
}

// ---------------------------------------------------------------------------------------------
// Recognizing `git commit` and `gh pr create|edit` and pulling out the header.

const UNPARSEABLE = Symbol('unparseable');
const PREFIX_WORDS = new Set(['command', 'time', 'env', 'sudo', 'nohup', 'exec']);

function programName(text) {
  return text.replace(/^.*[\\/]/u, '').replace(/\.exe$/iu, '').toLowerCase();
}

function stripPrefix(words) {
  let k = 0;
  while (k < words.length && (/^[A-Za-z_]\w*=/u.test(words[k].text) || PREFIX_WORDS.has(words[k].text))) k++;
  return words.slice(k);
}

// Returns the commit message text, null (no inline message), or UNPARSEABLE.
function commitMessage(args) {
  const parts = [];
  const take = (w) => { if (!w || w.dynamic) return false; parts.push(w.text); return true; };
  for (let k = 0; k < args.length; k++) {
    const { text } = args[k];
    if (text === '--') break;
    if (text === '-m' || text === '--message') {
      if (!take(args[++k])) return UNPARSEABLE;
      continue;
    }
    if (text.startsWith('--message=')) {
      if (args[k].dynamic) return UNPARSEABLE;
      parts.push(text.slice('--message='.length));
      continue;
    }
    if (/^--(file|reuse-message|reedit-message|fixup|squash|template)(=|$)/u.test(text)) return UNPARSEABLE;
    if (/^-[A-Za-z]/u.test(text) && !text.startsWith('--')) {
      // Short-option cluster such as -am, -am"msg", -sF file.
      for (let p = 1; p < text.length; p++) {
        const f = text[p];
        if (f === 'm') {
          const rest = text.slice(p + 1);
          if (rest) { if (args[k].dynamic) return UNPARSEABLE; parts.push(rest); }
          else if (!take(args[++k])) return UNPARSEABLE;
          break;
        }
        if ('FCct'.includes(f)) return UNPARSEABLE;
        if (f === 'S' || f === 'u') break; // -S[<keyid>], -u[<mode>]
      }
    }
  }
  return parts.length ? parts.join('\n\n') : null;
}

function prTitle(args) {
  for (let k = 0; k < args.length; k++) {
    const { text, dynamic } = args[k];
    if (text === '--title' || text === '-t') {
      const w = args[k + 1];
      return !w || w.dynamic ? UNPARSEABLE : w.text;
    }
    if (text.startsWith('--title=')) return dynamic ? UNPARSEABLE : text.slice(8);
    if (/^-t./u.test(text)) return dynamic ? UNPARSEABLE : text.slice(2);
  }
  return null;
}

/** Finds headers to validate in a command line: [{ source, header }]. */
export function extractHeaders(command, shell = 'bash') {
  const found = [];
  for (const raw of tokenize(command, shell)) {
    const words = stripPrefix(raw);
    if (!words.length) continue;
    const prog = programName(words[0].text);
    if (prog === 'git') {
      let k = 1;
      while (k < words.length && words[k].text.startsWith('-')) {
        k += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(words[k].text) ? 2 : 1;
      }
      if (words[k]?.text !== 'commit') continue;
      const msg = commitMessage(words.slice(k + 1));
      if (msg === null || msg === UNPARSEABLE) continue;
      const header = msg.split(/\r?\n/u).find((l) => l.trim() !== '') ?? '';
      found.push({ source: 'git commit message', header: header.trim() });
    } else if (prog === 'gh' && words[1]?.text === 'pr' && ['create', 'edit'].includes(words[2]?.text)) {
      const title = prTitle(words.slice(3));
      if (title === null || title === UNPARSEABLE) continue;
      found.push({ source: `gh pr ${words[2].text} --title`, header: title.trim() });
    }
  }
  return found;
}

/** Returns null when the command may run, otherwise the message explaining the block. */
export function checkCommand(command, shell = 'bash') {
  const problems = [];
  for (const { source, header } of extractHeaders(command, shell)) {
    const reason = validateHeader(header);
    if (reason) problems.push(`${source}: "${header}" -- ${reason}.`);
  }
  if (!problems.length) return null;
  return [
    'Blocked by the habze conventional-commit hook:',
    ...problems.map((p) => `  - ${p}`),
    'Write the header as "<type>[(scope)][!]: <description>" in English, at most '
      + `${MAX_HEADER} characters.`,
    `Types: ${TYPES.join(', ')}. Breaking change: add "!" or a "BREAKING CHANGE:" footer.`,
    'Example: "fix(api): handle empty pagination cursor". Pick the type from the issue label.',
  ].join('\n');
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let event;
  try { event = JSON.parse(input); } catch { return 0; }
  const tool = event?.tool_name;
  const command = event?.tool_input?.command;
  if (typeof command !== 'string' || (tool !== 'Bash' && tool !== 'PowerShell')) return 0;
  const message = checkCommand(command, tool === 'PowerShell' ? 'powershell' : 'bash');
  if (!message) return 0;
  process.stderr.write(`${message}\n`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code), () => process.exit(0));
}
