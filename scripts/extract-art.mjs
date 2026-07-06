/**
 * Extract curated game art from downloaded Iconify JSON packages into
 * standalone SVG files under assets/art/.
 *
 * Sources (both fetched from registry.npmjs.org):
 *   @iconify-json/fluent-emoji-flat — Microsoft Fluent Emoji, MIT
 *   @iconify-json/noto              — Google Noto Emoji, Apache 2.0
 *
 * Usage:
 *   npm pack @iconify-json/fluent-emoji-flat @iconify-json/noto
 *   tar xzf iconify-json-fluent-emoji-flat-*.tgz ... (see ART_SRC below)
 *   node scripts/extract-art.mjs <dir-with-extracted-packages>
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const ART_SRC = process.argv[2];
if (!ART_SRC) {
  console.error('usage: node scripts/extract-art.mjs <dir-with-extracted-iconify-packages>');
  process.exit(1);
}

/** Find the extracted package dir whose name starts with the prefix. */
function findPkg(prefix) {
  const hit = readdirSync(ART_SRC).find(
    (d) => d.startsWith(prefix) && !d.endsWith('.tgz'),
  );
  if (!hit) throw new Error(`package dir not found for ${prefix} in ${ART_SRC}`);
  return join(ART_SRC, hit);
}

function extractSet(pkgDir, outDir, wanted) {
  const data = JSON.parse(readFileSync(join(pkgDir, 'icons.json'), 'utf8'));
  const defaultW = data.width ?? 16;
  const defaultH = data.height ?? 16;
  mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const name of wanted) {
    const icon = data.icons[name];
    if (!icon) {
      console.warn(`  MISSING: ${name}`);
      continue;
    }
    const w = icon.width ?? defaultW;
    const h = icon.height ?? defaultH;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>\n`;
    writeFileSync(join(outDir, `${name}.svg`), svg);
    count++;
  }
  return count;
}

/* Fluent Emoji Flat (MIT) — the primary art set. */
const FLUENT_WANTED = [
  // Board tiles (match the 5 TileColors)
  'cherry-blossom', // moonpetal
  'test-tube', // vial
  'rock', // runestone
  'honey-pot', // resin
  'mushroom', // mushroom
  // Specials
  'bomb',
  'high-voltage',
  'rainbow',
  'collision',
  // Currencies + rewards
  'coin',
  'gem-stone',
  'star',
  'fire',
  'rosette',
  'wrapped-gift',
  'crown',
  'trophy',
  // Companions / creatures
  'butterfly',
  'owl',
  'fox',
  'frog',
  'bird',
  'paw-prints',
  // Apothecary ambience
  'crescent-moon',
  'full-moon',
  'sparkles',
  'candle',
  'teapot',
  'hot-beverage',
  'alembic',
  'magic-wand',
  'crystal-ball',
  'herb',
  'four-leaf-clover',
  'potted-plant',
  'seedling',
  'moon-viewing-ceremony',
  'night-with-stars',
  'milky-way',
  // Flowers / garden variety
  'hibiscus',
  'sunflower',
  'tulip',
  'blossom',
  'lotus',
  'fallen-leaf',
  'maple-leaf',
  'snowflake',
  'droplet',
  // UI
  'locked',
  'gear',
  'bell',
  'hourglass-done',
  'house',
  'shopping-bags',
  'shield',
  'scroll',
  'open-book',
  'books',
  'world-map',
];

/* Noto (Apache 2.0) — alternate tile style for A/B comparison. */
const NOTO_WANTED = [
  'cherry-blossom',
  'test-tube',
  'rock',
  'honey-pot',
  'mushroom',
  'crescent-moon',
  'star',
  'sparkles',
  'teapot',
  'crystal-ball',
  'magic-wand',
  'candle',
];

const fluentDir = findPkg('iconify-json-fluent-emoji-flat');
const notoDir = findPkg('iconify-json-noto');

const nFluent = extractSet(
  fluentDir,
  join(REPO, 'assets', 'art', 'fluent-emoji-flat'),
  FLUENT_WANTED,
);
const nNoto = extractSet(
  notoDir,
  join(REPO, 'assets', 'art', 'noto-emoji'),
  NOTO_WANTED,
);

console.log(`extracted ${nFluent} fluent-emoji-flat SVGs, ${nNoto} noto SVGs`);
