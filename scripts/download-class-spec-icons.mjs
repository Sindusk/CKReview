// scripts/download-class-spec-icons.mjs
//
// Downloads WoW class + spec icons and FFXIV job icons into public/icons/,
// for local, offline-friendly use throughout the app (no more hotlinking
// third-party CDNs at render time).
//
// Usage:
//   node scripts/download-class-spec-icons.mjs
//
// Requires Node 18+ (uses the built-in `fetch`). No npm dependencies.
//
// Output layout:
//   public/icons/wow/classes/{ClassName}.jpg
//   public/icons/wow/specs/{specId}.jpg
//   public/icons/ffxiv/jobs/{JobKey}.png
//
// Re-run any time — existing files are skipped unless --force is passed,
// so this is safe to run again after fixing a bad slug in icon-sources.mjs.
//
// FFXIV REWRITE (see icon-sources.mjs for the full story): the old source
// was raw.githubusercontent.com/xivapi/classjob-icons — flat/outline fan
// art, missing Viper/Pictomancer entirely. This now queries XIVAPI v2 live
// per job (ClassJob.ItemSoulCrystal.Icon) and renders the real in-game
// filled job-crystal icon via XIVAPI's asset endpoint. Confirmed working
// end-to-end, including both previously-missing Dawntrail jobs, via
// scripts/test-xivapi-soulcrystal.mjs before this rewrite.

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import {
  WOW_CLASS_ICON_SLUGS,
  WOW_SPEC_ICON_SLUGS,
  WOW_PENDING_SPEC_ICON_SLUGS,
  FF_JOB_CLASSJOB_IDS,
} from "./icon-sources.mjs";

const OUT_ROOT = path.join(process.cwd(), "public", "icons");
const WOW_ZAMIMG_BASE = "https://wow.zamimg.com/images/wow/icons/large";
const XIVAPI_BASE = "https://v2.xivapi.com/api";
const FORCE = process.argv.includes("--force");

// Zamimg has occasionally blocked requests with no User-Agent. GitHub raw
// doesn't care, but sending one is harmless. XIVAPI doesn't require one
// either, but it's kept for consistency across all three fetch sites.
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ck-raid-review-icon-fetcher/1.0)",
};

const results = { ok: [], failed: [], skipped: [] };

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(url, destPath, label) {
  if (!FORCE && (await fileExists(destPath))) {
    results.skipped.push(label);
    return;
  }

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      results.failed.push({ label, url, status: res.status });
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buf);
    results.ok.push(label);
  } catch (err) {
    results.failed.push({ label, url, status: err?.message ?? String(err) });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWowIcons() {
  const classDir = path.join(OUT_ROOT, "wow", "classes");
  const specDir = path.join(OUT_ROOT, "wow", "specs");
  await mkdir(classDir, { recursive: true });
  await mkdir(specDir, { recursive: true });

  for (const [className, slug] of Object.entries(WOW_CLASS_ICON_SLUGS)) {
    const url = `${WOW_ZAMIMG_BASE}/${slug}.jpg`;
    const dest = path.join(classDir, `${className}.jpg`);
    await downloadOne(url, dest, `wow/class/${className}`);
    await sleep(75);
  }

  for (const [specId, slug] of Object.entries(WOW_SPEC_ICON_SLUGS)) {
    const url = `${WOW_ZAMIMG_BASE}/${slug}.jpg`;
    const dest = path.join(specDir, `${specId}.jpg`);
    await downloadOne(url, dest, `wow/spec/${specId} (${slug})`);
    await sleep(75);
  }

  // Specs without a confirmed numeric spec ID yet (see the comment on
  // WOW_PENDING_SPEC_ICON_SLUGS in icon-sources.mjs) — filed by name under
  // _pending/ so they can never collide with a real spec ID's icon file.
  if (Object.keys(WOW_PENDING_SPEC_ICON_SLUGS).length > 0) {
    const pendingDir = path.join(specDir, "_pending");
    await mkdir(pendingDir, { recursive: true });

    for (const [name, slug] of Object.entries(WOW_PENDING_SPEC_ICON_SLUGS)) {
      const url = `${WOW_ZAMIMG_BASE}/${slug}.jpg`;
      const dest = path.join(pendingDir, `${name}.jpg`);
      await downloadOne(url, dest, `wow/spec/_pending/${name} (${slug})`);
      await sleep(75);
    }
  }
}

// ─── FFXIV ──────────────────────────────────────────────────────────────────
//
// Two live calls per job:
//   1. GET /sheet/ClassJob/{id}?fields=Abbreviation,ItemSoulCrystal.Icon
//      -> resolves the job's soul crystal texture path (e.g.
//         "ui/icon/026000/026003.tex" for Paladin). Base classes (no
//         soul crystal) come back with ItemSoulCrystal.value === 0 and
//         are skipped, not failed — see icon-sources.mjs for why that's
//         expected rather than an error.
//   2. GET /asset?path={texPath}&format=png
//      -> the actual renderable PNG for that texture.
//
// A failure at either step is recorded as a normal failure so it shows up
// in the summary the same way a WoW 404 would.

async function fetchSoulCrystalIconPath(classJobId) {
  const url = `${XIVAPI_BASE}/sheet/ClassJob/${classJobId}?fields=Abbreviation,ItemSoulCrystal.Icon`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`ClassJob lookup failed (${res.status})`);
  }

  const json = await res.json();
  const crystal = json.fields?.ItemSoulCrystal;

  // Base classes (Gladiator, Conjurer, etc.) have no soul crystal — XIVAPI
  // represents that "empty relation" as value: 0 with no nested `fields`.
  if (!crystal?.fields?.Icon?.path) {
    return null;
  }

  return crystal.fields.Icon.path;
}

