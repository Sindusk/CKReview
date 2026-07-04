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

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import {
  WOW_CLASS_ICON_SLUGS,
  WOW_SPEC_ICON_SLUGS,
  WOW_PENDING_SPEC_ICON_SLUGS,
  FFXIV_ICON_BASE,
  FF_JOB_KEYS,
} from "./icon-sources.mjs";

const OUT_ROOT = path.join(process.cwd(), "public", "icons");
const WOW_ZAMIMG_BASE = "https://wow.zamimg.com/images/wow/icons/large";
const FORCE = process.argv.includes("--force");

// Zamimg has occasionally blocked requests with no User-Agent. GitHub raw
// doesn't care, but sending one is harmless.
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

async function downloadFFXIVIcons() {
  const jobDir = path.join(OUT_ROOT, "ffxiv", "jobs");
  await mkdir(jobDir, { recursive: true });

  for (const jobKey of FF_JOB_KEYS) {
    const filename = jobKey.toLowerCase();
    const url = `${FFXIV_ICON_BASE}/${filename}.png`;
    const dest = path.join(jobDir, `${jobKey}.png`);
    await downloadOne(url, dest, `ffxiv/job/${jobKey}`);
    await sleep(75);
  }
}

async function main() {
  console.log("Downloading WoW class + spec icons…");
  await downloadWowIcons();

  console.log("Downloading FFXIV job icons…");
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
