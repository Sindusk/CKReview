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
//             Its counterpart 1254257 "Tears of L'ura" is the hit taken by
//             a player successfully ABSORBING a soak — the two fire at the
//             same instant (the soak-resolution moment). Soaks spawn when
//             a Dawn Crystal CARRIER takes avoidable damage and resolve
//             exactly ~4.0s later — see detectCrystalHolderSoaks.
//   +75/+137  1251789 "Cosmic Fracture" — Midnight Crystals (3-6 per wave)
//             begincast a ~12s channel. Killing each crystal in time
//             interrupts it; the completion is NEVER logged as a "cast"
//             event, but a surviving crystal's channel going off shows up
//             as 1251789 damageTaken ticks on the raid (~140k each, 14.9M
//             total across Pull 7 — the only pull of 42 with any). Any
//             1251789 damage = a crystal survived = raid error.
//
// Raid-severity errors here are deduplicated via
// suppressDuplicateRaidErrors — one Light's End detonation lands as ~18
// per-player damage events, which previously produced ~18 identical Raid
// errors within 300ms.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, PullErrorRule, EnemyEvent } from "@/types/PullError";
import { evaluateRuleSet, suppressDuplicateRaidErrors } from "../../../error-detection";
import { KNOWN_KICK_CHAINS, TERMINATE_INTERRUPT_IDS } from "./terminate-kicks";
import { KNOWN_CRYSTAL_ASSIGNMENTS, CRYSTAL_WAVE_BOUNDARY_MS } from "./crystal-assignments";

// ─── Declarative rules (moved verbatim from lib/error-rules.ts) ────────────