async function downloadFFXIVIcons() {
  const jobDir = path.join(OUT_ROOT, "ffxiv", "jobs");
  await mkdir(jobDir, { recursive: true });

  for (const [jobKey, classJobId] of Object.entries(FF_JOB_CLASSJOB_IDS)) {
    const dest = path.join(jobDir, `${jobKey}.png`);
    const label = `ffxiv/job/${jobKey} (ClassJob ${classJobId})`;

    if (!FORCE && (await fileExists(dest))) {
      results.skipped.push(label);
      await sleep(75);
      continue;
    }

    try {
      const texPath = await fetchSoulCrystalIconPath(classJobId);

      if (!texPath) {
        results.failed.push({
          label,
          url: `${XIVAPI_BASE}/sheet/ClassJob/${classJobId}`,
          status: "No ItemSoulCrystal on this ClassJob (base class?)",
        });
        await sleep(75);
        continue;
      }

      const assetUrl = `${XIVAPI_BASE}/asset?path=${encodeURIComponent(texPath)}&format=png`;
      await downloadOne(assetUrl, dest, label);
    } catch (err) {
      results.failed.push({ label, url: `ClassJob ${classJobId}`, status: err?.message ?? String(err) });
    }

    await sleep(75);
  }
}

async function main() {
  console.log("Downloading WoW class + spec icons…");
  await downloadWowIcons();

  console.log("Downloading FFXIV job icons (XIVAPI v2, soul crystal icons)…");
  await downloadFFXIVIcons();

  console.log("\n─── Summary ───────────────────────────────");
  console.log(`✅ Downloaded: ${results.ok.length}`);
  console.log(`⏭️  Skipped (already exist): ${results.skipped.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  const pendingCount = Object.keys(WOW_PENDING_SPEC_ICON_SLUGS).length;
  if (pendingCount > 0) {
    console.log(
      `\n⚠️  ${pendingCount} spec icon(s) downloaded to public/icons/wow/specs/_pending/ ` +
      `without a confirmed spec ID — see the comment above WOW_PENDING_SPEC_ICON_SLUGS ` +
      `in icon-sources.mjs for how to finish these once you add the spec to spec-data.ts.`
    );
  }

  if (results.failed.length > 0) {
    console.log("\nFailed downloads (fix the slug/mapping and re-run with --force):");
    for (const f of results.failed) {
      console.log(`  - ${f.label}  [${f.status}]  ${f.url}`);
    }
    process.exitCode = 1;
  }
}

main();
