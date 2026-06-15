// src/utils/themeEngine.ts
//
// Pure-code theme clustering. No AI.
// Maps raw pros/cons strings → canonical theme names → frequency counts.

import { ThemeFrequency } from '../types';

// ─── Theme Map ────────────────────────────────────────────────────────────────
// keyword (lowercase substring) → canonical theme label

const PROS_THEME_MAP: Array<[string, string]> = [
  // Learning & Growth
  ['learning', 'Learning & Growth'],
  ['training', 'Learning & Growth'],
  ['growth', 'Learning & Growth'],
  ['develop', 'Learning & Growth'],
  ['upskill', 'Learning & Growth'],
  ['mentorship', 'Learning & Growth'],
  ['knowledge', 'Learning & Growth'],
  ['skill', 'Learning & Growth'],

  // Compensation
  ['compensation', 'Compensation'],
  ['salary', 'Compensation'],
  ['pay ', 'Compensation'],
  ['package', 'Compensation'],
  ['hike', 'Compensation'],
  ['increment', 'Compensation'],
  ['bonus', 'Compensation'],
  ['ctc', 'Compensation'],
  ['stipend', 'Compensation'],

  // Work Culture
  ['culture', 'Work Culture'],
  ['environment', 'Work Culture'],
  ['atmosphere', 'Work Culture'],
  ['workplace', 'Work Culture'],
  ['diversity', 'Work Culture'],
  ['inclusive', 'Work Culture'],
  ['friendly', 'Work Culture'],

  // Brand Value
  ['brand', 'Brand Value'],
  ['reputation', 'Brand Value'],
  ['name', 'Brand Value'],
  ['recognition', 'Brand Value'],
  ['prestigious', 'Brand Value'],
  ['well-known', 'Brand Value'],

  // Team & Colleagues
  ['team', 'Team & Colleagues'],
  ['colleague', 'Team & Colleagues'],
  ['coworker', 'Team & Colleagues'],
  ['co-worker', 'Team & Colleagues'],
  ['smart', 'Team & Colleagues'],
  ['talented', 'Team & Colleagues'],
  ['people', 'Team & Colleagues'],

  // Work-Life Balance
  ['work life', 'Work-Life Balance'],
  ['work-life', 'Work-Life Balance'],
  ['balance', 'Work-Life Balance'],
  ['flexible', 'Work-Life Balance'],
  ['remote', 'Work-Life Balance'],
  ['wfh', 'Work-Life Balance'],
  ['hybrid', 'Work-Life Balance'],

  // Job Security
  ['job security', 'Job Security'],
  ['stable', 'Job Security'],
  ['stability', 'Job Security'],
  ['secure', 'Job Security'],

  // Benefits & Perks
  ['benefit', 'Benefits & Perks'],
  ['perk', 'Benefits & Perks'],
  ['insurance', 'Benefits & Perks'],
  ['health', 'Benefits & Perks'],
  ['cab', 'Benefits & Perks'],
  ['food', 'Benefits & Perks'],
  ['canteen', 'Benefits & Perks'],

  // Promotion & Career
  ['promotion', 'Promotion & Career'],
  ['appraisal', 'Promotion & Career'],
  ['career', 'Promotion & Career'],
  ['opportunity', 'Promotion & Career'],
];

