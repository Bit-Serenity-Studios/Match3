/**
 * CLI simulator entry point.
 *
 * Usage:
 *   npm run sim                       # sim all levels with defaults
 *   npm run sim -- --attempts 50      # override attempts per level
 *   npm run sim:one -- level-018      # sim one level
 *   npm run sim -- --json out.json    # write JSON report
 */
import fs from 'node:fs';
import path from 'node:path';
import { LEVELS, getLevel } from '../../src/levels/catalog';
import {
  APS_TARGETS,
  flagOutliers,
  simulateLevel,
  type LevelSimResult,
} from './runner';

interface CliArgs {
  attempts: number;
  json?: string;
  onlyLevel?: string;
  strict?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { attempts: 25 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--attempts' && argv[i + 1]) {
      out.attempts = parseInt(argv[++i]!, 10);
    } else if (a === '--json' && argv[i + 1]) {
      out.json = argv[++i];
    } else if (a === '--level' && argv[i + 1]) {
      out.onlyLevel = argv[++i];
    } else if (a === '--strict') {
      out.strict = true;
    } else if (a && /^level-\d+$/.test(a)) {
      out.onlyLevel = a;
    }
  }
  return out;
}

function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '∞';
  return x.toFixed(digits);
}

function padR(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function color(s: string, code: string): string {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
const RED = (s: string) => color(s, '31');
const YEL = (s: string) => color(s, '33');
const GRN = (s: string) => color(s, '32');
const DIM = (s: string) => color(s, '2');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const levels = args.onlyLevel
    ? [getLevel(args.onlyLevel)].filter((l): l is NonNullable<typeof l> => !!l)
    : LEVELS;
  if (levels.length === 0) {
    console.error(`No level matches "${args.onlyLevel}"`);
    process.exit(1);
  }
  console.log(
    `Simulating ${levels.length} level(s) × ${args.attempts} attempts each\n`,
  );
  const header = [
    padR('level', 12),
    padR('arch', 16),
    padR('APS', 8),
    padR('target', 12),
    padR('wins/att', 10),
    padR('~moves', 8),
    padR('failΔ', 8),
    'flags',
  ].join(' ');
  console.log(DIM(header));
  const results: LevelSimResult[] = [];
  const outliers: string[] = [];
  for (const lv of levels) {
    const r = simulateLevel(lv, { attemptsPerLevel: args.attempts });
    results.push(r);
    const flags = flagOutliers(r);
    const target = APS_TARGETS[r.archetype];
    const flagStr = [
      flags.apsTooLow ? YEL('easy') : '',
      flags.apsTooHigh ? RED('hard') : '',
      flags.failMarginTooLarge ? RED('blowout') : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (flagStr) outliers.push(r.levelId);
    const apsStr =
      flags.apsTooHigh || flags.apsTooLow ? YEL(fmt(r.aps)) : GRN(fmt(r.aps));
    const targetStr = `${fmt(target.min, 1)}-${fmt(target.max, 1)}`;
    const line = [
      padR(r.levelId, 12),
      padR(r.archetype, 16),
      padR(apsStr, 8 + (apsStr.length - fmt(r.aps).length)),
      padR(targetStr, 12),
      padR(`${r.wins}/${r.attempts}`, 10),
      padR(fmt(r.meanMovesRemaining, 1), 8),
      padR(fmt(r.medianFailMargin), 8),
      flagStr,
    ].join(' ');
    console.log(line);
  }
  console.log();
  console.log(
    DIM(
      `${outliers.length}/${results.length} outside archetype APS band` +
        (outliers.length ? `: ${outliers.slice(0, 8).join(', ')}${outliers.length > 8 ? ', …' : ''}` : ''),
    ),
  );
  if (args.json) {
    const abs = path.resolve(process.cwd(), args.json);
    fs.writeFileSync(abs, JSON.stringify(results, null, 2));
    console.log(DIM(`\nWrote JSON report to ${abs}`));
  }
  // Exit non-zero on outliers only in --strict mode (default is informational).
  process.exit(args.strict && outliers.length > 0 ? 1 : 0);
}

main();
