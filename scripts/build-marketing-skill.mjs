#!/usr/bin/env node
// Reads src/skills/marketing-planner.md and emits src/lib/marketing-skill-bundled.ts
// Run after editing the .md so the Edge-runtime week-plan endpoint sees the change.
import fs from 'fs';
const md = fs.readFileSync('src/skills/marketing-planner.md', 'utf8');
const escaped = md
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');
const out =
  '// @ts-nocheck\n' +
  '// AUTO-GENERATED from src/skills/marketing-planner.md — bundled string for Edge runtime use.\n' +
  '// Re-run scripts/build-marketing-skill.mjs after editing the .md file.\n' +
  'export const MARKETING_SKILL: string = `' + escaped + '`;\n';
fs.writeFileSync('src/lib/marketing-skill-bundled.ts', out);
console.log(`wrote ${out.length} bytes (${md.length} bytes source)`);
