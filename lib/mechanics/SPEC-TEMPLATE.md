# Mechanic Spec Template

Fill this in (or as much of it as you can) when starting detection work on a
new mechanic, and paste it into the session — it replaces the multi-round
discovery conversation with one pass. **"Unknown" is always a valid answer**;
it just means the session starts with log analysis for that field instead of
a question. Skip whole sections that don't apply.

Each field feeds a specific artifact: the model sections seed the module's
header comment, the error conditions become the detection rules, and the
expected flags per fail pull become `expectations/rulings.json` entries the
moment the detection works. See `README.md` (same directory) for the
attribution philosophy and working method this plugs into.

---

## 1. Identity

- **Mechanic name:**
- **Game / raid / boss:**
- **Phase & rough timing:** (fight-relative if known, e.g. "~+250s, after X's
  cast"; "somewhere in P2" is fine)
- **Repeats?** (once per pull / N resolutions / on a loop)

## 2. What happens (plain language)

Describe the mechanic as you'd explain it to a new raider: what the boss
does, what players are supposed to do, in what order. Include the intended
strategy your raid runs, not just the mechanic's rules — detection usually
checks *your assignments*, not the game's minimum requirements.

- **Assignment scheme:** how does a player know their job? (a debuff they
  get / their role / a declared strategy like kick chains / positional
  convention). If assignments are NOT visible in logs (e.g. "we assign by
  callout"), say so — that's the declared-strategy pattern (README), and
  I'll need the assignment list from you as data.

## 3. Log signatures (all optional)

- **Ability/debuff IDs or names**, if you know any: the assignment debuff,
  the damage tick, the killer ability, the boss cast that starts it.
- **A place to look:** a timestamp in one log where the mechanic starts, or
  a wipe you remember. Anything that narrows the search window.

## 4. Error conditions

One block per distinct mistake. The "who is at fault" line is the most
important field in this document — it's the one thing log analysis cannot
derive (see README: root-cause attribution, death fallout stays unflagged).

- **Error:** (what went wrong, e.g. "soaked the wrong tower")
- **Who is at fault:** (the assigned player? whoever moved? if ambiguous,
  who are the candidates?)
- **Severity:** Major (likely killed someone / caused the wipe) / Minor
  (mistake worth noting, not the cause) / Raid (no single player to blame)
- **Observable outcome, if known:** (who dies / what hits whom / what damage
  appears — outcome-gating beats geometry when positions overlap)

## 5. Evidence (seeds the baselines)

- **Clean pulls:** report code + pull numbers where the mechanic resolved
  correctly (2+ pulls, ideally across reports — invariants are derived from
  clean pulls FIRST).
- **Fail pulls, with expected flags:** per pull: report code, pull number,
  what actually happened, and exactly who should flag ("pull 9: only X
  flags, with the wrong-tower error; Y died but that's fallout"). Each of
  these becomes a ruling in `expectations/rulings.json` once detection
  matches it.

## 6. Open questions

Anything you're unsure about: edge cases you haven't seen fail yet, parts of
the mechanic your raid hasn't reached, "I don't know how the game picks
targets for X". These become the module's "not modeled yet" header section
instead of silent gaps.

---

## Worked example (condensed from the real Forsaken spec)

**Identity:** Forsaken — FFXIV, Dancing Mad (Kefka's Return), Phase 2,
~+250–340s, 8 tower resolutions ~10s apart.

**What happens:** everyone gets a stack-counter debuff at the start; towers
spawn on a ring; each tower is soaked by a pair, and each soaker must stand
at the specific spot their assignment debuff owns because a follow-up AoE is
planted where they stood. **Assignment scheme:** rotating per-player debuffs
(three IDs), visible in logs.

**Log signatures:** stack counter is "Spell's Trouble"; the soak tick is
"Path of Light" (47806); assignment debuffs 1005084/85/86.

**Error conditions:**
- *Missed tower* — fault: the player whose stack dropped with no soak tick;
  Major. Outcome: their stack-loss event has no Path of Light hit near it.
- *Same-debuff pair on a tower (swap)* — fault: both swapped players; Major.
- *Soaked too far in* — fault: the mispositioned soaker (NOT whoever their
  cone then hit); Major. Outcome-gated: flagged via who the follow-up
  actually hit, because clean/fail soak distances overlap.

**Evidence:** clean = every tower in pulls 2/5 of report rXBb… (80 clean
soaks across five logs). Fail = pull 17-4: SGE/DRK missed tower #7 — only
they flag; the cone deaths afterward are fallout.

**Open questions at the time:** whether post-death missed-tower flags should
be suppressed; the failed-tower kill ability (47807) unmodeled.
