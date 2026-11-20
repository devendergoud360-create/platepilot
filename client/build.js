/**
 * Builds a fully static GitHub Pages site under dist/
 * - inlines recipes as window.PLATEPILOT_RECIPES
 * - copies engine, app, css, chart CDN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(__dirname, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// recipes embedded for offline / Pages
const recipes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'recipes.json'), 'utf8'));
fs.writeFileSync(
  path.join(dist, 'data.js'),
  `window.PLATEPILOT_RECIPES = ${JSON.stringify(recipes)};\n`
);

// static assets
fs.copyFileSync(path.join(root, 'public', 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'public', 'style.css'), path.join(dist, 'style.css'));
fs.copyFileSync(path.join(root, 'public', 'app.js'), path.join(dist, 'app.js'));
fs.copyFileSync(path.join(__dirname, 'platepilot-engine.js'), path.join(dist, 'platepilot-engine.js'));

// inject data.js before app.js in index.html
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('data.js')) {
  html = html.replace(
    '<script src="app.js"></script>',
    '<script src="data.js"></script>\n  <script src="app.js" type="module"></script>'
  );
  // remove old non-module script tag pattern if any
  html = html.replace('<script src="app.js"></script>', '');
}
fs.writeFileSync(path.join(dist, 'index.html'), html);

// copy data for API-less local server option
fs.mkdirSync(path.join(dist, 'data'), { recursive: true });
fs.copyFileSync(path.join(root, 'data', 'recipes.json'), path.join(dist, 'data', 'recipes.json'));

// also prepare gh-pages branch content at client/gh-pages-content for easy push
const ghDir = path.join(__dirname, 'gh-pages-content');
fs.rmSync(ghDir, { recursive: true, force: true });
fs.mkdirSync(ghDir, { recursive: true });
for (const f of fs.readdirSync(dist)) {
  fs.cpSync(path.join(dist, f), path.join(ghDir, f), { recursive: true });
}

console.log('Built static site →', dist);
console.log('Recipes embedded:', recipes.length);
