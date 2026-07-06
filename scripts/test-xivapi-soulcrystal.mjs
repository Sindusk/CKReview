// scripts/test-xivapi-soulcrystal.mjs
//
// FOLLOW-UP DIAGNOSTIC — run this after test-xivapi-v2.mjs.
//
// Findings so far:
//   - Legacy xivapi.com v1 is NOT dead (returned 200 OK) — the earlier 404
//     you hit was almost certainly a missing file in the community
//     `xivapi/classjob-icons` GitHub repo (it's known incomplete for
//     Viper/Pictomancer per the comment already in icon-sources.mjs), not
//     the API itself.
//   - v2.xivapi.com's `ClassJob` sheet has 51 fields and NONE of them is a
//     direct `Icon` — confirmed via full field dump.
//   - `Item` rows DO have a working `Icon` field shaped like
//     { id, path, path_hr1 }, and the asset endpoint
//     (/api/asset?path=...&format=png) correctly renders real filled
//     in-game icons (confirmed visually on a crafter soul crystal icon).
//
// Theory to test now: ClassJob.ItemSoulCrystal points at each job's Soul
// Crystal Item, and that Item's Icon is the real per-job textured icon.
// This script queries ItemSoulCrystal.Icon directly via a `fields=` filter
// (avoiding the earlier no-filter dump that recursively pulled in an
// entire unlock quest chain) for every combat job, and renders ONE of them
// (Paladin) to a PNG so you can visually confirm it's blue/filled/etc.
//
// Usage:
//   node scripts/test-xivapi-soulcrystal.mjs > soulcrystal-test-output.txt 2>&1
//
// Requires Node 18+ (built-in fetch). No npm dependencies.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "scripts", "xivapi-test-output");

// Every combat ClassJob ID (base classes + jobs), per the well-known FFXIV
// ClassJob sheet numbering. Doesn't need to be exhaustive for this test —
// just enough jobs across roles/expansions to confirm the pattern holds,
// including a Dawntrail job (Viper/Pictomancer) since those are exactly
// the ones missing from the old GitHub repo.
const TEST_JOB_IDS = {
  19: "Paladin",
  21: "Warrior",
  32: "Dark Knight",
  37: "Gunbreaker",
  24: "White Mage",
  28: "Scholar",
  33: "Astrologian",
  40: "Sage",
  20: "Monk",
  39: "Reaper",
  41: "Viper",       // Dawntrail — missing from the old repo
  42: "Pictomancer",  // Dawntrail — missing from the old repo
};

function line() {
  console.log("─".repeat(70));
}

async function main() {
  line();
  console.log("Querying ClassJob.ItemSoulCrystal.Icon for test jobs");
  line();

  const results = {};

  for (const [id, label] of Object.entries(TEST_JOB_IDS)) {
    const url = `https://v2.xivapi.com/api/sheet/ClassJob/${id}?fields=Name,Abbreviation,ItemSoulCrystal.Name,ItemSoulCrystal.Icon`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`[${label} / id ${id}] HTTP ${res.status} — ${url}`);
        results[label] = { error: `HTTP ${res.status}` };
        continue;
      }
      const json = await res.json();
      const fields = json.fields ?? {};
      const crystal = fields.ItemSoulCrystal?.fields;

      console.log(`[${label} / id ${id}]`);
      console.log(`  ClassJob.Name: ${fields.Name}`);
      console.log(`  Abbreviation:  ${fields.Abbreviation}`);
      console.log(`  SoulCrystal.Name: ${crystal?.Name ?? "(none)"}`);
      console.log(`  SoulCrystal.Icon: ${JSON.stringify(crystal?.Icon ?? null)}`);
      console.log("");

      results[label] = {
        crystalName: crystal?.Name ?? null,
        iconPath: crystal?.Icon?.path ?? null,
      };
    } catch (err) {
      console.log(`[${label} / id ${id}] Request failed: ${err.message}`);
      results[label] = { error: err.message };
    }
  }

  line();
  console.log("Rendering Paladin's soul crystal icon to PNG for visual check");
  line();

  const paladinIconPath = results["Paladin"]?.iconPath;
  if (!paladinIconPath) {
    console.log("=> No icon path found for Paladin — can't render. See output above.");
    return;
  }

  const assetUrl = `https://v2.xivapi.com/api/asset?path=${encodeURIComponent(paladinIconPath)}&format=png`;
  console.log(`GET ${assetUrl}`);
  const res = await fetch(assetUrl);
  console.log(`Status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    console.log("=> Asset conversion failed.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  const destPath = path.join(OUT_DIR, "paladin-soulcrystal.png");
  await writeFile(destPath, buf);

  console.log(`=> Saved ${buf.length} bytes to ${destPath}`);
  console.log("   Open it: does it look like a filled, colored icon");
  console.log("   (any color is fine at this stage — we're checking it's");
  console.log("   filled art, not a plain outline) associated with Paladin?");

  line();
  console.log("SUMMARY (job -> icon path found):");
  line();
  for (const [label, r] of Object.entries(results)) {
    console.log(`${label.padEnd(14)} ${r.iconPath ?? r.error ?? "none"}`);
  }
}

main().catch((err) => {
  console.error("\nScript failed:", err);
  process.exitCode = 1;
});