const CONS_THEME_MAP: Array<[string, string]> = [
  // Work Pressure
  ['pressure', 'Work Pressure'],
  ['workload', 'Work Pressure'],
  ['stress', 'Work Pressure'],
  ['hectic', 'Work Pressure'],
  ['deadline', 'Work Pressure'],
  ['demanding', 'Work Pressure'],
  ['burnout', 'Work Pressure'],

  // Long Hours
  ['long hours', 'Long Hours'],
  ['overtime', 'Long Hours'],
  ['late', 'Long Hours'],
  ['weekend', 'Long Hours'],
  ['night shift', 'Long Hours'],
  ['work hours', 'Long Hours'],
  ['extra hours', 'Long Hours'],

  // Management Issues
  ['management', 'Management Issues'],
  ['manager', 'Management Issues'],
  ['leadership', 'Management Issues'],
  ['micromanage', 'Management Issues'],
  ['politics', 'Management Issues'],
  ['favorit', 'Management Issues'],   // favoritism
  ['nepot', 'Management Issues'],     // nepotism

  // Work-Life Balance
  ['work life', 'Work-Life Balance'],
  ['work-life', 'Work-Life Balance'],
  ['no balance', 'Work-Life Balance'],
  ['poor balance', 'Work-Life Balance'],
  ['personal time', 'Work-Life Balance'],

  // Promotion Delays
  ['slow promotion', 'Promotion Delays'],
  ['no promotion', 'Promotion Delays'],
  ['promotion slow', 'Promotion Delays'],
  ['appraisal slow', 'Promotion Delays'],
  ['career growth slow', 'Promotion Delays'],
  ['glass ceiling', 'Promotion Delays'],
  ['stuck', 'Promotion Delays'],

  // Low Salary / Hike
  ['low salary', 'Low Compensation'],
  ['below market', 'Low Compensation'],
  ['low hike', 'Low Compensation'],
  ['low increment', 'Low Compensation'],
  ['poor hike', 'Low Compensation'],
  ['underpaid', 'Low Compensation'],
  ['not competitive', 'Low Compensation'],

  // Job Instability
  ['layoff', 'Job Instability'],
  ['retrench', 'Job Instability'],
  ['downsiz', 'Job Instability'],
  ['job security', 'Job Instability'],
  ['uncertain', 'Job Instability'],

  // Communication
  ['communication', 'Poor Communication'],
  ['transparency', 'Poor Communication'],
  ['no feedback', 'Poor Communication'],
  ['unclear', 'Poor Communication'],

  // Process & Bureaucracy
  ['bureaucracy', 'Bureaucracy'],
  ['process', 'Bureaucracy'],
  ['slow process', 'Bureaucracy'],
  ['red tape', 'Bureaucracy'],
  ['approval', 'Bureaucracy'],
];

// ─── Clustering Engine ────────────────────────────────────────────────────────

// Strings that indicate UI/navigation/call-to-action text (not real pros/cons)
const GARBAGE_PATTERNS = [
  'sign in', 'sign up', 'log in', 'create account', 'get started',
  'employer', 'employers', 'post job', 'find jobs', 'upload resume',
  'search jobs', 'browse jobs', 'apply now', 'submit your',
  'for employers', 'for job seekers', ' resources',
  'salary calculator', 'salary estimate', 'benchmark', 'explore',
  ' cookie', 'privacy', 'terms of', 'all rights reserved',
  '©', '™', '®',
];

export function matchTheme(
  text: string,
  themeMap: Array<[string, string]>
): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, theme] of themeMap) {
    if (lower.includes(keyword)) {
      return theme;
    }
  }
  return null;
}

function isGarbageFallback(text: string): boolean {
  const lower = text.toLowerCase();
  return GARBAGE_PATTERNS.some(p => lower.includes(p));
}

export function clusterThemes(
  rawStrings: string[],
  themeMap: Array<[string, string]>
): ThemeFrequency[] {
  const counts = new Map<string, number>();

  for (const raw of rawStrings) {
    if (!raw || raw.trim().length < 3) continue;
    const theme = matchTheme(raw, themeMap);
    if (theme) {
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    } else {
      // Skip fallback if the raw string looks like UI/nav garbage
      if (isGarbageFallback(raw)) continue;
      // Fallback: use a trimmed, normalized version of the first 60 chars
      const fallback = raw.trim().substring(0, 60);
      if (fallback.length >= 8) {
        counts.set(fallback, (counts.get(fallback) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);
}

export function clusterPros(rawPros: string[]): ThemeFrequency[] {
  return clusterThemes(rawPros, PROS_THEME_MAP);
}

export function clusterCons(rawCons: string[]): ThemeFrequency[] {
  return clusterThemes(rawCons, CONS_THEME_MAP);
}

export function topThemes(
  themed: ThemeFrequency[],
  limit = 5
): string[] {
  return themed.slice(0, limit).map(t => t.theme);
}
