// scripts/lib/require-ts.js
//
// Loads a .ts module under plain Node by transpiling it on the fly (via the
// `typescript` package, same as the existing validate-*.js harnesses) and
// recursively resolving its own relative/@-alias imports the same way —
// so a module with a real dependency tree (e.g. lib/wcl-client.ts, which
// pulls in lib/rate-limit.ts) doesn't need every dependency hand-shimmed
// one level at a time. Pass `shims` for the handful of imports that
// genuinely need a Node-side replacement (browser-only modules like
// lib/log-auth.ts, which uses localStorage/window).
//
// Type-only imports (e.g. `import type { Foo } from "./bar"`) are erased
// by the TS transpiler and never reach `require()`, so files that only
// export types don't need shims at all.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

const moduleCache = new Map(); // absolute .ts path -> exports

function transpile(absPath) {
  const src = fs.readFileSync(absPath, 'utf8');
  return ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

/** Resolves a bare import specifier to an absolute .ts/.tsx path, or null if it isn't a local module (npm package / Node builtin / type-only). */
function resolveTsPath(fromDir, spec) {
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.join(fromDir, spec);
  for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function requireTs(absPath, shims = {}) {
  if (moduleCache.has(absPath)) return moduleCache.get(absPath);

  const dir = path.dirname(absPath);
  const mod = { exports: {} };
  moduleCache.set(absPath, mod.exports); // set before executing body — guards against simple cycles

  const fakeRequire = (spec) => {
    if (Object.prototype.hasOwnProperty.call(shims, spec)) return shims[spec];
    const resolved = resolveTsPath(dir, spec);
    if (resolved) return requireTs(resolved, shims);
    // Non-TS local imports (e.g. .json data modules — the app has
    // resolveJsonModule on): require by absolute path so relative specs
    // resolve against the importing module, not this file.
    if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/')) {
      const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.join(dir, spec);
      if (fs.existsSync(base)) return require(base);
    }
    return require(spec);
  };

  new Function('exports', 'require', 'module', transpile(absPath))(mod.exports, fakeRequire, mod);
  return mod.exports;
}

/** Convenience entry point: requireTsFromRoot('lib/wcl-client.ts', shims). */
function requireTsFromRoot(relPath, shims = {}) {
  return requireTs(path.join(ROOT, ...relPath.split('/')), shims);
}

module.exports = { requireTs, requireTsFromRoot, ROOT };
