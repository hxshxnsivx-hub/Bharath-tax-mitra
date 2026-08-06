#!/usr/bin/env node
/**
 * Bundle-size budget guard for Bharat Tax Mitra (Phase 1 checkpoint task 1.7.4).
 *
 * Why this exists
 * ---------------
 * The app targets Tier-2/Tier-3 mobile networks in India where the initial
 * download directly determines time-to-interactive. We enforce a hard budget on
 * the *initial / eager* JavaScript transfer — the entry chunk plus every chunk
 * the browser is told to fetch up-front (statically-imported vendor chunks via
 * <link rel="modulepreload">). Lazy route chunks (React.lazy: ResultsView,
 * ChatView, ExportView, SettingsView, charts) are intentionally excluded because
 * they are fetched on demand and do not block first paint.
 *
 * Budget basis
 * ------------
 * 500 KB *compressed* (gzip) for initial JS. This mirrors vite.config.ts
 * `chunkSizeWarningLimit: 500` and the design's network budget. CSS is reported
 * for visibility but counted separately (it is small and not the bottleneck).
 *
 * How the initial set is discovered
 * ---------------------------------
 * We parse the built dist/index.html and treat as "initial":
 *   - the entry <script type="module" src="...">
 *   - every <link rel="modulepreload" href="...">
 * This follows Vite's own declaration of the eager dependency graph, so the
 * check stays correct even if chunk names/splitting change.
 *
 * Dependency-light by design: uses only Node built-ins (fs, path, zlib).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '..', 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
const INDEX_HTML = join(DIST_DIR, 'index.html');

// Initial JS budget: 500 KB compressed (gzip). See "Budget basis" above.
const INITIAL_JS_BUDGET_BYTES = 500 * 1024;

const KB = (bytes) => (bytes / 1024).toFixed(2) + ' KB';

function fail(message) {
  console.error(`\n[FAIL] check-bundle-size: ${message}\n`);
  process.exit(1);
}

if (!existsSync(INDEX_HTML)) {
  fail(`dist/index.html not found. Run "npm run build" first.`);
}

const html = readFileSync(INDEX_HTML, 'utf8');

// Collect the eager (initial) JS the browser fetches up-front:
//   - entry module script
//   - modulepreload links (statically-imported vendor/app chunks)
const initialJs = new Set();
const scriptRe = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+\.js)["']/g;
const preloadRe = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+\.js)["']/g;
for (const re of [scriptRe, preloadRe]) {
  let m;
  while ((m = re.exec(html)) !== null) {
    initialJs.add(m[1].replace(/^\//, '')); // strip leading slash → dist-relative
  }
}

if (initialJs.size === 0) {
  fail('Could not find any initial JS (entry script / modulepreload) in index.html.');
}

// Gzip each initial chunk and sum.
let initialGzipTotal = 0;
const rows = [];
for (const rel of initialJs) {
  const filePath = join(DIST_DIR, rel);
  if (!existsSync(filePath)) {
    fail(`Referenced initial chunk not found on disk: ${rel}`);
  }
  const raw = readFileSync(filePath);
  const gz = gzipSync(raw).length;
  initialGzipTotal += gz;
  rows.push({ file: rel.replace(/^assets\//, ''), raw: raw.length, gzip: gz, kind: 'initial' });
}

// Report (but do not budget) the entry CSS for visibility.
let cssGzipTotal = 0;
const cssRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css)["']/g;
let cm;
while ((cm = cssRe.exec(html)) !== null) {
  const rel = cm[1].replace(/^\//, '');
  const filePath = join(DIST_DIR, rel);
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath);
    const gz = gzipSync(raw).length;
    cssGzipTotal += gz;
    rows.push({ file: rel.replace(/^assets\//, ''), raw: raw.length, gzip: gz, kind: 'css' });
  }
}

// Identify lazy chunks (present in assets/ but not in the initial set) for context.
const lazyRows = [];
if (existsSync(ASSETS_DIR)) {
  for (const name of readdirSync(ASSETS_DIR)) {
    if (!name.endsWith('.js')) continue;
    const rel = `assets/${name}`;
    if (initialJs.has(rel)) continue;
    const raw = readFileSync(join(ASSETS_DIR, name));
    lazyRows.push({ file: name, raw: raw.length, gzip: gzipSync(raw).length, kind: 'lazy' });
  }
}

// ---- Output ----
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('\nBundle size report (gzip)');
console.log('='.repeat(60));
console.log(`${pad('Initial JS chunk', 32)}${padL('raw', 12)}${padL('gzip', 12)}`);
console.log('-'.repeat(60));
for (const r of rows.filter((r) => r.kind === 'initial')) {
  console.log(`${pad(r.file, 32)}${padL(KB(r.raw), 12)}${padL(KB(r.gzip), 12)}`);
}
console.log('-'.repeat(60));
console.log(`${pad('Initial JS total', 32)}${padL('', 12)}${padL(KB(initialGzipTotal), 12)}`);
if (cssGzipTotal > 0) {
  console.log(`${pad('Entry CSS (not budgeted)', 32)}${padL('', 12)}${padL(KB(cssGzipTotal), 12)}`);
}

if (lazyRows.length > 0) {
  console.log('\nLazy chunks (loaded on demand, excluded from budget)');
  console.log('-'.repeat(60));
  for (const r of lazyRows.sort((a, b) => b.gzip - a.gzip)) {
    console.log(`${pad(r.file, 32)}${padL(KB(r.raw), 12)}${padL(KB(r.gzip), 12)}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Initial JS budget : ${KB(INITIAL_JS_BUDGET_BYTES)} (gzip)`);
console.log(`Initial JS actual : ${KB(initialGzipTotal)} (gzip)`);
const headroom = INITIAL_JS_BUDGET_BYTES - initialGzipTotal;
console.log(`Headroom          : ${KB(headroom)} (${((headroom / INITIAL_JS_BUDGET_BYTES) * 100).toFixed(1)}% of budget free)`);
console.log('='.repeat(60));

if (initialGzipTotal > INITIAL_JS_BUDGET_BYTES) {
  fail(
    `Initial JS ${KB(initialGzipTotal)} exceeds budget ${KB(INITIAL_JS_BUDGET_BYTES)}. ` +
      `Reduce eager imports or move code behind React.lazy.`
  );
}

console.log(`\n[PASS] check-bundle-size: initial JS within the 500 KB compressed budget.\n`);
process.exit(0);
