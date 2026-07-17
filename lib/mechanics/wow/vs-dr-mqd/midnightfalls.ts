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
//             failed soakers ~3s later. Casts complete at ~+29/+91/+153;
//             the first two follow Dusk Crystal waves (below), the third
//             has no crystals.
//   dusk      Dusk Crystals (2 waves of 3, spawning ~13-16s before their
//             Heaven's Glaives) tick THEMSELVES with 1252975 "Dimming"
//             once/sec (ramping ~4k→56k) until healed to full, at which
//             point they're "restored"/pickupable and the ticks stop —
//             see detectDuskCrystalHealing.
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
//   crystals  1253031 "Glimmering" (private aura, +20% size, 1s periodic
//             dummy; its damage twin 1254398 continuously ticks the same
//             players) = CARRYING a Dawn Crystal. 3 pickups at ~+16-20,
//             3 more at ~+86-90 (6 crystals total); carriers swap
//             constantly (hot potato — the ticking hurts). applydebuff =
//             pickup, removedebuff = drop (or death-strip). Ground truth
//             (7-16 VOD review): a Starsplinter detonating on a crystal —
//             held OR dropped on the floor — breaks it.
//   any time  1284699 "Light's End" — a Dawn Crystal breaking. NOTE:
//             earlier model (MFLightsEndPull31) saw it hit only 1-2
//             players; the 7-16 pulls show the full version hits the
//             ENTIRE raid for a flat ~190-310k regardless of position,
//             and can fire more than once (two crystals ~5.5s apart in
//             MFPull21/MFPull13). It is the terminal wipe event in 3 of
//             the 4 7-16 pulls. Every INTERMISSION Light's End is
//             preceded 0.1-0.3s by a Starsplinter detonation (see
//             annotateLightsEndSources); the pre-intermission ones
//             (MFPull13 +95.3, and MFPull11's mid-Dissonance-wipe one
//             coinciding with a carrier's death) have no such marker and
//             their break cause is still unresolved — the 7-16 dumps'
//             damageDone stream only captured pagination page 1
//             (+0..+50s), so damage TO the crystal is invisible.
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

  // Terminate lives in detectTerminateCasts below (not this table) — its
  // severity depends on whether the cast actually hit anyone.

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
const GLIMMERING_CARRIER_ID     = 1253031;            // carrying a Dawn Crystal
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

type Detonation = { timestamp: number; playerName: string };

/** Every Starsplinter marker removal = one detonation instant, with its owner. */
function buildDetonations(players: PlayerInfo[]): Detonation[] {
  const detonations: Detonation[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "removed") continue;
      if (!STARSPLINTER_MARKER_IDS.includes(d.abilityId)) continue;
      detonations.push({ timestamp: d.timestamp, playerName: player.name });
    }
  }
  return detonations;
}

