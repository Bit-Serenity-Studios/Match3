#!/usr/bin/env node
/**
 * Emit 60 level JSON files and a TypeScript catalog module.
 *
 * Source of truth: the PACING table below. Regenerating is deterministic —
 * the same table always produces the same files. Individual JSONs may be
 * hand-tuned after generation; a subsequent run WILL overwrite hand-tunes.
 * To preserve a hand-tuned level, remove it from PACING or add a `frozen`
 * flag (not implemented — future work).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEVELS_DIR = path.join(ROOT, 'levels');
const CATALOG_TS = path.join(ROOT, 'src/levels/generated.ts');

const COLORS = ['moonpetal', 'vial', 'runestone', 'resin', 'mushroom'];

// Archetype table for levels 1..60. Hard checkpoints at 10, 18, 27, 36, 45, 54.
const ARCH = [
  // 1-5 tutorial
  'tutorial', 'tutorial', 'tutorial', 'tutorial', 'tutorial',
  // 6-10
  'wow', 'procrastinating', 'procrastinating', 'wow', 'hard',
  // 11-18
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'procrastinating', 'procrastinating', 'hard',
  // 19-27
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'hard',
  // 28-36
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'hard',
  // 37-45
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'hard',
  // 46-54
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'hard',
  // 55-60
  'wow', 'procrastinating', 'procrastinating', 'wow', 'procrastinating', 'wow',
];
if (ARCH.length !== 60) throw new Error(`ARCH length ${ARCH.length} !== 60`);

function pad(n) {
  return String(n).padStart(3, '0');
}

function seedFor(i) {
  // Stable seed per level, different from level 0.
  return 20260702 + i * 131;
}

function uniformWeights() {
  return { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 };
}

function biasedWeights(color, boost = 1.3) {
  const w = uniformWeights();
  w[color] = boost;
  return w;
}

/** Return primary color rotating through the palette for variety. */
function primary(i) {
  return COLORS[i % COLORS.length];
}
function secondary(i) {
  return COLORS[(i + 2) % COLORS.length];
}

function tutorialLevel(i) {
  const num = i + 1;
  const color = primary(i);
  // Very generous: small grid, lots of moves, low objectives.
  return {
    id: `level-${pad(num)}`,
    width: 6,
    height: 7,
    dropWeights: biasedWeights(color, 1.4),
    objectives: [{ kind: 'collectColor', color, count: 8 + i * 2 }],
    moves: 28 + i * 2,
    archetype: 'tutorial',
    seed: seedFor(i),
  };
}

function wowLevel(i) {
  const num = i + 1;
  const color = primary(i);
  return {
    id: `level-${pad(num)}`,
    width: 7,
    height: 8,
    dropWeights: biasedWeights(color, 1.15),
    objectives: [{ kind: 'collectColor', color, count: 24 }],
    moves: 20,
    archetype: 'wow',
    seed: seedFor(i),
  };
}

function procLevel(i, subIndex) {
  const num = i + 1;
  const colorA = primary(i);
  const colorB = secondary(i);
  const variant = subIndex % 3;
  const layout = new Array(7 * 8).fill(null);
  if (variant === 1) {
    for (let c = 2; c <= 4; c++) {
      layout[2 * 7 + c] = {
        color: colorA,
        blocker: { kind: 'frostGlass', layers: 1 },
      };
    }
  } else if (variant === 2) {
    for (let c = 2; c <= 4; c++) {
      layout[3 * 7 + c] = {
        color: colorA,
        blocker: { kind: 'vine', layers: 2 },
      };
    }
  }
  const objectives = [];
  if (variant === 0) {
    objectives.push({ kind: 'collectColor', color: colorA, count: 34 });
    objectives.push({ kind: 'collectColor', color: colorB, count: 22 });
    objectives.push({ kind: 'score', target: 7500 });
  } else if (variant === 1) {
    objectives.push({ kind: 'collectColor', color: colorA, count: 38 });
    objectives.push({ kind: 'clearBlockers', blocker: 'frostGlass' });
  } else {
    objectives.push({ kind: 'collectColor', color: colorB, count: 34 });
    objectives.push({ kind: 'clearBlockers', blocker: 'vine' });
  }
  return {
    id: `level-${pad(num)}`,
    width: 7,
    height: 8,
    layout,
    dropWeights: { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 },
    objectives,
    moves: 15,
    archetype: 'procrastinating',
    seed: seedFor(i),
  };
}

