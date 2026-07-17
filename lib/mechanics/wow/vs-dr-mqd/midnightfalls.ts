// lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts
//
// Encounter-specific error detection for Midnight Falls. This started as a
// handful of single-ability entries in lib/error-rules.ts, but the
// encounter's intermission needed multi-stream correlation, so — like the
// FFXIV Dancing Mad modules in mechanics/ffxiv/dancingmad/ — everything
// for the boss now lives here: its declarative rules (run through
// evaluateRuleSet from error-detection.ts) plus the custom logic below.
// Called from transformFightToPull in log-transforms.ts; every check
// self-gates on Midnight Falls ability IDs, so it's safe on any WoW pull.
//
// ── FIGHT TIMELINE (reverse-engineered from sampledata/wow/7-16 pulls
//    4/11/13/21 — offsets are fight-relative and repeat pull-to-pull) ────
//
//   +0        1249797 "Shattered Sky" — ambient raid-wide pulse from the
//             boss for the whole fight, ~27k/tick early, ramping to ~170k
//             late. Kills credited to it are ALWAYS attrition fallout of
//             some other failure — never flag Shattered Sky deaths.
//   +40/+102/+164  1249609 Dark Rune debuff applied to ~15 players
//             simultaneously; each rune drops ~10s later, staggered over
//             ~2s, dealing ~100k 1249582 "Resonance" to its holder when
//             dropped CORRECTLY. Dropped out of order it instead applies
//             1249584 "Dissonance" (debuff) and detonates 1249585
//             "Dissonance" AoE raid-wide (~120-200k each) — 10 deaths in
//             MFPull11's third wave.
//   +88→91    1253915 "Heaven's Glaives" cast → 1254076 killing blows on
//             failed soakers ~3s later.
//   +171→174  1285708 "Grim Symphony" cast.
//   +184→190.6  1255743 "Total Eclipse" cast; on completion the boss
//             keeps the buff ~30s — this is the intermission. During it:
//               · 1262055 "Eclipsed" (healing-absorb debuff) is
//                 re-applied to the entire raid continuously.
//               · Starsplinter: every ~0.57s one player is marked with a
//                 3s private-aura debuff (1285510 or 1279512 — two
//                 alternating variants), then takes a personal ~100-170k
//                 1281473 "Starsplinter" hit when it expires. That part
//                 is routine. A SECOND damage ID, 1279581 "Starsplinter",
//                 hit exactly one UNMARKED player in MFPull21 for ~487k
//                 (fatal, pre-wipe) ~0.3s after another player's
//                 detonation — read as being caught inside someone
//                 else's splinter blast, i.e. failure to spread. That's
//                 what the Starsplinter check below flags.
//   any time  1284699 "Light's End" — a Dawn Crystal detonating. NOTE:
//             earlier model (MFLightsEndPull31) saw it hit only 1-2
//             players; the 7-16 pulls show the full version hits the
//             ENTIRE raid for a flat ~190-310k regardless of position,
//             and can fire more than once (two crystals ~5.5s apart in
//             MFPull21/MFPull13). It is the terminal wipe event in 3 of
//             the 4 7-16 pulls. WHAT destroys the crystal is not yet
//             attributable from these dumps — their damageDone stream
//             only captured the first pagination page (+0..+50s), so
//             nobody's damage to the crystal is visible. Re-verify once
//             a full capture exists; in MFPull4 a Dark Quasar player
//             death (+199.5) preceded Light's End by 2.4s, suggesting an
//             unaimed/dropped beam can be the trigger.
//   +198.7    1282470 "Dark Quasar" (cast + debuff on one player) — the
//             player aims the beam; 1282469 is the beam's damage. In
//             MFPull4 the debuffed player took 4 beam ticks themselves
//             and died — flagged via the killingBlow rule.
//   1254256   "Naaru's Lament" — missed-ground-soak punishment,
//             environmental (sourceID -1), hits ~20 players at once.
//
// Raid-severity errors here are deduplicated via
// suppressDuplicateRaidErrors — one Light's End detonation lands as ~18
// per-player damage events, which previously produced ~18 identical Raid
// errors within 300ms.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, PullErrorRule, EnemyEvent } from "@/types/PullError";
import { evaluateRuleSet, suppressDuplicateRaidErrors } from "../../../error-detection";