function detectStarsplinterOverlap(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  const detonations = buildDetonations(players);

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

// ─── Terminate (Termination Matrix) ─────────────────────────────────────────
//
// 1284934 is the "Terminate" CAST spell — the ID that shows up as a
// "cast"-type completion in the enemyCasts stream. 1286276 is a distinct
// "Terminate"-named ability WCL uses for the damage/killing-blow effect and
// never appears in enemyCasts (verified against xvQbZ6Cwkm1XaHPD Pull 2's
// Termination Matrix). This used to be a declarative enemyCast Raid rule,
// but ground truth (Pull 1 VOD, 2026-07-17: cast completed at +9.58,
// nobody hit, nothing actually went wrong) demoted the harmless case:
// a Terminate that goes off but hits NOBODY is a Minor error, not Raid.
//
// Multiple Termination Matrices complete casts near-simultaneously (three
// within 0.5s in Pull 3), so casts are grouped with the same 2s window
// suppressDuplicateRaidErrors uses — one error per volley, Raid if ANY
// cast in the volley hit someone. Across all 42 pulls of xvQbZ6Cwkm1XaHPD
// the damage lands 0.03-0.15s after its cast completion and volleys are
// ≥0.9s apart, so the 750ms hit window can't bleed into the next volley.
const TERMINATE_CAST_ID     = 1284934;
const TERMINATE_DAMAGE_ID   = 1286276;
const TERMINATE_HIT_WINDOW_MS   = 750;
const TERMINATE_GROUP_WINDOW_MS = 2000; // matches RAID_ERROR_SUPPRESS_WINDOW_MS
export const MIDNIGHTFALLS_TERMINATE_RULE_ID = "wow-raid-terminate-cast";

function detectTerminateCasts(players: PlayerInfo[], enemyCasts: EnemyEvent[]): PullError[] {
  const casts = enemyCasts
    .filter((e) => e.abilityId === TERMINATE_CAST_ID)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (casts.length === 0) return [];

  const hitTimes: number[] = [];
  for (const p of players) {
    for (const h of p.damageTaken) {
      if (h.abilityId === TERMINATE_DAMAGE_ID && (h.amount ?? 0) > 0) hitTimes.push(h.timestamp);
    }
  }

  const errors: PullError[] = [];
  let group: EnemyEvent[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const anyHit = group.some((c) =>
      hitTimes.some((t) => t >= c.timestamp - 100 && t <= c.timestamp + TERMINATE_HIT_WINDOW_MS)
    );
    errors.push({
      ruleId:      MIDNIGHTFALLS_TERMINATE_RULE_ID,
      severity:    anyHit ? "Raid" : "Minor",
      name:        "Terminate Cast",
      description: anyHit
        ? "The interrupt on the termination matrix's Terminate cast was missed."
        : "The interrupt on the termination matrix's Terminate cast was missed, but nobody was hit.",
      timestamp:   group[0].timestamp,
      abilityId:   TERMINATE_CAST_ID,
      abilityName: group[0].abilityName,
      abilityIcon: group[0].abilityIcon,
    });
    group = [];
  };
  for (const c of casts) {
    if (group.length > 0 && c.timestamp - group[0].timestamp > TERMINATE_GROUP_WINDOW_MS) flush();
    group.push(c);
  }
  flush();
  return errors;
}

// ─── Dusk Crystal healing (phase 1 crystal waves) ───────────────────────────
//
// Twice during phase 1, 3 Dusk Crystals spawn and must be HEALED to full
// to become restorable/pickupable; an unrestored crystal in the path of
// Heaven's Glaives detonates and wipes the raid (Pull 2's wipe). Ground
// truth rule (2026-07-17): a crystal must be fully healed by 2 SECONDS
// before the boss finishes casting Heaven's Glaives.
//
// Detection signal: while below full health a Dusk Crystal damages ITSELF
// with 1252975 "Dimming" once per second (ramping ~4k→56k); the ticks stop
// the instant it reaches full. So "still Dimming inside the 2s deadline" =
// not restored in time — no per-crystal instance data needed (WCL's
// healing stream carries no targetInstance, so the 3 concurrent crystals
// are indistinguishable there anyway). Calibration across all 42
// xvQbZ6Cwkm1XaHPD pulls: failed waves' last tick lands 0.30-1.12s before
// the cast completes (Pulls 2/30/40 — Pull 2 confirmed by VOD, crystal
// reached full ~0.2-0.5s before the glaives); every clean wave's last tick
// is ≥2.30s before, so the 2s deadline sits in a natural gap. The third
// Heaven's Glaives (+153) has no crystal wave and produces no ticks.
//
// Per product decision the error is Raid with NO blame — but it lists
// every healer's total healing into that wave's crystals so what went
// wrong is analyzable. (Totals are summed across the wave's 3 crystals —
// see the instance note above — and only count the healers' own casts;
// totem/pet healing isn't attributed.)
const DUSK_CRYSTAL_NAME           = "Dusk Crystal";
const DIMMING_TICK_ID             = 1252975;   // Dimming (crystal self-damage while unhealed)
const HEAVENS_GLAIVES_CAST_ID     = 1253915;
const CRYSTAL_RESTORE_DEADLINE_MS = 2000;
// Crystal waves start ~13-16s before their Heaven's Glaives; 40s cleanly
// separates each cast's wave from the previous one (casts are ~62s apart).
const CRYSTAL_WAVE_WINDOW_MS      = 40000;
export const MIDNIGHTFALLS_DUSK_CRYSTAL_RULE_ID = "wow-raid-dusk-crystal-unhealed";

function detectDuskCrystalHealing(
  players:           PlayerInfo[],
  enemyCasts:        EnemyEvent[],
  friendlyNpcDamage: EnemyEvent[]
): PullError[] {
  const tickTimes = friendlyNpcDamage
    .filter((e) => e.actorName === DUSK_CRYSTAL_NAME && e.abilityId === DIMMING_TICK_ID)
    .map((e) => e.timestamp);
  if (tickTimes.length === 0) return [];

  const errors: PullError[] = [];
  for (const cast of enemyCasts) {
    if (cast.abilityId !== HEAVENS_GLAIVES_CAST_ID) continue;

    const wave = tickTimes.filter((t) => t <= cast.timestamp && cast.timestamp - t <= CRYSTAL_WAVE_WINDOW_MS);
    if (wave.length === 0) continue;             // no crystal wave for this cast
    const lastTick = Math.max(...wave);
    const gapMs = cast.timestamp - lastTick;
    if (gapMs > CRYSTAL_RESTORE_DEADLINE_MS) continue; // every crystal restored in time

    const waveStart = Math.min(...wave) - 2000;  // ticks start ~1s after spawn
    const healerTotals = players
      .filter((p) => p.role === "Healer")
      .map((p) => ({
        name:  p.name,
        total: p.healing
          .filter((h) => h.target === DUSK_CRYSTAL_NAME && h.timestamp >= waveStart && h.timestamp <= cast.timestamp)
          .reduce((sum, h) => sum + (h.amount ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
    const breakdown = healerTotals.map((h) => `${h.name} ${Math.round(h.total / 1000)}k`).join(", ");

    errors.push({
      ruleId:      MIDNIGHTFALLS_DUSK_CRYSTAL_RULE_ID,
      severity:    "Raid",
      name:        "Dusk Crystal Not Restored",
      description:
        `A Dusk Crystal did not receive sufficient healing before Heaven's Glaives finished casting — ` +
        `it was still below full health ~${(gapMs / 1000).toFixed(1)}s before the glaives fired ` +
        `(crystals must be fully healed 2s before the cast completes). ` +
        `Healing into this wave's crystals: ${breakdown}.`,
      timestamp:   cast.timestamp,
      abilityId:   HEAVENS_GLAIVES_CAST_ID,
      abilityName: cast.abilityName,
      abilityIcon: cast.abilityIcon,
    });
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

// ─── Light's End source attribution ─────────────────────────────────────────
//
// Every INTERMISSION Light's End observed is immediately preceded by a
// Starsplinter detonation — the splinter blast is what breaks the crystal:
//   MFPull4  LE +201.91 ← detonation +201.63 (0.28s), whose owner never
//            carried a crystal; the broken crystal had been dropped ~11.7yd
//            away 4.5s earlier by the Dark Quasar victim.
//   MFPull21 LE +214.97 ← detonation +214.86 (0.11s) by a player who had
//            dropped their own crystal at their feet 1.2s earlier — their
//            splinter broke their own crystal and the blast killed them.
//   MFPull21 LE +220.68 ← three marker removals within 0.1s, but two were
//            death-strips (owners already dead) — only the living owner's
//            was a real detonation, hence the alive check below.
// Pre-intermission Light's Ends (MFPull11 +183.7 during the Dissonance
// wipe — simultaneous with a crystal CARRIER's death — and MFPull13 +95.3)
// have no markers in existence, so no source is claimed for them.
//
// The named player is the raid error's "source", NOT its blame — per
// ground truth, fault can lie with whoever dropped the crystal there, the
// detonating player's movement, or a third party forcing that movement —
// so this stays a Raid error and the source goes in the description only.
const LIGHTS_END_RULE_ID = "wow-raid-lights-end";
const LIGHTS_END_DETONATION_WINDOW_MS = 800;

// The second observed break cause: a CARRIER dying with the crystal in
// hand. Signature: the carrier's Glimmering removal coincides with their
// death (strip) and Light's End follows within this window — MFPull13
// (two Heaven's Glaives victims carrying, removals 0.96s/0.12s before LE)
// and MFPull11 (Dissonance-wipe carrier death 0.03s before LE).
const LIGHTS_END_CARRIER_DEATH_WINDOW_MS = 1500;
const CARRIER_DEATH_STRIP_TOLERANCE_MS   = 1000;

function annotateLightsEndSources(
  errors:      PullError[],
  detonations: Detonation[],
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  const isDeadAt = (playerName: string, atTime: number) =>
    deathEvents.some((d) => d.player === playerName && d.timestamp <= atTime);

  // Glimmering removals that are death-strips: the carrier died within
  // the tolerance before the removal — i.e. died holding the crystal.
  const carrierDeaths: Array<{ timestamp: number; playerName: string }> = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.abilityId !== GLIMMERING_CARRIER_ID || d.debuffStatus !== "removed") continue;
      // WCL orders the strip a few ms BEFORE the death event itself, so
      // the death may sit on either side of the removal — match within
      // the tolerance in both directions.
      const died = deathEvents.some(
        (de) => de.player === player.name &&
          Math.abs(d.timestamp - de.timestamp) <= CARRIER_DEATH_STRIP_TOLERANCE_MS
      );
      if (died) carrierDeaths.push({ timestamp: d.timestamp, playerName: player.name });
    }
  }

  return errors.map((e) => {
    if (e.ruleId !== LIGHTS_END_RULE_ID) return e;

    let source: Detonation | undefined;
    for (const det of detonations) {
      if (det.timestamp > e.timestamp) continue;
      if (e.timestamp - det.timestamp > LIGHTS_END_DETONATION_WINDOW_MS) continue;
      if (isDeadAt(det.playerName, det.timestamp)) continue; // death-strip, not a detonation
      if (!source || det.timestamp > source.timestamp) source = det;
    }
    if (source) {
      return {
        ...e,
        description:
          `${e.description} Broken by ${source.playerName}'s Starsplinter detonation ` +
          `${((e.timestamp - source.timestamp) / 1000).toFixed(2)}s earlier.`,
      };
    }

    const dyingCarriers = carrierDeaths.filter(
      (c) => c.timestamp <= e.timestamp && e.timestamp - c.timestamp <= LIGHTS_END_CARRIER_DEATH_WINDOW_MS
    );
    if (dyingCarriers.length > 0) {
      // Ground truth (Pull 3, 2026-07-17): when a carrier's death broke the
      // crystal, the error should carry THAT player's name instead of
      // reading as "Raid-Wide" — the FIRST carrier to die is the one whose
      // crystal broke. Severity stays Raid (the wipe is raid-level; the
      // death itself is already flagged by its own cause, per the fallout
      // philosophy) — the UI shows PullError.player when present.
      const ordered = [...dyingCarriers].sort((a, b) => a.timestamp - b.timestamp);
      const first   = ordered[0];
      const info    = players.find((p) => p.name === first.playerName);
      const others  = [...new Set(ordered.slice(1).map((c) => c.playerName))]
        .filter((n) => n !== first.playerName);
      const alsoDied = others.length > 0
        ? ` ${others.join(" and ")} also died carrying a crystal.`
        : "";
      return {
        ...e,
        player:      first.playerName,
        class:       info?.className,
        specId:      info?.specId,
        role:        info?.role,
        description:
          `${first.playerName} died while carrying a crystal. ` +
          `The Dawn Crystal was destroyed, unleashing Light's End.${alsoDied}`,
      };
    }

    return e;
  });
}

// friendlyNpcDamage: damage events landing on FRIENDLY NPCs (the crystals),
// in the same EnemyEvent shape with actor = the NPC that was hit — built by
// wclBuildFriendlyNpcDamageEvents in log-transforms.ts. Feeds the Dusk
// Crystal Dimming-tick detection above.
export function detectMidnightFallsErrors(
  players:           PlayerInfo[],
  deathEvents:       DeathEvent[] = [],
  enemyCasts:        EnemyEvent[] = [],
  enemyBuffs:        EnemyEvent[] = [],
  friendlyNpcDamage: EnemyEvent[] = []
): PullError[] {
  const errors = [
    ...evaluateRuleSet(MIDNIGHT_FALLS_RULES, players, deathEvents, enemyCasts, enemyBuffs),
    ...detectStarsplinterOverlap(players, deathEvents),
    ...detectTerminateCasts(players, enemyCasts),
    ...detectDuskCrystalHealing(players, enemyCasts, friendlyNpcDamage),
  ].map((e) =>
    ANONYMOUS_RAID_RULE_IDS.has(e.ruleId)
      ? { ...e, player: undefined, class: undefined, specId: undefined, role: undefined }
      : e
  );

  // Annotate after dedup so each surviving Light's End error (= one
  // crystal detonation, timestamped at its first hit) gets its source.
  return annotateLightsEndSources(
    suppressDuplicateRaidErrors(errors),
    buildDetonations(players),
    players,
    deathEvents
  ).sort((a, b) => a.timestamp - b.timestamp);
}
