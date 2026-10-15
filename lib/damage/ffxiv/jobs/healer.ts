// lib/damage/ffxiv/jobs/healer.ts
//
// Healer checks (healer batch). The first DPS study's biggest gap was the
// healers (−3.6k rDPS each, docs/dps-analysis.md): extra heal GCDs that
// the incoming damage didn't call for. So the headline is measured per
// heal GCD, not guessed from counts:
//
// ── Heal GCDs ──────────────────────────────────────────────────────────
// For each heal GCD (timeline.ts gcdKinds), what it actually did:
//   - its direct heal: the player's landed heals of that ability within
//     1.5s of the cast landing, amount and overheal
//   - its HoT: heals logged under a status it applies, until the next cast
//     of the same action (at most 30s)
//   - its shield: shield absorbs (PlayerInfo.shieldAbsorbs, on every
//     player) by a status it applies, cast by this player, credited to the
//     latest cast applying that status to that player (Adloquium, Succor
//     and Concitation share Galvanize; a SCH pre-shields four players with
//     four Adloquiums before P2, so matching on the target matters)
// Efficiency = (healed + absorbed) ÷ (healed + absorbed + overheal). Under
// HEAL_WASTE_SHARE it's a finding, valued at the healer's damage filler
// (their most-cast damage GCD without a cooldown) and marked inference:
// whether a heal was needed for safety is the healer's call. A heal GCD
// during forced time (boss untargetable) costs no damage and is forced.
// The dialog shows heal vs damage GCDs next to the raid's damage taken.
//
// ── Job specifics ──────────────────────────────────────────────────────
// - DoTs (shared.ts dotFindings): Biolysis, Combust III, Dia, Eukrasian
//   Dosis III / Dyskrasia, from xivanalysis's per-job DoTs modules.
// - Astrologian Divination, from xivanalysis
//   src/parser/jobs/ast/modules/Divination.tsx: 8 GCDs; Lord of Crowns,
//   Oracle and Combust III once each. Divination is +6% (FFLogs
//   multiplier: Technical Finish + Divination = 1.11).
// - Cooldown drift: tracked-cooldowns.ts.
// - Hardcast AoE spells on one target (aoeOnOneTarget, below).
// - Astrologian, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull
//   8: its missed Lightspeed (Divination at 4:08) isn't a finding of its
//   own; what it cost (a cancelled cast, the gap weaving the burst) is
//   already in the GCD gaps. Its Combust III clipping (9.8s a minute) is
//   higher than our seconds were because ours is per target: a DoT on a
//   second enemy isn't a clip. Rechecked on 2T1HzdPKgbhM43am Dancing Mad
//   fight 10 (2026-10-09): its 82.7% Combust uptime exposed a bug (a DoT
//   with no logged removal ran to the end of the pull, hiding the 12s
//   gaps at 13:54 and 16:59); its 10 interrupted casts and 1 Gravity II
//   match. Its Earthly Star hold is the drift check now
//   (tracked-cooldowns.ts, valued from the Stellar hits): the star is
//   placed for the heal plan, but a held one still loses its damage.
// - Astrologian, checked against xivanalysis on dDar482XvFKBPJYh FRU kill
//   (7.1, 2026-10-12): its 18/20 cards and "2 Draws missed" are draws
//   held across P4's downtime and to align Divination (no damage); its
//   one Draw over an unplayed card holds (`cards` below); 3 Divinations
//   without Lightspeed cost what the weaving gaps already count; 2 of its
//   5 interrupted casts were the boss going untargetable (6:54, 12:55).
// - Astrologian, checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing
//   Mad kill (7.5, 2026-10-13): GCD uptime, Combust uptime, 40
//   interrupted casts, 1 Gravity II, the weaving gaps (16:59 12s, 13:41
//   9s) and Combust missing from Divination all match findings here.
//   Overstated: Combust clipping 11.8s a minute (per target it's 2.3s;
//   P3's Exdeath and Chaos DoTs counted as one); "1 Earthly Star use
//   missed" (it can't see the pre-pull star, exploded 0:18); 3 Combusts
//   before invulnerability (each got 7-9 ticks, more than a Fall
//   Malefic). Divination GCD counts differ by definition: it counts heal
//   GCDs, these windows count damage GCDs and heal-gcd values the heals.
//   No damage: the 12:05 Divination without Lightspeed (all 8 GCDs and
//   every oGCD fit), overheal, Synastry, Horoscope / Neutral Sect.
//   Rechecked on the same report's fight 16 (2026-10-13), nothing new:
//   GCD uptime (93.7% both), the weaving gaps (15:32 4.6s, 16:19 and
//   17:28 triple weaves, 17:57), Oracle missing from the 8:03 Divination,
//   Combust missing from five, 7 interrupted casts and the tincture
//   finding all match. Overstated: Combust uptime 85.6% (its gaps are
//   P1/P2/P4 downtime; the only unforced one is Exdeath's 9s at 8:43, a
//   dot-clip finding); clipping 17.2s a minute (per target ~52s over
//   the pull, P3's two bosses again); 3 Combusts before invulnerability
//   (8-9 ticks, 63-80k, each more than a 38k Fall Malefic); "1 Earthly
//   Star missed" (it counts from 0:00 past a pre-pull star exploded at
//   0:17; 55s held in all, under one recharge). No damage: overheal,
//   Synastry, Horoscope, Swiftcast 0/28.
// - Astrologian, checked against xivanalysis on K6qfMamL7rN8yz2Q Vamp
//   Fatale (7.4, 2026-10-14). Matched: GCD uptime (94.7% / 95.1%), its 7
//   GCD downtimes and 9 weaving issues by time, the 5:47 interrupted
//   Gravity II, 2 Gravity IIs on one target, Combust missing from four
//   Divinations and 8:12's 7/8 GCDs, the 0:58 Combust before Vamp's 20s
//   out of reach (a dot-clip finding). Fixed: the 8:10 triple weave
//   (Earthly Star, Divination, The Balance after an instant Fall Malefic,
//   1.87s) read as Undead Deathmatch movement; three weaves are now the
//   delay, not movement (checks.ts). Built: the Arcana lane on the timeline
//   (jobs/gauges.ts arcana; its card log matches, 10/10 draws, 36 plays,
//   4 cards replaced unplayed). Not adopted: the 1:38 Combust on
//   Coffinmaker (20s of ticks before it died, more than a Fall Malefic);
//   the Arrow / Spire dropped (mitigation cards); overheal, defensives,
//   Swiftcast.
//   Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
//   2026-10-14). Matched: GCD uptime (87.6% / 88.9%), its 6 GCD downtimes
//   and 10 weaving issues by time (6:34 4.1s and 8:41 5.4s are the two
//   Divinations' weaves; 4:53-5:01 is Hot Aerial movement here), the
//   6:36 Divination at 6/8 and the tincture 8s after it, Combust missing
//   from the opener's Divination, the 8:26 interrupted cast (2:43's is the
//   bosses leaving). Combust uptime 81.2%: the 5:02-5:20 gap (18.6s,
//   nothing re-applied through Hot Aerial though Combust is the instant)
//   holds. Fixed: the last 17.1s (no Combust after 8:03, kill 8:51) read
//   as 53k; a gap running to the end has no later refresh to push back,
//   so it's the ticks less the GCD (shared.ts dotFindings; 10k). Not
//   adopted: 7 Combusts "before invulnerability" (5:20 / 5:23 got 6 and 5
//   ticks, 6:13 on Watery Grave 6: each more than a Fall Malefic); the
//   missing Lightspeed at 6:35 (its cost is the 4.1s gap). Built after: a
//   window the kill cuts short is judged up to the kill (shared.ts
//   burstWindowFindings), so the 8:41 Divination counts Lord of Crowns,
//   played at 7:45 from the 7:35 Astral Draw (Balance from the same draw
//   was held to 8:41; Umbral Draw waited until 8:42); and Divination is
//   valued at the window's measured bonus (17% there), not 6%.
//   Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15).
//   Matched: GCD uptime (90.5% / 90.6%), its GCD downtimes and 14 weaving
//   issues by time (10:07's 5.4s is the Divination's 8 weaves without
//   Lightspeed: 99k, plus 7/8 GCDs; 6:02, 6:29, 7:41 are Flatliner
//   movement), Combust missing from the opener's Divination, 12/12
//   cards. Ours is larger at 3:34-3:46 (6.0s against 3.6s): it times
//   that GCD from Helios Conjunction's end and skips the 1.4s after the
//   interrupted Fall Malefic. Fixed: Earthly Star held 1:11 in all (its
//   claim): a pre-pull use's stretch was dropped whole, though its recast
//   ended a minute into the pull at the latest (the star exploded 0:18.5,
//   the next cast 1:18.1), so 18.1s went uncounted (checks.ts). That also
//   corrects the qjCMx4bRfgNKwX9T fight 16 note above: xivanalysis's
//   count from 0:00 was nearer than ours. 59.6s after the per-stretch
//   hold allowance, under the 60s recast, but a tenth star would have
//   landed ~10:21 against the 10:38 kill: a lost use under the kill rule
//   (checks.ts usesLostAtKill, 40k). Not adopted: 5 interrupted casts to our
//   4 (the 7:06 one is in the towers' movement; the idle is in the gaps
//   either way); Lightspeed (its cost is the 10:07 gap); overheal,
//   defensives, Swiftcast 6/14, Horoscope.
// - Sage, checked against xivanalysis on K6qfMamL7rN8yz2Q Vamp Fatale (7.4,
//   2026-10-14). Matched: GCD uptime (97.0% / 96.6%), the 4 interrupted
//   casts, Eukrasian Dosis III uptime (91.9%: the 1:05, 4:06, 7:36 and
//   8:10 gaps here), the tincture. GCD gaps: its ABC measures from a hard
//   cast's end (checks.ts header), so it lists 5 to our 18 (all real).
//   Built: the Addersting lane (jobs/gauges.ts; 4 shields broke, 7
//   Toxikons). Not adopted: the 1:42 Eukrasian Dosis on Coffinmaker
//   (6 ticks, ~59k, before it died: more than a Dosis III); Addersgall
//   30/34 (healing and MP); Zoe, Swiftcast. Open: Phlegma III 14/15 is a
//   charge held to the kill (10.7s at full charges in all), the same gap
//   as Living Muse (docs/open-items.md).
//   Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
//   2026-10-14). Matched: GCD uptime (94.7% both), the 4 interrupted
//   Dosis IIIs (1:29 Red Hot leaving, 5:39 the Deep Aerial tower: forced;
//   4:27 a 2.4s gap in raid buffs, 71k; 7:15), the 2:04 weave, 6:37's
//   1.2s gap, Eukrasian Dosis uptime 73.2%: 7:21-7:40 (18.8s through
//   Freaky Pyrotation, Toxikon II pressed where Eukrasian Dosis was the
//   instant due) and 8:12 hold. Fixed: the 6:12-6:48 gap (124k) ran
//   through the prison breaking (3.6s with no target, under the 5s a
//   forced stretch needs to cut a gap); no target at all now cuts it
//   (shared.ts dotFindings): the Watery Grave stretch is the ticks a
//   refresh at 6:12 had left (6, against a Dosis III), then the 14s from
//   the bosses' return to 6:48.9 (two shields, three Toxikons), 81k. Not
//   adopted: 8 Eukrasian Dosis "before invulnerability" (each ran its
//   course or out-did a Dosis III; the application check finds none);
//   Phlegma III 14/15 (11.1s at full charges; one held at the kill, the
//   charges-at-kill proposal); Addersgall (healing); overheal, defensives,
//   Swiftcast.
//   Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15),
//   nothing to build. Matched: the 3:29 death, all 12 GCD downtimes and 5
//   weaving issues by time (6:03, 6:31, 7:02, 7:40 are Flatliner movement;
//   4:00-4:05, 4.4s after the raise, is hers: the other ranged kept
//   casting), the 4 interrupted casts, Eukrasian Dosis uptime (85%: its
//   gaps are ours plus the death). App-only, holds: Eukrasian Dosis
//   refreshed 18s early at 7:15.5 and 20s early at 9:51.6 to snapshot the
//   tincture (58k). Not adopted: Psyche 10/11 (27s held beyond the
//   opener, under one 60s recharge); the 9:50 tincture's Phlegma 1/2 and
//   Psyche 0/1 (Psyche went at 9:42.6 with Zoe; the second Phlegma
//   charge waited to 10:29.9; our tincture finding moves it to 10:08,
//   which covers both); Addersgall (it says 1 stack lost, we show 2;
//   healing), overheal, Kardia, defensives, Swiftcast.
// - Scholar, checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing Mad
//   kill (7.5, 2026-10-13): GCD uptime, Chain Stratagem and Aetherflow
//   (no use lost), 6 interrupted casts and its weaving gaps (17:24 6.2s,
//   17:19, 18:16, 17:55; 11:49 is the end-of-P3 hold) all match here.
//   Overstated: Biolysis clipping 15.8s a minute (per target it's ~48s
//   over the pull; P3's two bosses again); Dissipation drift 3:11 (it
//   counts 6:05-7:40, when Seraph, summoned 5:58, locks Dissipation out
//   (no Dissipation while Seraph is out, confirmed by the user) until
//   P2's downtime: from 7:09 on, room is 6 and it used 6); Biolysis
//   at 6:06 before the downtime (3 ticks, 46k, a Broil IV's worth; the
//   14:03 one is a dot-clip finding). No damage: overheal, Faerie Gauge
//   overcap, Swiftcast 7/23.
//   Same report, fight 16's Scholar (2026-10-13): GCD uptime, 27
//   interrupted casts and the weaving gaps (1:55 4.9s, 13:51-13:57,
//   16:54, 12:57) match; 11:29 is the end-of-P3 hold. Built: Aetherflow
//   17/18 and its "3 wasted stacks": 31s held at 9:18 and 26s in P5
//   brought the last one back 0.2s before the kill, so it counts as no
//   use (checks.ts: a press whose effect can't land isn't a use;
//   Aetherflow valued from Energy Drain). Not adopted: Chain Stratagem
//   9/10 (held 14:11-16:16 across P4's downtime to meet the 16:16 raid
//   buffs; room is 9); Biolysis 82.3% (its gaps are downtime, plus the
//   two P5 dot-uptime findings); Biolysis before invulnerability at 6:03
//   (5 ticks, 48k against a 44k Broil IV, past P2's HP check anyway) and
//   11:56 (a forced dot-clip finding).
// - Healer DoTs are valued per application against the filler
//   (shared.ts dotFindings with fillerId), not by seconds overwritten.
// - Sage, checked against xivanalysis on dDar482XvFKBPJYh FRU kill (7.1,
//   2026-10-12): its Psyche 16/17 holds (ready 5:10, unused through 41s
//   of targetable boss before P2's downtime); Phlegma III 28/29 holds
//   only as perfect play (the 0:09 opener Phlegma, aligned to burst, put
//   a recharge 1s past the start of P4's downtime), so it isn't counted;
//   its Eukrasian Dosis clipping (24.4s a minute) counts the double casts
//   on P4's two bosses (10:42/10:45, 11:10/11:13, 12:38/12:41) as clips;
//   Addersgall / Addersting are healing resources (Addersgall is drawn on
//   the timeline, gauges.ts). 1 of its 4 interrupted casts (12:55) was
//   the boss going untargetable.
// White Mage is unverified: no sample pull has one.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows } from "../../timeline";
import { aoeOnOneTargetFindings, burstWindowFindings, dotFindings, k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** The healer's damage filler: most-cast damage GCD with no cooldown of its own. */
function filler(ctx: PlayerCheckContext): { id?: number; name: string; value: number } {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const counts = new Map<number, { name: string; n: number }>();
  for (const u of ctx.uses) {
    if (kinds.get(u.action.id) !== "damage" || u.action.cooldownMs > 2_500) continue;
    const c = counts.get(u.action.id) ?? { name: u.abilityName, n: 0 };
    c.n++;
    counts.set(u.action.id, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return top ? { id: top[0], name: top[1].name, value: ctx.values.perUse(top[0]) } : { name: "damage GCD", value: 0 };
}

const healGcds: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const heals = ctx.player.healing.filter((e) => e.healType === undefined || e.healType === "heal");
  const absorbs = ctx.pull.players.flatMap((p) => (p.shieldAbsorbs ?? []).map((a) => ({ ...a, target: p.name })))
    .filter((a) => a.caster === ctx.player.name);
  const healUses = ctx.uses.filter((u) => u.startMs < ctx.endMs && kinds.get(u.action.id) === "heal");
  if (healUses.length === 0) return out;

  // Shield absorbs credited to the latest cast applying that status to that
  // player: a single-target cast only shields its target, a party cast
  // (targeting the healer or nothing) shields anyone.
  const party = (u: (typeof healUses)[number]) => u.target === undefined || u.target === ctx.player.name;
  const credited = new Map<(typeof healUses)[number], number>();
  for (const a of absorbs) {
    let best: (typeof healUses)[number] | undefined;
    for (const u of healUses) {
      if (!u.action.appliesStatusIds.includes(a.statusId)) continue;
      if (!party(u) && u.target !== a.target) continue;
      if (u.startMs <= a.timestamp && a.timestamp - u.startMs <= HOT_MAX_MS) best = u;
    }
    if (best) credited.set(best, (credited.get(best) ?? 0) + a.amount);
  }

  const fill = filler(ctx);
  const forced = mergeWindows(ctx.forced);
  for (let i = 0; i < healUses.length; i++) {
    const u = healUses[i];
    const landed = u.startMs + u.castMs;
    const next = healUses.slice(i + 1).find((x) => x.action.id === u.action.id)?.startMs ?? Infinity;
    const hotEnd = Math.min(next, landed + HOT_MAX_MS);
    let healed = 0, over = 0;
    for (const h of heals) {
      const direct = h.abilityId === u.action.id && h.timestamp >= u.startMs && h.timestamp <= landed + HEAL_LAND_MS;
      const hot = u.action.appliesStatusIds.includes(h.abilityId) && h.timestamp >= landed && h.timestamp < hotEnd;
      if (!direct && !hot) continue;
      healed += h.amount ?? 0;
      over += h.overheal ?? 0;
    }
    const absorbed = credited.get(u) ?? 0;
    const potential = healed + absorbed + over;
    if (potential <= 0) continue;
    const share = (healed + absorbed) / potential;
    if (share >= HEAL_WASTE_SHARE) continue;
    const isForced = inWindows(u.startMs, forced);
    out.push(finding(ctx, {
      kind: "heal-gcd", startMs: u.startMs, endMs: landed, forced: isForced,
      cause: isForced ? "boss untargetable: the GCD was free" : undefined,
      label: `${u.abilityName} mostly overhealed`,
      lostDamage: fill.value, inference: true,
      basis: `a ${fill.name} (${k(fill.value)} average) instead; whether the heal was needed for safety is the healer's call`,
      detail: `${u.abilityName} at ${clock(u.startMs)}: ${Math.round((1 - share) * 100)}% overheal` +
        (u.action.appliesStatusIds.some((id) => absorbs.some((a) => a.statusId === id)) ? `, shield absorbed ${k(absorbed)}` : ""),
    }));
  }
  return out;
};

// Hardcast AoE damage GCDs: on one target they do less than the filler,
// which takes the same cast (Gravity II 130 potency vs Fall Malefic 270;
// xivanalysis flagged 3 on jN3XDrf2z8PmLgRJ Vamp pull 8, all found).
// Each cast whose hits reached a single enemy loses the filler's average
// minus what it dealt. The instant ones (Dyskrasia II, Art of War II) are
// left out: they're what a healer presses while moving, when the filler
// isn't an option, so the filler overstates the loss.
const AOE_GCD_KEYS = ["GRAVITY", "GRAVITY_II", "HOLY", "HOLY_III"];
const aoeOnOneTarget: JobCheck = (ctx) => {
  const fill = filler(ctx);
  return aoeOnOneTargetFindings(ctx, AOE_GCD_KEYS.filter((key) => A[key]).map((key) => A[key].id), () => fill);
};

const dot = (key: string, ...more: string[]): JobCheck => (ctx) => dotFindings(ctx, {
  statusIds: [key, ...more].map((x) => S[x].id),
  name: S[key].name,
  durationMs: S[key].duration ?? 30_000,
  fillerId: (c) => {
    const f = filler(c);
    return f.id === undefined ? undefined : { id: f.id, name: f.name };
  },
});

const divination: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.DIVINATION.id,
  name: "Divination",
  // Measured per window (user, 2026-10-14): an action moved out of it
  // loses every raid buff it would have had, not Divination's 6% alone.
  bonus: "observed",
  bonusBasis: "the window's bonus measured from the AST's own hits (FFLogs multiplier in it over their median outside raid buffs; Divination alone is +6%)",
  expectedGcds: () => 8,
  expected: () => [
    // A card: back only with the next Astral Draw.
    { ids: [A.LORD_OF_CROWNS.id], count: 1, name: "Lord of Crowns", readyAgain: nextAstralDraw },
    { ids: [A.ORACLE.id], count: 1, name: "Oracle" },
    // Combust deals no direct damage: a refresh inside Divination is worth
    // its ten ticks snapshotting the window's bonus.
    { ids: [A.COMBUST_III.id], count: 1, name: "Combust III", value: (c) => avgTick(c, S.COMBUST_III.id) * 10, scaled: true },
  ],
});