// ─── Declarative rules (moved verbatim from lib/error-rules.ts) ────────────

const MIDNIGHT_FALLS_RULES: PullErrorRule[] = [

  {
    id:          "wow-heavens-glaives",
    game:        "wow",
    severity:    "Major",
    name:        "Hit By Heaven's Glaives",
    description: "Took damage from Heaven's Glaives.",
    trigger:     "killingBlow",
    abilityId:   1254076,          // Heaven's Glaives
  },

  {
    id:          "wow-death-dark-quasar",
    game:        "wow",
    severity:    "Major",
    name:        "Death to Dark Quasar",
    description: "Died to the Dark Quasar beam's killing blow.",
    trigger:     "killingBlow",
    abilityId:    1282469,         // Dark Quasar beam
  },

  // Verified against MFTerminateFailPull2.json (fight 2, actor 55
  // "Termination Matrix"): 1284934 is the "Terminate" CAST spell — the ID
  // that shows up as a "cast"-type completion in the enemyCasts stream,
  // which is what the "enemyCast" trigger reads. 1286276 is a distinct
  // "Terminate"-named ability WCL uses for the killing blow/damage effect
  // and never appears in enemyCasts — using it here (as an early version
  // of this rule did) meant the trigger could never match.
  {
    id:          "wow-raid-terminate-cast",
    game:        "wow",
    severity:    "Raid",
    name:        "Terminate Cast",
    description: "The interrupt on the termination matrix's Terminate cast was missed.",
    trigger:     "enemyCast",
    abilityId:    1284934,         // Terminate (cast)
  },

  // Verified against MFDissonanceFailPull1.json vs MFDissonanceSuccessPull55.json:
  // 1249584 is the "Dissonance" DEBUFF applied to the player who dropped
  // their Dark Rune out of order (5 applications in the fail pull, 0 in
  // the clean one). The follow-up AoE that actually wipes the raid is a
  // separate "Dissonance"-named ability (1249585, the killingAbilityGameID
  // on the resulting deaths) that never appears in any fetched stream —
  // same cast-ID-vs-damage-ID split as Terminate — so the rule keys on
  // the debuff application. Raid-severity per product decision even
  // though it's player-attributable. In MFPull11 four players received it
  // within 0.5s; dedup keeps only the FIRST (the likeliest root cause —
  // the later ones read as chain fallout of the broken order).
  {
    id:          "wow-raid-dissonance",
    game:        "wow",
    severity:    "Raid",
    name:        "Dissonance",
    description: "A Dark Rune was activated out of order, triggering Dissonance.",
    trigger:     "debuffApplied",
    abilityId:    1249584,         // Dissonance (debuff)
  },

  // See the module header for the current Light's End model (raid-wide
  // ~190-310k per crystal detonation, multiple crystals possible).
  // minEffectiveDamage filters the fully-absorbed 0-amount duplicate
  // entries WCL logs alongside real hits.
  {
    id:          "wow-raid-lights-end",
    game:        "wow",
    severity:    "Raid",
    name:        "Light's End",
    description: "A Dawn Crystal was destroyed, unleashing Light's End.",
    trigger:            "damage",
    abilityId:           1284699,   // Light's End
    minEffectiveDamage:  100000,
  },

  // 1254256 "Naaru's Lament" lands as a pure environmental damageTaken hit
  // (sourceID -1 — not a real NPC actor), simultaneously on ~20 players in
  // a ~250ms window (verified MFLightsEndPull31 + 7-16 MFPull13). Since no
  // NPC "casts" it, only the "damage" trigger can see it. UNVERIFIED
  // whether the soak-miss itself is separately detectable (a debuff/marker
  // on the missed spot) rather than only the resulting damage.
  {
    id:          "wow-raid-naaru-lament",
    game:        "wow",
    severity:    "Raid",
    name:        "Naaru's Lament",
    description: "A ground soak was missed, triggering Naaru's Lament.",
    trigger:            "damage",
    abilityId:           1254256,   // Naaru's Lament
    minEffectiveDamage:  10000,
  },

];

// ─── Starsplinter overlap (Total Eclipse intermission) ─────────────────────