function hardLevel(i, hardIndex) {
  const num = i + 1;
  const colorA = primary(i);
  const colorB = secondary(i);
  const w = 8;
  const h = 9;
  const layout = new Array(w * h).fill(null);
  // Base blockers scale with hardIndex.
  // Always: some vines around center; stone runes at 4 fixed spots; ivy 1-2.
  const vineSpots = [
    [3, 2], [3, 5], [4, 2], [4, 5], [5, 2], [5, 5],
  ];
  for (const [r, c] of vineSpots) {
    layout[r * w + c] = {
      color: colorA,
      blocker: { kind: 'vine', layers: 2 },
    };
  }
  // Stone runes in 4 spots to complicate flows.
  const stoneSpots = [[2, 3], [2, 4], [6, 3], [6, 4]];
  for (const [r, c] of stoneSpots) {
    layout[r * w + c] = {
      color: null,
      blocker: { kind: 'stoneRune', layers: 1 },
    };
  }
  // Ivy seeds (1 for early hards, 2 for later)
  const ivyCount = hardIndex >= 3 ? 2 : 1;
  const ivySpots = [[0, 0], [h - 1, w - 1]].slice(0, ivyCount);
  for (const [r, c] of ivySpots) {
    layout[r * w + c] = {
      color: colorB,
      blocker: { kind: 'ivy', layers: 1 },
    };
  }
  const moves = 12 - Math.min(2, hardIndex);
  const objectives = [
    { kind: 'collectColor', color: colorA, count: 45 + hardIndex * 4 },
    { kind: 'collectColor', color: colorB, count: 28 + hardIndex * 2 },
    { kind: 'clearBlockers', blocker: 'vine' },
  ];
  return {
    id: `level-${pad(num)}`,
    width: w,
    height: h,
    layout,
    dropWeights: biasedWeights(colorA, 1.1),
    objectives,
    moves,
    archetype: 'hard',
    seed: seedFor(i),
  };
}

function buildAll() {
  const out = [];
  let procSub = 0;
  let hardIndex = 0;
  for (let i = 0; i < 60; i++) {
    const a = ARCH[i];
    let lv;
    if (a === 'tutorial') lv = tutorialLevel(i);
    else if (a === 'wow') {
      lv = wowLevel(i);
      procSub = 0;
    } else if (a === 'procrastinating') {
      lv = procLevel(i, procSub);
      procSub++;
    } else if (a === 'hard') {
      lv = hardLevel(i, hardIndex);
      hardIndex++;
      procSub = 0;
    } else throw new Error(`unknown archetype ${a} at ${i}`);
    out.push(lv);
  }
  return out;
}

function main() {
  fs.mkdirSync(LEVELS_DIR, { recursive: true });
  const levels = buildAll();
  for (const lv of levels) {
    const p = path.join(LEVELS_DIR, `${lv.id}.json`);
    fs.writeFileSync(p, JSON.stringify(lv, null, 2) + '\n');
  }
  const importLines = levels
    .map((lv, i) => `import lv${pad(i + 1)} from '../../levels/${lv.id}.json';`)
    .join('\n');
  const arrayLines = levels
    .map((lv, i) => `  lv${pad(i + 1)} as unknown,`)
    .join('\n');
  const ts =
    '/* AUTO-GENERATED by scripts/gen-levels.mjs — do not edit. */\n' +
    importLines +
    '\n\nexport const LEVEL_JSONS: readonly unknown[] = [\n' +
    arrayLines +
    '\n];\n';
  fs.mkdirSync(path.dirname(CATALOG_TS), { recursive: true });
  fs.writeFileSync(CATALOG_TS, ts);
  console.log(`Wrote ${levels.length} levels to ${LEVELS_DIR}/`);
  console.log(`Wrote catalog module to ${CATALOG_TS}`);
}

main();