function nextAstralDraw(ctx: PlayerCheckContext, t: number): number {
  return ctx.player.casts.find((c) => c.abilityId === A.ASTRAL_DRAW?.id && c.timestamp > t)?.timestamp ?? Infinity;
}

function avgTick(ctx: PlayerCheckContext, statusId: number): number {
  const ticks = ctx.player.damageDone.filter((e) => e.abilityId === statusId);
  return ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;
}

export const SCH_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("BIOLYSIS")];
// Astrologian cards. Astral Draw gives The Balance (Play I) and Lord of
// Crowns, Umbral Draw The Spear; the next Draw replaces what's unplayed
// (xivanalysis's Draw "used when there was an available Play I or Lord of
// Crowns"). A card is lost when no play of it came between its draw and
// the next one. The Balance / The Spear are worth what one play of them
// added to the party in this pull (the buff ledger's share of each hit
// under them ÷ plays); Lord of Crowns its own average. The first card can
// come from a pre-pull draw: plays before the first Draw are its. A draw
// with no later one is left alone (the pull ended). Forced when the draw
// and the next one were all forced time (nothing to play it on).
// dDar482XvFKBPJYh FRU kill: The Balance from the 17:19 Astral Draw
// was never played; the 18:19 Umbral Draw replaced it before the 18:27
// Divination.
const CARD_FORCED_SLACK_MS = 2_500;
const cards: JobCheck = (ctx): DamageFinding[] => {
  const astral = A.ASTRAL_DRAW?.id, umbral = A.UMBRAL_DRAW?.id;
  if (astral === undefined || umbral === undefined) return [];
  const draws = ctx.player.casts.filter((c) => c.abilityId === astral || c.abilityId === umbral)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (draws.length < 2) return [];
  const playsOf = (actionId: number) => ctx.player.casts.filter((c) => c.abilityId === actionId).map((c) => c.timestamp);
  // What one play of a party card added: its share of every hit under it.
  const cardValue = (statusId: number, actionId: number) => {
    const plays = playsOf(actionId).filter((t) => t < ctx.endMs).length;
    if (!ctx.ledger || plays === 0) return 0;
    let added = 0;
    for (const p of ctx.pull.players) {
      for (const e of p.damageDone) {
        if (e.timestamp >= ctx.endMs || !e.statusIds?.includes(statusId)) continue;
        added += (e.amount ?? 0) * ctx.ledger.share(statusId, p);
      }
    }
    return added / plays;
  };
  const kinds = [
    { draw: astral, action: A.THE_BALANCE.id, status: S.THE_BALANCE.id, name: "The Balance" },
    { draw: umbral, action: A.THE_SPEAR.id, status: S.THE_SPEAR.id, name: "The Spear" },
    { draw: astral, action: A.LORD_OF_CROWNS.id, status: undefined, name: "Lord of Crowns" },
  ];
  const forced = mergeWindows(ctx.forced);
  const out: DamageFinding[] = [];
  for (const kind of kinds) {
    const plays = playsOf(kind.action);
    const value = kind.status !== undefined ? cardValue(kind.status, kind.action) : ctx.values.perUse(kind.action);
    if (value <= 0) continue;
    for (let i = 0; i < draws.length - 1; i++) {
      const d = draws[i], next = draws[i + 1];
      if (d.abilityId !== kind.draw || d.timestamp >= ctx.endMs) continue;
      if (plays.some((t) => t >= d.timestamp && t < next.timestamp)) continue;
      const span = next.timestamp - d.timestamp;
      let covered = 0;
      for (const f of forced) covered += Math.max(0, Math.min(f.endMs, next.timestamp) - Math.max(f.startMs, d.timestamp));
      const isForced = span - covered < CARD_FORCED_SLACK_MS;
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: d.timestamp, endMs: next.timestamp, forced: isForced,
        cause: isForced ? "nothing to play it on between the draws" : undefined,
        label: `${kind.name} not played`,
        lostDamage: value, inference: true,
        basis: kind.status !== undefined
          ? `${k(value)}: what one ${kind.name} added to the party in this pull (its share of every hit under it ÷ plays)`
          : `${k(value)} average ${kind.name}`,
        detail: `${kind.name} from the ${d.abilityName} at ${clock(d.timestamp)} wasn't played before the ${next.abilityName} at ${clock(next.timestamp)} replaced it`,
      }));
    }
  }
  return out;
};

export const AST_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("COMBUST_III"), divination, cards];
export const WHM_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("DIA")];
export const SGE_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("EUKRASIAN_DOSIS_III", "EUKRASIAN_DYSKRASIA")];
