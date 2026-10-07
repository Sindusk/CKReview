// types/PlayerInfo.ts
//
// Stores per-player data derived from WCL CombatantInfo events.
// One PlayerInfo exists per player per pull — fetched eagerly at import time
// and stored in memory alongside the Pull data structure.
//
// This is the single source of truth for a player's spec, role, and class
// within a given pull. It also holds pre-fetched event arrays for each
// tab in the player detail view (DamageDone, DamageTaken, Healing, Debuffs, Casts).

export type PlayerEvent = {
  timestamp:   number;  // ms into the pull
  abilityId:   number;
  abilityName: string;
  // Fully-resolved icon URL (via lib/ability-icons.ts), or undefined if the
  // report's masterData didn't carry an icon for this ability. UI code
  // should render this optimistically and hide on load failure, same
  // pattern already used for spec/class icons.
  abilityIcon?: string;
  amount?:     number;  // damage / healing value when relevant
  extra?:      string;  // e.g. debuff source (caster) name — intentionally not rendered in the UI

  // Target/source labeling — populated depending on tab, see usage below.
  target?:       string;  // target actor name — Damage Done, Healing, Casts (blank = no target)
  source?:       string;  // damage source actor name — Damage Taken only

  // Damage Done / Damage Taken
  isDoT?:        boolean; // marks a periodic/tick damage instance (WCL only for now)

  // Damage Taken
  // FFXIV only — which instance of the source NPC dealt the hit (e.g. which
  // of several simultaneous Forsaken towers), plus the victim's own x/y
  // position snapshot at the moment of the hit (FFLogs centi-yalm units).
  // Consumed by mechanics/forsaken.ts; not rendered in the UI.
  sourceInstance?: number;
  x?:            number;
  y?:            number;
  healthBefore?: number;  // target's health immediately before this hit
  healthAfter?:  number;  // target's health immediately after this hit
  maxHealth?:    number;  // for context/formatting
  overkill?:     number;  // set only on fatal hits

  // Damage Taken — FFXIV only. Resolved (via abilityMap) names of every
  // buff active on the player at the moment this hit landed — FFLogs' own
  // ground truth for "was a mitigation actually up when this damage hit,"
  // strictly more reliable than inferring it from cast timing + an assumed
  // buff duration. Read by exdeath.ts, ultimate-kefka.ts and lib/mitigation/
  // (vulnerability check); not rendered in the UI. Undefined on WCL events and on FF events fetched before this field
  // existed (older cached sample data).
  activeBuffNames?: string[];

  // Damage Taken — FFXIV only. The raw status IDs behind activeBuffNames,
  // in log order. A snapshot from when the hit was calculated: it includes
  // debuffs on the attacking boss (Reprisal, Feint, Addle) and shields, and
  // can still list a status removed up to ~1s before the hit landed. The
  // fields below it are FFLogs' own mitigation breakdown (see
  // FFLDamageEvent): absent on 0-amount hits and on pulls fetched before
  // they were kept. `damageType` is the ability's FFLogs type (128
  // physical, 1024 magical, 32 unaspected). Read by lib/mitigation/.
  statusIds?:         number[];
  unmitigatedAmount?: number;
  multiplier?:        number;
  absorbed?:          number;
  mitigated?:         number;
  blocked?:           number;
  hitType?:           number;
  damageType?:        number;

  // Damage Done — FFXIV only, for the damage analysis (lib/damage/; docs/
  // damage-analysis-plan.md, "Data check findings"). `statusIds` (above)
  // here is the damage-modifier snapshot: the attacker's damage buffs and
  // penalties plus debuffs on the hit's target (Chain Stratagem), never
  // procs; DoT ticks carry the snapshot from when the DoT was applied.
  // `multiplier` holds damage-% modifiers only. hitType 2 = crit.
  directHit?:         boolean;
  bonusPercent?:      number;  // combo/positional actions only
  actorPotencyRatio?: number;  // simulated DoT ticks: FFLogs' damage per potency
  targetActorId?:     number;
  targetInstance?:    number;

  // Damage Done — WoW, for the damage analysis (docs/archive/damage-analysis-plan.md,
  // "WoW port"). `statusIds` holds the tracked auras on the attacker
  // (lib/damage/wow/buff-stream.ts; procs included, unlike FFXIV); there is
  // no `multiplier`. `unmitigatedAmount` is before crit and target-side
  // modifiers. `pet` names the pet or guardian that dealt a hit credited
  // to its owner.
  pet?:          string;

  // Casts — WoW. `fake`: made by WCL, not a button press (Shadowy
  // Apparition). `resources`: the caster's resources before the cast; the
  // secondary one (combo points, Holy Power) appears on spenders only.
  fake?:         boolean;
  resources?:    { type: number; amount: number; max: number; cost?: number }[];
  empowerLevel?: number;

  // Begin-casts and player buffs. Cast time after speed for a begin-cast
  // (WoW: begin → cast of the same ability, 0 for an instant proc; for a
  // cast that never went off, how long it ran before the player's next
  // cast); full status length for an FFXIV buff apply/refresh (WoW buffs
  // carry none).
  durationMs?:   number;
  buffStatus?:   "applied" | "refreshed" | "removed" | "stack" | "stackRemoved";

  // Healing / healingReceived — FFXIV only. The FFLogs healing stream's
  // event type: real heals, plus shield "absorbed" events, the shield's
  // "removebuff" and "calculatedheal" previews (which duplicate a heal).
  // Undefined for WoW and for pulls fetched before it was kept. Count heals
  // with isLandedHeal().
  healType?: "heal" | "calculatedheal" | "absorbed" | "removebuff";
  // Healing: the part of the heal that went over full HP (absent when 0).
  // Read by the damage analysis's heal-GCD checks (FFXIV; WoW since
  // 2026-10-06).
  overheal?: number;

  // Debuffs — carries which side of the on/off transition this event
  // represents, so error-detection.ts can reconstruct uptime windows
  // ("was this debuff active on the player at time T?").
  debuffStatus?: "applied" | "removed" | "stack" | "stackRemoved";

  // Debuffs — WCL only. The NEW stack count carried on a "stack" event
  // (WCL's applydebuffstack `stack` field). Entombed Sentinels' Helical
  // Toxins reports the combined toxin total here when two players collide
  // (see lib/mechanics/wow/va/entombed-sentinels.ts).
  stack?: number;

  // Debuffs — FFXIV only. The specific attack that caused this debuff
  // application (e.g. which boss cast applied Damage Down), when FFLogs
  // reports one (see FFLDebuffEvent.extraAbilityGameID). Lets error-
  // detection.ts's debuffApplied rules name the actual mechanic that was
  // missed ("Damage Down (Black Spark)") instead of just the debuff name.
  causeAbilityId?:   number;
  causeAbilityName?: string;
};