const MIDNIGHT_FALLS_RULES: PullErrorRule[] = [

  {
    id:          "wow-heavens-glaives",
    game:        "wow",
    severity:    "Major",
    name:        "Killed by Heaven's Glaives",
    description: "Died to Heaven's Glaives.",
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
// suppressDuplicateRaidErrors uses — one error per volley. Across all 42
// pulls of xvQbZ6Cwkm1XaHPD the damage lands 0.03-0.15s after its cast
// completion and volleys are ≥0.9s apart, so the 750ms hit window can't
// bleed into the next volley.
//
// SEVERITY (ground truth 2026-07-17): keyed on Terminate KILLS, not hits —
// 2+ players killed = Raid, exactly one = Major, none = Minor (a fully
// survived Terminate did no lasting harm).
//
// ATTRIBUTION — "the player who missed that specific interrupt", only
// when knowable FOR SURE. Uses KNOWN_KICK_CHAINS (terminate-kicks.ts):
// each matrix is kicked by one declared chain, in order. An interrupted
// matrix recasts ~0.5s later and Terminate's cast time is ~2s, so a
// matrix whose chain kicked within the last 2s CANNOT be the one that
// completed. For a single-completion volley, exclude recently-kicked
// chains; if exactly ONE chain remains and it has an un-kicked member
// left, that first un-kicked member is the misser (validated across the
// 42-pull capture — e.g. Pull 1 +9.58 lands on Nearly, who kicked 0.12s
// AFTER the cast completed). Attribution is skipped whenever it isn't
// airtight: multi-completion volleys, waves containing kicks by
// non-chain fill-ins (their chain is unknowable), ambiguity after
// exclusion, or an exhausted chain (5th cast has no assigned kicker).
// If the misser was already DEAD before the cast went off, that leads
// the description (their miss is fallout of their death — the death
// itself is flagged by its own cause).
//
// WRONG-TARGET ATTRIBUTION (2026-07-22, Dn87j4ARzNwYqLvV Pull 1 VOD): a
// separate, unambiguous signal that beats the chain-elimination above
// whenever it applies — a declared chain member casting one of their own
// interrupt spells at something OTHER than "Termination Matrix" (almost
// always the boss, L'ura) during the matrix wave is a directly observable
// botched kick, regardless of which physical matrix instance or round it
// was for. Ground truth: Pull 1 +7.77s Mythnarra cast Disrupt on L'ura
// instead of the matrix (confirmed via VOD as their miss) — cross-checked
// against L'ura's own cast timeline in every pull of this report (7
// occurrences across 26 pulls, e.g. Cococaines x2, Pnkphnx x2): none
// landed near an actual L'ura begincast, ruling out "legitimately
// interrupting the boss" as an alternative explanation. Scoped to the
// same wave lookback as chain-elimination; only fires when exactly one
// chain member mis-targeted in the window (ambiguous otherwise).
const TERMINATE_CAST_ID     = 1284934;
const TERMINATE_DAMAGE_ID   = 1286276;
const TERMINATE_HIT_WINDOW_MS   = 750;
const TERMINATE_GROUP_WINDOW_MS = 2000;  // matches RAID_ERROR_SUPPRESS_WINDOW_MS
const TERMINATE_WAVE_WINDOW_MS  = 30000; // kicks belonging to this matrix set (~12s spread, sets ~62s apart)
const TERMINATE_CHAIN_EXCLUSION_MS = 2000; // interrupted matrix can't complete again this fast
const MATRIX_NAME = "Termination Matrix";
export const MIDNIGHTFALLS_TERMINATE_RULE_ID = "wow-raid-terminate-cast";

function detectTerminateCasts(
  players:     PlayerInfo[],
  enemyCasts:  EnemyEvent[],
  deathEvents: DeathEvent[]
): PullError[] {
  const casts = enemyCasts
    .filter((e) => e.abilityId === TERMINATE_CAST_ID)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (casts.length === 0) return [];

  const hits: Array<{ timestamp: number; playerName: string }> = [];
  for (const p of players) {
    for (const h of p.damageTaken) {
      if (h.abilityId === TERMINATE_DAMAGE_ID && (h.amount ?? 0) > 0) {
        hits.push({ timestamp: h.timestamp, playerName: p.name });
      }
    }
  }

  // Every interrupt landed on a matrix, for chain reconstruction.
  const chainMembers = new Set(KNOWN_KICK_CHAINS.flatMap((c) => c.members.flat()));
  const kicks: Array<{ timestamp: number; playerName: string }> = [];
  for (const p of players) {
    for (const c of p.casts) {
      if (c.target === MATRIX_NAME && TERMINATE_INTERRUPT_IDS.has(c.abilityId)) {
        kicks.push({ timestamp: c.timestamp, playerName: p.name });
      }
    }
  }

  // ROUND-0 ELIMINATION (2026-07-22, user-proposed): the three matrices'
  // very first cast bars begin SIMULTANEOUSLY at wave start (confirmed —
  // all 3 begincasts land within ~1ms of each other), so round 0's three
  // assigned kickers (chain.members[0]) are the one round where "who
  // kicked" can be checked in a synchronized time window without any
  // matrix-instance ambiguity. If 2 of the 3 land a kick near wave start
  // and the wave has at least one Terminate completion, the 3rd (who
  // never kicked at all — no cast attempt whatsoever, not even a
  // wrong-target one) is inferred as that miss's cause. Deliberately NOT
  // extended to rounds 1+: once any chain has cascaded through an extra
  // recast cycle (see WRONG-TARGET ATTRIBUTION above), the 3 chains'
  // rounds drift out of sync in real time, so this same time-window trick
  // stops being reliable — confirmed unsolvable for round 1+ misses
  // (Pull 1's Shadowmeld/BF3-round1 case) even with full VOD ground truth.
  const ROUND0_WINDOW_MS = 3000; // observed clean round-0 kicks land ~0.3-0.5s after wave start
  const WAVE_GAP_MS = 20000;     // matches terminate-kicks.ts — matrix sets are ~62s apart, a wave's kicks ~12s
  const waveTimeline = [...kicks.map((k) => k.timestamp), ...casts.map((c) => c.timestamp)].sort((a, b) => a - b);
  const waves: Array<{ start: number; end: number; round0Misser: string | undefined }> = [];
  for (const t of waveTimeline) {
    const last = waves[waves.length - 1];
    if (last && t - last.end <= WAVE_GAP_MS) last.end = t;
    else waves.push({ start: t, end: t, round0Misser: undefined });
  }
  for (const wave of waves) {
    const waveHasCompletion = casts.some((c) => c.timestamp >= wave.start && c.timestamp <= wave.end);
    if (!waveHasCompletion) continue;
    const round0Engaged = KNOWN_KICK_CHAINS.map((chain) =>
      kicks.some((k) => chain.members[0].includes(k.playerName) && k.timestamp <= wave.start + ROUND0_WINDOW_MS)
    );
    if (round0Engaged.filter((e) => !e).length !== 1) continue; // 0 or 2+ missing — not airtight
    const missingNames = KNOWN_KICK_CHAINS[round0Engaged.indexOf(false)].members[0];
    wave.round0Misser = missingNames.find((n) => players.some((p) => p.name === n)) ?? missingNames[0];
  }
  // Same anti-bleed scoping wrongTargetMiss uses below (via prevVolleyEnd):
  // only the FIRST volley resolved within a wave can be round 0's own miss —
  // otherwise a wave's later, unrelated volleys would all inherit blame for
  // a gap that's only ever true of the wave's opening round.
  const round0MissForCompletion = (fromTime: number, completionTime: number): string | undefined => {
    const wave = waves.find((w) => completionTime >= w.start && completionTime <= w.end);
    return wave && fromTime <= wave.start ? wave.round0Misser : undefined;
  };

  // The chain-elimination attribution described in the header comment.
  // Returns the misser only when exactly one chain can be responsible.
  const attributeMiss = (completionTime: number): string | undefined => {
    const wave = kicks.filter(
      (k) => k.timestamp > completionTime - TERMINATE_WAVE_WINDOW_MS && k.timestamp <= completionTime
    );
    if (wave.some((k) => !chainMembers.has(k.playerName))) return undefined; // fill-in kicked — chains unknowable
    const candidates: string[] = [];
    for (const chain of KNOWN_KICK_CHAINS) {
      const chainKicks = wave.filter((k) => chain.members.some((names) => names.includes(k.playerName)));
      const lastKick = chainKicks.length ? Math.max(...chainKicks.map((k) => k.timestamp)) : -Infinity;
      if (completionTime - lastKick < TERMINATE_CHAIN_EXCLUSION_MS) continue; // just kicked — excluded
      const nextDueNames = chain.members.find(
        (names) => !chainKicks.some((k) => names.includes(k.playerName))
      );
      if (nextDueNames !== undefined) {
        // Slot may list multiple roster-night alternates (see KNOWN_KICK_CHAINS
        // comment) — prefer whichever one is actually in tonight's roster.
        candidates.push(nextDueNames.find((n) => players.some((p) => p.name === n)) ?? nextDueNames[0]);
      } else return undefined; // an exhausted chain is a candidate with no assigned kicker — not airtight
    }
    return candidates.length === 1 ? candidates[0] : undefined;
  };

  // See "WRONG-TARGET ATTRIBUTION" above. Independent of chain-elimination —
  // checked first in flush() since it doesn't depend on completion count.
  const wrongTargetMiss = (fromTime: number, toTime: number): string | undefined => {
    const offenders = new Set<string>();
    for (const p of players) {
      if (!chainMembers.has(p.name)) continue;
      for (const c of p.casts) {
        if (!TERMINATE_INTERRUPT_IDS.has(c.abilityId)) continue;
        if (c.target === MATRIX_NAME) continue;
        if (c.timestamp < fromTime || c.timestamp > toTime) continue;
        offenders.add(p.name);
      }
    }
    return offenders.size === 1 ? [...offenders][0] : undefined;
  };

  const errors: PullError[] = [];
  let group: EnemyEvent[] = [];
  let prevVolleyEnd = -Infinity; // scopes wrongTargetMiss to since the LAST resolved volley,
                                  // so an old whiff doesn't bleed into a later, unrelated miss
                                  // in the same 30s wave (see WRONG-TARGET ATTRIBUTION comment).
  const flush = () => {
    if (group.length === 0) return;
    const inWindow = (t: number) =>
      group.some((c) => t >= c.timestamp - 100 && t <= c.timestamp + TERMINATE_HIT_WINDOW_MS);
    // Everyone hit by this volley, in hit order (ground truth request,
    // Pull 6: the error should name all the victims).
    const victims = [...new Set(
      hits.filter((h) => inWindow(h.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((h) => h.playerName)
    )];
    const killed = new Set(
      deathEvents
        .filter((d) => d.killingAbilityGameId === TERMINATE_DAMAGE_ID && inWindow(d.timestamp))
        .map((d) => d.player)
    );

    const wrongTargetMisser = wrongTargetMiss(
      Math.max(prevVolleyEnd, group[0].timestamp - TERMINATE_WAVE_WINDOW_MS),
      group[group.length - 1].timestamp
    );
    const round0Misser = round0MissForCompletion(prevVolleyEnd, group[0].timestamp);
    const misser = wrongTargetMisser ?? round0Misser ?? (group.length === 1 ? attributeMiss(group[0].timestamp) : undefined);
    const misserInfo = misser ? players.find((p) => p.name === misser) : undefined;
    const misserDead = misser !== undefined &&
      deathEvents.some((d) => d.player === misser && d.timestamp <= group[0].timestamp);

    const lead =
      misser === undefined
        ? "The interrupt on the termination matrix's Terminate cast was missed."
        : misserDead
          ? `${misser} was dead before their Terminate interrupt came up. The termination matrix's Terminate cast went off.`
          : misser === wrongTargetMisser
            ? `${misser} aimed their interrupt at the wrong target instead of the Termination Matrix — the cast went off.`
            : misser === round0Misser
              ? `${misser} never landed their opening interrupt on the Termination Matrix — the cast went off.`
              : `${misser} missed their Terminate interrupt — the termination matrix's Terminate cast went off.`;
    const tail = victims.length > 0 ? ` Hit: ${victims.join(", ")}.` : " Nobody was hit.";

    errors.push({
      ruleId:      MIDNIGHTFALLS_TERMINATE_RULE_ID,
      severity:    killed.size >= 2 ? "Raid" : killed.size === 1 ? "Major" : "Minor",
      name:        "Terminate Cast",
      description: lead + tail,
      timestamp:   group[0].timestamp,
      player:      misser,
      class:       misserInfo?.className,
      specId:      misserInfo?.specId,
      role:        misserInfo?.role,
      abilityId:   TERMINATE_CAST_ID,
      abilityName: group[0].abilityName,
      abilityIcon: group[0].abilityIcon,
    });
    prevVolleyEnd = group[group.length - 1].timestamp;
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

// OUTCOME GATE (2026-07-22, Pull 5 VOD): an unrestored crystal is a near
// miss, not a guaranteed wipe — the glaives can simply whiff the crystal
// (no Light's End follows), in which case the pull continues and nothing
// actually went wrong. Ground truth: Pull 5's unrestored crystal at +91.0s
// produced no Light's End at all — Raid was too severe for a non-event.
// Downgraded to Minor whenever no Light's End (1284699) lands within ~2s
// of the Heaven's Glaives cast completion (either side, matching the same
// 2s deadline the restore check itself uses); stays Raid when it does.
const LIGHTS_END_DAMAGE_ID          = 1284699;
const LIGHTS_END_PROXIMITY_MS       = 2000;

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

    const lightsEndFollowed = players.some((p) =>
      p.damageTaken.some((h) =>
        h.abilityId === LIGHTS_END_DAMAGE_ID &&
        Math.abs(h.timestamp - cast.timestamp) <= LIGHTS_END_PROXIMITY_MS
      )
    );

    errors.push({
      ruleId:      MIDNIGHTFALLS_DUSK_CRYSTAL_RULE_ID,
      severity:    lightsEndFollowed ? "Raid" : "Minor",
      name:        "Dusk Crystal Not Restored",
      description:
        `A Dusk Crystal did not receive sufficient healing before Heaven's Glaives finished casting — ` +
        `it was still below full health ~${(gapMs / 1000).toFixed(1)}s before the glaives fired ` +
        `(crystals must be fully healed 2s before the cast completes). ` +
        `Healing into this wave's crystals: ${breakdown}.` +
        (lightsEndFollowed ? "" : " The glaives missed the crystal — no Light's End followed."),
      timestamp:   cast.timestamp,
      abilityId:   HEAVENS_GLAIVES_CAST_ID,
      abilityName: cast.abilityName,
      abilityIcon: cast.abilityIcon,
    });
  }
  return errors;
}

// ─── Cosmic Fracture (Midnight Crystals not killed in time) ────────────────
//
// Midnight Crystal waves (~+75 and ~+137) each begincast a ~12s 1251789
// "Cosmic Fracture" channel; the raid must kill every crystal before it
// completes. WCL never logs the channel's completion as a "cast" event
// (same cast-vs-damage split as Terminate/Dissonance), so the only
// completion signal is 1251789 DAMAGE landing on players — which across
// the whole 42-pull xvQbZ6Cwkm1XaHPD capture appears in exactly one pull
// (Pull 7: 106 ticks / 14.9M starting +86.9, 11 killing blows). Ground
// truth (Pull 7 VOD): raid error, no individual attribution. One error
// per burst — a completed fracture ticks for ~8s, so consecutive events
// are clustered with a gap well past the 2s raid-error dedup window.
const COSMIC_FRACTURE_ID = 1251789;
const COSMIC_FRACTURE_CLUSTER_GAP_MS = 15000;
export const MIDNIGHTFALLS_COSMIC_FRACTURE_RULE_ID = "wow-raid-cosmic-fracture";

function detectCosmicFracture(players: PlayerInfo[]): PullError[] {
  const hits: Array<{ timestamp: number; abilityName: string; abilityIcon?: string }> = [];
  for (const p of players) {
    for (const h of p.damageTaken) {
      if (h.abilityId !== COSMIC_FRACTURE_ID) continue;
      hits.push({ timestamp: h.timestamp, abilityName: h.abilityName, abilityIcon: h.abilityIcon });
    }
  }
  hits.sort((a, b) => a.timestamp - b.timestamp);

  const errors: PullError[] = [];
  for (const hit of hits) {
    const last = errors[errors.length - 1];
    if (last && hit.timestamp - last.timestamp < COSMIC_FRACTURE_CLUSTER_GAP_MS) continue;
    errors.push({
      ruleId:      MIDNIGHTFALLS_COSMIC_FRACTURE_RULE_ID,
      severity:    "Raid",
      name:        "Cosmic Fracture",
      description:
        "A Midnight Crystal was not killed before its channel completed, " +
        "unleashing Cosmic Fracture on the raid.",
      timestamp:   hit.timestamp,
      abilityId:   COSMIC_FRACTURE_ID,
      abilityName: hit.abilityName || "Cosmic Fracture",
      abilityIcon: hit.abilityIcon,
    });
  }
  return errors;
}

// ─── Crystal holder hit → light soaks (Naaru's Lament source) ──────────────
//
// When a Dawn Crystal CARRIER (Glimmering, 1253031) takes avoidable damage,
// the crystal itself is damaged and sheds light soaks on the ground; each
// soak must be absorbed by a player (1254257 "Tears of L'ura" hit) or it
// detonates raid-wide as 1254256 "Naaru's Lament". Ground truth (Pull 8
// VOD, 2026-07-17): Neptune was clipped by a Heaven's Glaive while
// carrying, spawning 4 soaks of which some were missed — taking damage
// while holding a crystal is a MAJOR error on the carrier.
//
// Detection: the soak lifetime is EXACTLY ~4.0s — across every
// soak-resolution wave in the 42-pull capture, the causative carrier hit
// sits 3.4-4.1s before the wave's first 1254256/1254257 event (first hit
// of a multi-tick series at 4.0-4.1s, later ticks of the same series
// 3.4-3.9s). So a carrier hit is flagged only when a soak resolution
// follows it inside [3300, 4500]ms — outcome gating for free: the game
// itself doesn't spawn soaks from unavoidable damage (raid-wide 1251649
// nukes, ambient 1249797, tank hits, and periodic self-damage like
// paladin 210380 all landed on carriers with no wave following), so the
// causative-ability list below is every ability observed at the ~4s mark:
//   1254076 Heaven's Glaives   (Pull 8 and 12 more pulls)
//   1282469 Dark Quasar beam   (Pull 1/4/5/13/…)
//   1281473 Starsplinter — the carrier's OWN marked detonation landing
//            while holding (Pull 13/21/24/30, all with missed soaks)
// 1284699 Light's End also technically spawns soaks off carriers it hits,
// but it's the terminal wipe event — flagging carriers for being inside
// it is noise, so it's deliberately excluded.
// One error per carrier per wave (a glaive series is up to 6 ticks in
// ~0.7s); whether the soaks were then absorbed goes in the description.
const SOAK_ABSORB_ID  = 1254257;              // Tears of L'ura
const NAARU_LAMENT_ID = 1254256;
const CRYSTAL_HOLDER_HIT_ABILITY_IDS = new Set([1254076, 1282469, 1281473]);
const SOAK_FOLLOW_WINDOW_MIN_MS = 3300;
const SOAK_FOLLOW_WINDOW_MAX_MS = 4500;
const HOLDER_HIT_SUPPRESS_MS    = 5000;       // one error per carrier per soak wave
export const MIDNIGHTFALLS_CRYSTAL_HOLDER_HIT_RULE_ID = "wow-mf-crystal-holder-hit";

/** Reconstructs a player's Glimmering carry windows: isCarrying(t). */
function buildCarryChecker(player: PlayerInfo): (t: number) => boolean {
  const transitions = player.debuffs
    .filter((d) => d.abilityId === GLIMMERING_CARRIER_ID &&
      (d.debuffStatus === "applied" || d.debuffStatus === "removed"))
    .sort((a, b) => a.timestamp - b.timestamp);
  return (t: number) => {
    let carrying = false;
    for (const tr of transitions) {
      if (tr.timestamp > t) break;
      carrying = tr.debuffStatus === "applied";
    }
    return carrying;
  };
}

function detectCrystalHolderSoaks(players: PlayerInfo[]): PullError[] {
  // All soak resolutions in the pull, plus whether any lament fired near
  // each (for the outcome sentence).
  const soakEvents: Array<{ timestamp: number; missed: boolean }> = [];
  for (const p of players) {
    for (const h of p.damageTaken) {
      if (h.abilityId === SOAK_ABSORB_ID)  soakEvents.push({ timestamp: h.timestamp, missed: false });
      if (h.abilityId === NAARU_LAMENT_ID) soakEvents.push({ timestamp: h.timestamp, missed: true });
    }
  }
  if (soakEvents.length === 0) return [];
  soakEvents.sort((a, b) => a.timestamp - b.timestamp);

  const errors: PullError[] = [];
  for (const player of players) {
    const isCarrying = buildCarryChecker(player);

    let lastFlagged = -Infinity;
    const hits = [...player.damageTaken].sort((a, b) => a.timestamp - b.timestamp);
    for (const hit of hits) {
      if (!CRYSTAL_HOLDER_HIT_ABILITY_IDS.has(hit.abilityId)) continue;
      if (!isCarrying(hit.timestamp)) continue;
      if (hit.timestamp - lastFlagged < HOLDER_HIT_SUPPRESS_MS) continue;

      const wave = soakEvents.filter(
        (s) => s.timestamp - hit.timestamp >= SOAK_FOLLOW_WINDOW_MIN_MS &&
               s.timestamp - hit.timestamp <= SOAK_FOLLOW_WINDOW_MAX_MS
      );
      if (wave.length === 0) continue; // no soaks resolved — not the causative hit

      lastFlagged = hit.timestamp;
      const anyMissed = wave.some((s) => s.missed);
      const outcome = anyMissed
        ? "Not every soak was absorbed — the remainder detonated into Naaru's Lament."
        : "All of the soaks were absorbed.";
      errors.push({
        ruleId:      MIDNIGHTFALLS_CRYSTAL_HOLDER_HIT_RULE_ID,
        severity:    "Major",
        name:        "Damaged While Holding Crystal",
        description:
          `${player.name} took avoidable damage (${hit.abilityName}` +
          `${hit.amount ? `, ~${Math.round(hit.amount / 1000)}k` : ""}) while holding a ` +
          `Dawn Crystal — the damaged crystal shed light soaks onto the ground. ${outcome}`,
        timestamp:   hit.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   hit.abilityId,
        abilityName: hit.abilityName,
        abilityIcon: hit.abilityIcon,
      });
    }
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Radiance (Dawn Crystal left unclaimed) ────────────────────────────────
//
// A Dawn Crystal sitting on the ground unclaimed for ~6s starts pulsing
// 1282458 "Radiance" — a raid-wide once-per-second hit whose damage RAMPS
// (~40-70k → 200k → 300k+ in Pull 32) until someone picks the crystal up.
// Per the declared assignment (KNOWN_CRYSTAL_ASSIGNMENTS), the wave-1
// trio should be holding from ~+20 and the wave-2 trio from ~+90, each
// until the intermission — so when Radiance starts, the error belongs to
// the assigned carrier(s) not holding at that moment (verified across
// every non-wipe episode in the capture: P9 +21.4 → Cococaines picked up
// at +22, P37 +28.5 → Religiouspp at +30, P33 +89.5 → Cocoroach covered
// by Mythnarra at +90, P32 +97.2 → Sindusk AND Polpo both crystal-less).
//
// Severity (ground truth, Pull 32): ONE assigned player missing their
// crystal = Major on that player; TWO OR MORE = Raid, naming everyone
// without their crystal. A slot also counts as covered when its
// intermission swap tank is holding instead. Suppressed during wipes
// (2+ deaths in the 10s before the episode — a death-stripped crystal
// pulsing mid-wipe is fallout; the 10s window matters: Pull 32's real
// Raid error has 2 stray deaths 5-14s earlier that a 15s window would
// misread as a wipe) and after the intermission starts (crystals are
// juggled deliberately from there, so "assigned carrier" stops meaning
// anything).
const RADIANCE_ID = 1282458;
const RADIANCE_EPISODE_GAP_MS = 5000;   // pulses are 1s apart; >5s = new unclaimed crystal
const RADIANCE_SET1_ACTIVE_MS = 20000;  // earliest observed episode +21.4; pickups done ~+25
const RADIANCE_SET2_ACTIVE_MS = 84000;  // wave-2 pickups start ~+84
const RADIANCE_WIPE_WINDOW_MS = 10000;
const RADIANCE_WIPE_DEATHS    = 2;
const TOTAL_ECLIPSE_CAST_ID   = 1255743;
export const MIDNIGHTFALLS_RADIANCE_RULE_ID = "wow-mf-radiance";

// The per-pull crystal errors only make sense for the roster the declared
// assignment describes — on any other raid's log the names won't resolve.
function crystalAssignmentApplies(players: PlayerInfo[]): boolean {
  const names = new Set(players.map((p) => p.name));
  return [...KNOWN_CRYSTAL_ASSIGNMENTS.set1, ...KNOWN_CRYSTAL_ASSIGNMENTS.set2]
    .every((n) => names.has(n));
}

function intermissionStartOf(enemyCasts: EnemyEvent[]): number {
  const eclipse = enemyCasts.find((e) => e.abilityId === TOTAL_ECLIPSE_CAST_ID);
  return eclipse ? eclipse.timestamp : Infinity;
}

function detectRadiance(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[]
): PullError[] {
  if (!crystalAssignmentApplies(players)) return [];

  const pulses: Array<{ timestamp: number; amount: number }> = [];
  for (const p of players) {
    for (const h of p.damageTaken) {
      if (h.abilityId === RADIANCE_ID) pulses.push({ timestamp: h.timestamp, amount: h.amount ?? 0 });
    }
  }
  if (pulses.length === 0) return [];
  pulses.sort((a, b) => a.timestamp - b.timestamp);

  type Episode = { start: number; end: number; total: number };
  const episodes: Episode[] = [];
  for (const pulse of pulses) {
    const cur = episodes[episodes.length - 1];
    if (cur && pulse.timestamp - cur.end < RADIANCE_EPISODE_GAP_MS) {
      cur.end = pulse.timestamp;
      cur.total += pulse.amount;
    } else {
      episodes.push({ start: pulse.timestamp, end: pulse.timestamp, total: pulse.amount });
    }
  }

  const intermissionStart = intermissionStartOf(enemyCasts);
  const deathTimes = deathEvents.map((d) => d.timestamp);
  const isDeadAt = (name: string, t: number) =>
    deathEvents.some((d) => d.player === name && d.timestamp <= t);
  const carryCheckers = new Map(players.map((p) => [p.name, buildCarryChecker(p)]));
  const holdsAt = (name: string, t: number) => carryCheckers.get(name)?.(t) ?? false;
  const swapTankFor = (name: string) =>
    KNOWN_CRYSTAL_ASSIGNMENTS.intermissionSwaps.find((s) => s.from === name)?.to;

  const errors: PullError[] = [];
  for (const ep of episodes) {
    if (ep.start >= intermissionStart) continue;
    if (deathTimes.filter((t) => t <= ep.start && ep.start - t <= RADIANCE_WIPE_WINDOW_MS)
      .length >= RADIANCE_WIPE_DEATHS) continue;

    const expected = [
      ...(ep.start >= RADIANCE_SET1_ACTIVE_MS ? KNOWN_CRYSTAL_ASSIGNMENTS.set1 : []),
      ...(ep.start >= RADIANCE_SET2_ACTIVE_MS ? KNOWN_CRYSTAL_ASSIGNMENTS.set2 : []),
    ];
    // Checked a hair BEFORE the first pulse: a player who only grabbed the
    // crystal as the pulse landed (Pull 41 — pickup 0.02s before it) was
    // still late; the pulse they caused shouldn't exonerate them.
    const checkAt = ep.start - 100;
    const missing = expected.filter((name) => {
      if (holdsAt(name, checkAt)) return false;
      const tank = swapTankFor(name);
      return !(tank !== undefined && holdsAt(tank, checkAt));
    });
    if (missing.length === 0) continue;

    const stats = ` Radiance pulsed for ~${Math.round(ep.total / 1000000 * 10) / 10}M raid damage over ` +
      `${((ep.end - ep.start) / 1000 + 1).toFixed(0)}s.`;
    if (missing.length === 1) {
      const name = missing[0];
      const info = players.find((p) => p.name === name);
      const lead = isDeadAt(name, ep.start)
        ? `${name} was dead and their Dawn Crystal was left unclaimed — it began pulsing Radiance.`
        : `${name} did not have their assigned Dawn Crystal when it began pulsing Radiance.`;
      errors.push({
        ruleId:      MIDNIGHTFALLS_RADIANCE_RULE_ID,
        severity:    "Major",
        name:        "Radiance",
        description: lead + stats,
        timestamp:   ep.start,
        player:      name,
        class:       info?.className,
        specId:      info?.specId,
        role:        info?.role,
        abilityId:   RADIANCE_ID,
        abilityName: "Radiance",
      });
    } else {
      errors.push({
        ruleId:      MIDNIGHTFALLS_RADIANCE_RULE_ID,
        severity:    "Raid",
        name:        "Radiance",
        description:
          `An unclaimed Dawn Crystal began pulsing Radiance. ` +
          `Without their assigned crystal: ${missing.join(", ")}.` + stats,
        timestamp:   ep.start,
        abilityId:   RADIANCE_ID,
        abilityName: "Radiance",
      });
    }
  }
  return errors;
}

// ─── Accidental crystal pickups ────────────────────────────────────────────
//
// Sometimes a player who is NOT assigned a crystal grabs one at the wave
// spawn (or catches a handoff) — they usually drop it and it finds its way
// back to the assigned carrier. Ground truth: that's a Minor error on the
// accidental holder.
//
// Detection follows the CRYSTAL, not the player: a chain starts when a
// non-assigned player picks up, and continues through drop→pickup handoffs
// (a drop answered by a pickup within 10s is the same crystal changing
// hands). The chain's verdict decides the flags:
//   · reaches an ASSIGNED holder for that wave (trio member, or the slot's
//     intermission swap tank) → every non-assigned holder in the chain is
//     flagged Minor (e.g. Pull 8: Cranberrlee grabs at +19, drops +40,
//     Wyrmtongues +47→+68, Neptune finally gets his crystal +69 — both
//     non-assigned holders flagged);
//   · ends in a death-strip, the intermission, a handoff to a swap TANK,
//     or nothing picks it up → no flags. This is what keeps genuine
//     COVERING unflagged: a player rescuing a dead/absent carrier's
//     crystal holds it until the wipe, the intermission, or the planned
//     tank handoff, so their chain never returns to the trio member whose
//     crystal it was (e.g. Pull 4's Laedria covering the never-picked
//     third wave-1 crystal, and Pull 4's Mythnarra carrying the dying
//     Polpo's slot all phase before handing to Legionshifts on schedule).
// Wave membership comes from the chain's ORIGIN pickup time (before/after
// the +80s boundary); chains that would start mid-wipe (2+ deaths in the
// 10s before the pickup — end-of-pull scrambles) or after the intermission
// never start.
const ACCIDENTAL_HANDOFF_GAP_MS   = 10000;
const ACCIDENTAL_DEATH_STRIP_MS   = 1000;
const ACCIDENTAL_WIPE_WINDOW_MS   = 10000;
const ACCIDENTAL_WIPE_DEATHS      = 2;
export const MIDNIGHTFALLS_ACCIDENTAL_PICKUP_RULE_ID = "wow-mf-accidental-crystal-pickup";

function detectAccidentalPickups(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[]
): PullError[] {
  if (!crystalAssignmentApplies(players)) return [];

  const intermissionStart = intermissionStartOf(enemyCasts);
  const deathTimes = deathEvents.map((d) => d.timestamp);
  const swapTanks = KNOWN_CRYSTAL_ASSIGNMENTS.intermissionSwaps.map((s) => s.to);
  const assignedFor = (wave: 1 | 2): Set<string> =>
    new Set(wave === 1
      ? KNOWN_CRYSTAL_ASSIGNMENTS.set1
      : [...KNOWN_CRYSTAL_ASSIGNMENTS.set2, ...swapTanks]);

  type Transition = { t: number; player: PlayerInfo; type: "pickup" | "drop" };
  const transitions: Transition[] = [];
  for (const p of players) {
    for (const d of p.debuffs) {
      if (d.abilityId !== GLIMMERING_CARRIER_ID) continue;
      if (d.debuffStatus === "applied") transitions.push({ t: d.timestamp, player: p, type: "pickup" });
      if (d.debuffStatus === "removed") transitions.push({ t: d.timestamp, player: p, type: "drop" });
    }
  }
  transitions.sort((a, b) => a.t - b.t);

  const isDeathStrip = (drop: Transition) =>
    deathEvents.some((d) => d.player === drop.player.name &&
      Math.abs(d.timestamp - drop.t) <= ACCIDENTAL_DEATH_STRIP_MS);

  const errors: PullError[] = [];
  const flagged = new Set<string>(); // player names already flagged (once per pull is plenty)
  const consumedPickups = new Set<Transition>();

  for (const origin of transitions) {
    if (origin.type !== "pickup" || consumedPickups.has(origin)) continue;
    if (origin.t >= intermissionStart) continue;
    const wave: 1 | 2 = origin.t < CRYSTAL_WAVE_BOUNDARY_MS ? 1 : 2;
    const assigned = assignedFor(wave);
    if (assigned.has(origin.player.name)) continue; // assigned pickups never start a chain
    if (deathTimes.filter((t) => t <= origin.t && origin.t - t <= ACCIDENTAL_WIPE_WINDOW_MS)
      .length >= ACCIDENTAL_WIPE_DEATHS) continue;  // wipe scramble, not a mistake

    // Follow the crystal through handoffs until a verdict.
    const chainHolders: Array<{ player: PlayerInfo; pickup: number; drop?: number }> = [];
    let holder = origin;
    let resolvedBy: string | undefined;
    while (true) {
      consumedPickups.add(holder);
      const entry = { player: holder.player, pickup: holder.t, drop: undefined as number | undefined };
      chainHolders.push(entry);
      const drop = transitions.find(
        (d) => d.type === "drop" && d.player.name === holder.player.name && d.t >= holder.t
      );
      if (!drop || isDeathStrip(drop)) break;              // died holding / never dropped
      entry.drop = drop.t;
      if (drop.t >= intermissionStart) break;              // juggling took over
      const next = transitions.find(
        (pk) => pk.type === "pickup" && pk.t >= drop.t &&
          pk.t - drop.t <= ACCIDENTAL_HANDOFF_GAP_MS && !consumedPickups.has(pk)
      );
      if (!next) break;                                    // left on the ground (Radiance covers this)
      if (assigned.has(next.player.name)) { resolvedBy = next.player.name; break; }
      holder = next;
    }
    // Only a return to the wave's TRIO member proves the pickup was an
    // accident; a chain ending on a swap tank is indistinguishable from
    // deliberately covering the slot until the planned handoff.
    if (resolvedBy === undefined || swapTanks.includes(resolvedBy)) continue;

    for (const h of chainHolders) {
      if (flagged.has(h.player.name)) continue;
      flagged.add(h.player.name);
      const heldSecs = ((h.drop ?? h.pickup) - h.pickup) / 1000;
      errors.push({
        ruleId:      MIDNIGHTFALLS_ACCIDENTAL_PICKUP_RULE_ID,
        severity:    "Minor",
        name:        "Accidental Crystal Pickup",
        description:
          `${h.player.name} picked up a Dawn Crystal they were not assigned ` +
          `(held ~${heldSecs.toFixed(0)}s) — it was later returned to ${resolvedBy}, its assigned carrier.`,
        timestamp:   h.pickup,
        player:      h.player.name,
        class:       h.player.className,
        specId:      h.player.specId,
        role:        h.player.role,
        abilityId:   GLIMMERING_CARRIER_ID,
        abilityName: "Glimmering",
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

// ─── Light's End crystal position (2026-07-22, Pull 2 VOD) ──────────────────
//
// Light's End itself carries NO usable crystal position — it's a raid-wide
// hit (every player takes it simultaneously), so its damageTaken x/y is
// just each victim's OWN position, not the crystal's. The crystal's ground
// position instead comes from its last carrier's OWN position at the
// moment they dropped it (Glimmering, 1253031, removed) — WCL doesn't
// stamp x/y on debuff events, so this reuses that player's nearest
// damageTaken sample instead (same technique the rest of this file already
// uses for "where was this player standing" — never `healing`, see
// [[mechanic-detection-workflow]]'s position-source correction).
//
// Ground truth (Pull 2, Dn87j4ARzNwYqLvV): Cococaines dropped a crystal at
// +214.93 (last carry-tick position 457271,1102426), then moved ~4.1yd
// before their OWN Starsplinter detonated on it at +216.55 — a self-clip.
// Cross-checking every player's position at the Light's End timestamp
// against that dropped-crystal spot correctly picks Cococaines as nearest
// (~4.1yd, vs. ~10.9yd for the next-closest player, Neximage), confirming
// the self-clip read without needing to hardcode it.
//
// This is a proximity GUESS, not a certain crystal identity (WCL has no
// per-crystal instance id) — the closest player at break time, to the most
// recent unclaimed drop before it. Named in the description as "near X",
// not "held by X".
const CRYSTAL_DROP_LOOKUP_WINDOW_MS = 30000; // a dropped crystal can sit a while before it's clipped
const POSITION_LOOKUP_WINDOW_MS     = 3000;  // max staleness for a "current position" sample

/** Nearest damageTaken sample (either side) with defined x/y, within maxMs — the standard "where was this player standing" source in this file (never `healing`). */
function nearestPosition(player: PlayerInfo, time: number, maxMs = POSITION_LOOKUP_WINDOW_MS): { x: number; y: number } | undefined {
  let best: { x: number; y: number } | undefined;
  let bestDiff = Infinity;
  for (const h of player.damageTaken) {
    if (h.x === undefined || h.y === undefined) continue;
    const diff = Math.abs(h.timestamp - time);
    if (diff < bestDiff) { bestDiff = diff; best = { x: h.x, y: h.y }; }
  }
  return best && bestDiff <= maxMs ? best : undefined;
}

type CrystalDrop = { timestamp: number; playerName: string; x: number; y: number };

/** Every Glimmering (crystal-carry) removal with a resolvable ground position. */
function buildCrystalDrops(players: PlayerInfo[]): CrystalDrop[] {
  const drops: CrystalDrop[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.abilityId !== GLIMMERING_CARRIER_ID || d.debuffStatus !== "removed") continue;
      const pos = nearestPosition(player, d.timestamp);
      if (pos) drops.push({ timestamp: d.timestamp, playerName: player.name, ...pos });
    }
  }
  return drops.sort((a, b) => a.timestamp - b.timestamp);
}

/** Closest player (by position at `atTime`) to wherever the crystal was last dropped before `atTime`. */
function findNearestPlayerToDroppedCrystal(
  atTime:  number,
  drops:   CrystalDrop[],
  players: PlayerInfo[]
): { playerName: string; distanceYalms: number } | undefined {
  const drop = [...drops].reverse().find((d) => d.timestamp <= atTime && atTime - d.timestamp <= CRYSTAL_DROP_LOOKUP_WINDOW_MS);
  if (!drop) return undefined;

  let nearest: { playerName: string; distanceYalms: number } | undefined;
  for (const player of players) {
    const pos = nearestPosition(player, atTime);
    if (!pos) continue;
    const distanceYalms = Math.hypot(pos.x - drop.x, pos.y - drop.y) / 100;
    if (!nearest || distanceYalms < nearest.distanceYalms) nearest = { playerName: player.name, distanceYalms };
  }
  return nearest;
}

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

  const crystalDrops = buildCrystalDrops(players);

  return errors.map((e) => {
    if (e.ruleId !== LIGHTS_END_RULE_ID) return e;

    // AMBIGUITY GUARD (2026-07-22, Pull 16 VOD — user-reported misattribution):
    // near a real wipe, dozens of Starsplinter markers can expire within the
    // same ~1s span (everyone's marks clearing together as the raid dies),
    // not one clean detonation — picking "whichever timestamp is latest" in
    // that cluster is arbitrary and was confirmed WRONG (Pull 16 named
    // Mythnarra; VOD says it was someone else entirely). Only claim a source
    // when EXACTLY ONE detonation falls in the window — checked across both
    // reports: every previously-verified correct case (Cococaines pull2 self-
    // clip, etc.) already had exactly one candidate; every case with 2+ ties
    // to a mass-death moment (11, 15, 16 simultaneous candidates seen).
    const candidates: Detonation[] = [];
    for (const det of detonations) {
      if (det.timestamp > e.timestamp) continue;
      if (e.timestamp - det.timestamp > LIGHTS_END_DETONATION_WINDOW_MS) continue;
      if (isDeadAt(det.playerName, det.timestamp)) continue; // death-strip, not a detonation
      candidates.push(det);
    }
    const source = candidates.length === 1 ? candidates[0] : undefined;
    if (source) {
      // See "Light's End crystal position" above — name the crystal by
      // whoever was closest to its last-known drop spot, when resolvable.
      const nearest = findNearestPlayerToDroppedCrystal(source.timestamp, crystalDrops, players);
      const crystalLabel = nearest
        ? `The Dawn Crystal near ${nearest.playerName} (~${nearest.distanceYalms.toFixed(1)}yd away)`
        : "A Dawn Crystal";
      return {
        ...e,
        description:
          `${crystalLabel} was destroyed, unleashing Light's End. ` +
          `Broken by ${source.playerName}'s Starsplinter detonation ` +
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
    ...detectTerminateCasts(players, enemyCasts, deathEvents),
    ...detectDuskCrystalHealing(players, enemyCasts, friendlyNpcDamage),
    ...detectCosmicFracture(players),
    ...detectCrystalHolderSoaks(players),
    ...detectRadiance(players, deathEvents, enemyCasts),
    ...detectAccidentalPickups(players, deathEvents, enemyCasts),
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
