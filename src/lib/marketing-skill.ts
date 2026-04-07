// @ts-nocheck
// Loads the marketing-planner skill (the deterministic playbook used as the
// system prompt when the AI generates monthly plans). Bundled at build time
// via fs read so the skill ships with the deploy.

import fs from 'fs';
import path from 'path';

let cached: string | null = null;

export function loadMarketingSkill(): string {
  if (cached) return cached;
  try {
    const p = path.join(process.cwd(), 'src', 'skills', 'marketing-planner.md');
    cached = fs.readFileSync(p, 'utf8');
    return cached;
  } catch (e) {
    console.warn('[marketing-skill] failed to load', e);
    return '';
  }
}