// A heal that landed: not a shield absorb, shield removal or preview.
// Legacy FFXIV pulls (no healType) can't be told apart and pass through.
export function isLandedHeal(e: PlayerEvent): boolean {
  return e.healType === undefined || e.healType === "heal";
}

export type PlayerInfo = {
  // Identity
  actorId:    number;   // matches WCLActor.id / targetID in events
  name:       string;
  className:  string;   // e.g. "Warrior", "Priest"
  specId:     number;   // Blizzard spec ID — see spec-data.ts
  specName:   string;   // e.g. "Protection", "Holy"

  // Role derived from specId (via spec-data.ts)
  role:       "Tank" | "Healer" | "DPS";
  // "Caster" only occurs for FFXIV magical-ranged DPS; WoW specs and FF
  // healers are always plain "Melee"/"Ranged".
  rangeType:  "Melee" | "Ranged" | "Caster";
  game:       "wow" | "ffxiv";   // NEW — used to pick the right color table

  // Pre-fetched event tabs (populated at import, read from memory thereafter)
  damageDone:   PlayerEvent[];
  damageTaken:  PlayerEvent[];
  healing:      PlayerEvent[];
  debuffs:      PlayerEvent[];
  casts:        PlayerEvent[];

  // Heals RECEIVED by this player, from ANY source (not just self-casts —
  // see `healing` above, which is cast BY this player and only safe as a
  // position source when self-targeted). FFXIV only: x/y = this player's
  // OWN position (FFLogs' targetResources always belongs to the target,
  // and the target here always IS this player, so no orientation caveat
  // applies at all — unlike `healing`, every entry here is trustworthy).
  // Confirmed (2026-07-29, report Q3GzJNZg64k1hLRm pull 18): a non-healer
  // rarely self-heals, starving `healing`-based position lookups, but
  // raid healers land a heal on nearly every player every ~2.5s GCD —
  // this is the densest position source available short of damageTaken.
  // See lib/mechanics/player-position.ts's `healingReceived` option. Empty
  // for WoW (WCLHealEvent carries no position at all).
  healingReceived: PlayerEvent[];

  // FFXIV only: every shield absorb on this player, one per shield per hit
  // (0-amount when that shield took nothing). These events also sit in
  // `healingReceived` untyped; this list keeps who cast the shield and
  // which hit it absorbed. Undefined for WoW and for pulls fetched before
  // it existed.
  shieldAbsorbs?: ShieldAbsorb[];

  // For the damage analysis. Undefined for pulls fetched before they
  // existed.
  // - beginCasts: every begin-cast with its cast time (`durationMs`). FFXIV:
  //   the completed "cast" in `casts` lands ~0.5s before the bar ends. WoW:
  //   it lands at the end, and empowered spells' empowerstart counts as a
  //   begin-cast. A begin-cast with no matching cast was interrupted.
  // - buffs: apply/refresh/remove/stack events of this player's job,
  //   proc and raid-buff statuses (lib/damage/{ffxiv,wow}/buff-stream.ts),
  //   with `source` = who applied it; FFXIV also has `durationMs`.
  beginCasts?: PlayerEvent[];
  buffs?:      PlayerEvent[];
};

export type ShieldAbsorb = {
  timestamp:        number;  // ms into the pull; equals the absorbed hit's
  statusId:         number;  // the shield's status
  statusName:       string;
  caster?:          string;  // who cast the shield
  amount:           number;
  hitAbilityId?:    number;  // the boss ability that was absorbed
};
