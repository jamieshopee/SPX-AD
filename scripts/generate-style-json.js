/**
 * Developer Tool: generate-style-json.js
 *
 * This is not a runtime dependency. It is a maintenance script for creating
 * or completing templates/{size}/styles/*.json files from the current config.
 *
 * Usage:
 *   node scripts/generate-style-json.js
 *   node scripts/generate-style-json.js --count 17
 *
 * By default, style counts come from config/templates.json. The --count option
 * can be used when preparing a new style range before config is updated.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'templates.json');

const DEFAULT_COLORS = {
  headlineColor: 'rgb(143, 210, 241)',
  subHeadlineColor: 'rgb(253, 245, 161)',
  smallTextColor: 'rgb(143, 210, 241)',
};

function getCountOverride(argv) {
  const arg = argv.find((item) => item === '--count' || item.startsWith('--count='));
  if (!arg) return null;
  const value = arg === '--count'
    ? argv[argv.indexOf(arg) + 1]
    : arg.slice('--count='.length);
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Invalid --count value: ${value}`);
  }
  return count;
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getSizeFromPlacement(placement) {
  if (placement.width && placement.height) return `${placement.width}x${placement.height}`;
  const match = String(placement.name || '').match(/(\d+)x(\d+)/);
  if (match) return `${match[1]}x${match[2]}`;
  throw new Error(`Cannot infer size for placement: ${placement.id || placement.name || '(unknown)'}`);
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeStyleFile(size, id) {
  const stylesDir = path.join(ROOT, 'templates', size, 'styles');
  fs.mkdirSync(stylesDir, { recursive: true });

  const file = path.join(stylesDir, `${id}.json`);
  const current = readJsonIfExists(file);
  const next = {
    schema: 'spx-ad-style',
    id,
    name: current.name || `樣式 ${id}`,
    background: current.background || `assets/source/${size}/backgrounds/bg_${id}.png`,
    infoGraphic: current.infoGraphic || `assets/source/${size}/info/info_${id}.png`,
    headlineColor: current.headlineColor || DEFAULT_COLORS.headlineColor,
    subHeadlineColor: current.subHeadlineColor || DEFAULT_COLORS.subHeadlineColor,
    smallTextColor: current.smallTextColor || DEFAULT_COLORS.smallTextColor,
  };

  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  console.log(`updated ${path.relative(ROOT, file)}`);
}

function main() {
  const countOverride = getCountOverride(process.argv.slice(2));
  const config = readConfig();
  const placements = Array.isArray(config.placements) ? config.placements : [];

  for (const placement of placements) {
    const size = getSizeFromPlacement(placement);
    const templates = Array.isArray(placement.templates) ? placement.templates : [];
    const maxCount = Math.max(...templates.map((template) => Number(template.styleCount || 0)), 0);
    const styleCount = countOverride || maxCount || 16;

    for (let i = 1; i <= styleCount; i += 1) {
      const id = String(i).padStart(2, '0');
      writeStyleFile(size, id);
    }
  }
}

main();
