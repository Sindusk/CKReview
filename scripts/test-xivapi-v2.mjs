// scripts/test-xivapi-v2.mjs
//
// DIAGNOSTIC SCRIPT — run this BEFORE touching download-class-spec-icons.mjs.
//
// Why this exists: the FFXIV icons currently downloaded via icon-sources.mjs
// come from the legacy `xivapi.com` v1 API / the `xivapi/classjob-icons` repo,
// which are (a) flat/outline fan art, not the real filled in-game job icons,
// and (b) apparently returning 404s now — xivapi.com v1 looks to have been
// migrated to v2.xivapi.com with a different URL scheme and response shape.
//
// This script does NOT download anything into public/icons/. It just:
//   1. Confirms whether the old xivapi.com v1 endpoint is really dead.
//   2. Confirms v2.xivapi.com is reachable.
//   3. Dumps the FULL field list for one ClassJob row (Paladin, id 20) with
//      no `fields=` filter, so we can find the actual icon field name —
//      v2's Item sheet has a confirmed `Icon` field shaped like
//      { id, path, path_hr1 }, but it's unconfirmed whether ClassJob has
//      the same field or whether the real colored job icon lives on a
//      different sheet (e.g. ClassJobCategory) entirely.
//   4. If an icon path IS found, test-converts it to a PNG via the v2 asset
//      endpoint (/api/asset?path=...&format=png) and saves it locally so
//      you can open it and visually confirm it's the filled/colored icon
//      (not another flat outline).
//
// Usage:
//   node scripts/test-xivapi-v2.mjs
//
// Requires Node 18+ (built-in fetch). No npm dependencies.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "scripts", "xivapi-test-output");

function line() {
  console.log("─".repeat(70));
}

async function testLegacyV1() {
  line();
  console.log("STEP 1 — Checking legacy xivapi.com v1 (the current icon source)");
  line();

  const url = "https://xivapi.com/ClassJob/20";
  try {
    const res = await fetch(url);
    console.log(`GET ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.log("=> Confirms v1 is not responding normally. This is almost");
      console.log("   certainly why you got a 404 before.");
    } else {
      const text = await res.text();
      console.log("=> v1 responded OK, unexpectedly. First 300 chars:");
      console.log(text.slice(0, 300));
    }
  } catch (err) {
    console.log(`GET ${url}`);
    console.log(`=> Request failed entirely: ${err.message}`);
  }
}

async function testV2Reachable() {
  line();
  console.log("STEP 2 — Checking v2.xivapi.com is reachable");
  line();

  const url = "https://v2.xivapi.com/api/sheet/Item/42589?fields=Name,Icon";
  const res = await fetch(url);
  console.log(`GET ${url}`);
  console.log(`Status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    throw new Error("v2.xivapi.com did not respond OK — stop here and report back.");
  }

  const json = await res.json();
  console.log("=> v2 is alive. Sample Item response:");
  console.log(JSON.stringify(json, null, 2));
}

async function dumpClassJobFields() {
  line();
  console.log("STEP 3 — Dumping FULL field list for ClassJob row 20 (Paladin)");
  console.log("(no fields= filter, so we can find the real icon field name)");
  line();

  const url = "https://v2.xivapi.com/api/sheet/ClassJob/20";
  const res = await fetch(url);
  console.log(`GET ${url}`);
  console.log(`Status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    console.log("=> Could not fetch ClassJob row. Stop and report this output.");
    return null;
  }

  const json = await res.json();
  const fields = json.fields ?? {};
  const fieldNames = Object.keys(fields);

  console.log(`\nFound ${fieldNames.length} fields on ClassJob/20:`);
  console.log(fieldNames.join(", "));

  // Look for anything that smells like an icon: either a field literally
  // named Icon, or any nested object with {id, path} shape.
  const iconLike = fieldNames.filter((name) => {
    const val = fields[name];
    return (
      name.toLowerCase().includes("icon") ||
      (val && typeof val === "object" && "path" in val)
    );
  });

  if (iconLike.length > 0) {
    console.log("\n=> Possible icon field(s) found:");
    for (const name of iconLike) {
      console.log(`   ${name}:`, JSON.stringify(fields[name]));
    }
  } else {
    console.log("\n=> No icon-shaped field found directly on ClassJob.");
    console.log("   The real colored job icon likely lives on a related sheet");
    console.log("   (e.g. ClassJobCategory, or a dedicated icon lookup) — full");
    console.log("   raw response dumped below for manual inspection:");
    console.log(JSON.stringify(json, null, 2));
  }

  return iconLike.length > 0 ? fields[iconLike[0]] : null;
}

async function testAssetConversion(iconField) {
  line();
  console.log("STEP 4 — Test-converting an icon path to PNG via the asset endpoint");
  line();

  // Fall back to a known-good Item icon (Angel Brush, confirmed working in
  // STEP 2) if ClassJob didn't yield an icon field, purely to prove the
  // asset endpoint itself works end-to-end.
  const texPath = iconField?.path ?? "ui/icon/026000/026049.tex";
  const url = `https://v2.xivapi.com/api/asset?path=${encodeURIComponent(texPath)}&format=png`;

  console.log(`GET ${url}`);
  const res = await fetch(url);
  console.log(`Status: ${res.status} ${res.statusText}`);
  console.log(`Content-Type: ${res.headers.get("content-type")}`);

  if (!res.ok) {
    console.log("=> Asset conversion failed. Stop and report this output.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  const destPath = path.join(OUT_DIR, "test-icon.png");
  await writeFile(destPath, buf);

  console.log(`=> Saved ${buf.length} bytes to ${destPath}`);
  console.log("   Open that file and check: is it a FILLED/COLORED icon,");
  console.log("   or another flat outline?");
}

async function main() {
  await testLegacyV1();
  await testV2Reachable();
  const iconField = await dumpClassJobFields();
  await testAssetConversion(iconField);

  line();
  console.log("DONE. Please paste the full output back so we can pick the");
  console.log("correct field/sheet before rewriting download-class-spec-icons.mjs.");
  line();
}

main().catch((err) => {
  console.error("\nScript failed:", err);
  process.exitCode = 1;
});
