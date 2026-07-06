// scripts/test-ability-icon-urls.mjs
//
// PHASE 1 DIAGNOSTIC — run this BEFORE touching log-transforms.ts / the
// ability map / any UI component.
//
// masterData.abilities (already fetched by both GetReport and GetFFReport)
// returns a raw `icon` filename per ability, e.g.:
//   WCL:    "inv_axe_02.jpg"
//   WCL:    "../../warcraft/abilities/spell_nature_regeneration_02.jpg"  (relative!)
//   FFLogs: "000000-000405.png"
//   FFLogs: "213000-213908.png"
//
// That filename is meaningless without knowing the CDN base URL WCL/FFLogs
// serve it from. This script tries several plausible candidate bases
// (RPGLogs' own asset CDN, and the site domains themselves) against real
// icon filenames pulled directly from the project's sample JSONs —
// including one relative-path case, resolved via `new URL(icon, base)` so
// we can confirm the "../../" actually cancels out to the right folder
// instead of guessing.
//
// It does NOT touch any app code or download anything permanently — it
// just reports which (base, icon) combinations return a real image, so we
// can pick one confirmed base URL per game before wiring this through
// PlayerEvent / PullError / DeathEvent / the ability map.
//
// Usage:
//   node scripts/test-ability-icon-urls.mjs | Out-File -Encoding utf8 ability-icon-test-output.txt
//
// (Redirecting through Out-File -Encoding utf8 avoids the mangled-symbols
// issue from PowerShell's default UTF-16 `>` redirect seen last time.)
//
// Requires Node 18+ (built-in fetch). No npm dependencies.

// ─── Candidate base URLs ────────────────────────────────────────────────────
//
// Unconfirmed — that's the whole point of this script. Add more candidates
// here if all of these come back 404.

const WCL_CANDIDATE_BASES = [
  "https://assets.rpglogs.com/img/warcraft/abilities/",
  "https://www.warcraftlogs.com/img/warcraft/abilities/",
  "https://cdn.warcraftlogs.com/img/warcraft/abilities/",
];

const FFL_CANDIDATE_BASES = [
  "https://assets.rpglogs.com/img/ff/abilities/",
  "https://www.fflogs.com/img/ff/abilities/",
  "https://assets.rpglogs.com/img/ffxiv/abilities/",
];

// ─── Real icon filenames, pulled directly from the project's sample JSONs ──

const WCL_TEST_ICONS = [
  { gameID: 0, name: "Unknown Ability", icon: "inv_axe_02.jpg" },
  // The relative-path case — WCL's masterData.abilities returned this
  // exact string for Regeneration (gameID 1302) in getWCLReport-Sample.json.
  { gameID: 1302, name: "Regeneration", icon: "../../warcraft/abilities/spell_nature_regeneration_02.jpg" },
  { gameID: 1285644, name: "Hearty Well Fed", icon: "spell_misc_food.jpg" },
  { gameID: 358733, name: "Glide", icon: "ability_racial_glide.jpg" },
];

const FFL_TEST_ICONS = [
  { gameID: 0, name: "Unknown Ability", icon: "000000-000405.png" },
  { gameID: 1000048, name: "Well Fed", icon: "216000-216202.png" },
  { gameID: 16006, name: "Closed Position", icon: "003000-003470.png" },
  { gameID: 1001199, name: "Peloton", icon: "213000-213908.png" },
];

function line() {
  console.log("─".repeat(70));
}

// Resolves an icon filename (plain OR relative-with-../..) against a base
// URL, exactly the way a browser would if this were an <img src>.
function resolveIconUrl(base, icon) {
  return new URL(icon, base).href;
}

async function probe(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    const contentType = res.headers.get("content-type") ?? "";
    const looksLikeImage = res.ok && contentType.startsWith("image/");
    return { ok: res.ok, status: res.status, contentType, looksLikeImage };
  } catch (err) {
    return { ok: false, status: null, contentType: null, error: err.message };
  }
}

async function testGame(label, bases, icons) {
  line();
  console.log(`Testing ${label} ability icon bases`);
  line();

  const successfulBases = new Set();

  for (const base of bases) {
    console.log(`\nBase: ${base}`);

    for (const { gameID, name, icon } of icons) {
      const url = resolveIconUrl(base, icon);
      const result = await probe(url);

      const marker = result.looksLikeImage ? "✅" : "❌";
      console.log(
        `  ${marker} [${gameID}] ${name.padEnd(20)} -> ${url}`
      );
      console.log(
        `      status=${result.status} content-type=${result.contentType ?? result.error}`
      );

      if (result.looksLikeImage) {
        successfulBases.add(base);
      }

      // Be polite — these are someone else's servers.
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  line();
  if (successfulBases.size > 0) {
    console.log(`=> ${label}: base(s) that returned real images:`);
    for (const b of successfulBases) console.log(`   ${b}`);
  } else {
    console.log(`=> ${label}: NONE of the candidate bases worked.`);
    console.log("   Paste this output back — we'll need to find the real");
    console.log("   base URL a different way (e.g. inspecting a real");
    console.log("   WarcraftLogs/FFLogs report page's network requests).");
  }

  return successfulBases;
}

async function main() {
  const wclResults = await testGame("WarcraftLogs", WCL_CANDIDATE_BASES, WCL_TEST_ICONS);
  const fflResults = await testGame("FFLogs", FFL_CANDIDATE_BASES, FFL_TEST_ICONS);

  line();
  console.log("OVERALL SUMMARY");
  line();
  console.log(`WarcraftLogs working base(s): ${wclResults.size > 0 ? [...wclResults].join(", ") : "none found"}`);
  console.log(`FFLogs working base(s):       ${fflResults.size > 0 ? [...fflResults].join(", ") : "none found"}`);
  console.log("\nPaste this full output back so we can lock in the confirmed");
  console.log("base URL(s) before wiring icons through the app.");
}

main().catch((err) => {
  console.error("\nScript failed:", err);
  process.exitCode = 1;
});
