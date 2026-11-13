#!/usr/bin/env node
// Parses every tracked *.json file; fails with a GitHub annotation per broken file.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z', '--', '*.json'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let bad = 0;
for (const file of files) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
    console.log(`ok  ${file}`);
  } catch (error) {
    bad++;
    console.log(`::error file=${file}::${error.message}`);
  }
}
process.exit(bad ? 1 : 0);