const STARSPLINTER_MARKER_IDS   = [1285510, 1279512]; // 3s private-aura marks
const STARSPLINTER_SPLASH_ID    = 1279581;            // hit on a NON-marked player
export const MIDNIGHTFALLS_STARSPLINTER_RULE_ID = "wow-mf-starsplinter-overlap";

// A splash hit is attributed to the detonation whose marker removal
// happened closest before it. Observed gap in MFPull21: 0.28s; markers
// roll every ~0.57s, so 600ms can't straddle two detonations ambiguously.
const SPLASH_ATTRIBUTION_WINDOW_MS = 600;

// Once the raid is already dying, splinters land on whoever is left and
// stray hits are fallout, not the mistake itself — same suppression shape
// as the Dancing Mad modules: 2+ deaths shortly before the hit exempt it.
const WIPE_DEATHS_WINDOW_MS = 15000;
const WIPE_DEATHS_THRESHOLD = 2;

function detectStarsplinterOverlap(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  // Every marker removal = one detonation instant, with its owner.
  const detonations: Array<{ timestamp: number; playerName: string }> = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "removed") continue;
      if (!STARSPLINTER_MARKER_IDS.includes(d.abilityId)) continue;
      detonations.push({ timestamp: d.timestamp, playerName: player.name });
    }
  }

  const deathTimestamps = deathEvents.map((d) => d.timestamp);
  const isWipeUnderway = (atTime: number) =>
    deathTimestamps.filter((t) => t <= atTime && atTime - t <= WIPE_DEATHS_WINDOW_MS)
      .length >= WIPE_DEATHS_THRESHOLD;

  const errors: PullError[] = [];

  for (const player of players) {
    for (const hit of player.damageTaken) {
      if (hit.abilityId !== STARSPLINTER_SPLASH_ID) continue;
      if (!((hit.amount ?? 0) > 0)) continue; // fully-absorbed duplicates
      if (isWipeUnderway(hit.timestamp)) continue;

      // Nearest preceding detonation inside the window, if any — names the
      // player whose splinter this was.
      let source: { timestamp: number; playerName: string } | undefined;
      for (const det of detonations) {
        if (det.timestamp > hit.timestamp) continue;
        if (hit.timestamp - det.timestamp > SPLASH_ATTRIBUTION_WINDOW_MS) continue;
        if (!source || det.timestamp > source.timestamp) source = det;
      }

      const detail = source
        ? `was caught inside ${source.playerName}'s Starsplinter detonation`
        : "was caught inside another player's Starsplinter detonation";

      errors.push({
        ruleId:      MIDNIGHTFALLS_STARSPLINTER_RULE_ID,
        severity:    "Major",
        name:        "Caught in Starsplinter",
        description: `Not spread during Total Eclipse — ${detail} (~${Math.round((hit.amount ?? 0) / 1000)}k).`,
        timestamp:   hit.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   STARSPLINTER_SPLASH_ID,
        abilityName: "Starsplinter",
      });
    }
  }

  return errors;
}

// ─── Public entry point ─────────────────────────────────────────────────────

// Raid errors whose "damage" trigger necessarily lands on some arbitrary
// victim first — the player field would read as attribution ("P18 —
// Light's End") when it's really just whoever the first damage event hit,
// so it's stripped. Dissonance is NOT here: its debuffApplied recipient is
// the actual out-of-order rune player.
const ANONYMOUS_RAID_RULE_IDS = new Set(["wow-raid-lights-end", "wow-raid-naaru-lament"]);

export function detectMidnightFallsErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[] = [],
  enemyCasts:  EnemyEvent[] = [],
  enemyBuffs:  EnemyEvent[] = []
): PullError[] {
  const errors = [
    ...evaluateRuleSet(MIDNIGHT_FALLS_RULES, players, deathEvents, enemyCasts, enemyBuffs),
    ...detectStarsplinterOverlap(players, deathEvents),
  ].map((e) =>
    ANONYMOUS_RAID_RULE_IDS.has(e.ruleId)
      ? { ...e, player: undefined, class: undefined, specId: undefined, role: undefined }
      : e
  );

  return suppressDuplicateRaidErrors(errors).sort((a, b) => a.timestamp - b.timestamp);
}
