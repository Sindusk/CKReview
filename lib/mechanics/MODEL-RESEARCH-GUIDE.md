# Mechanic Model Research Guide

**Who this is for:** any researcher writing an encounter model for a boss or
mechanic (currently Codex). The model is the input to detection work. For
the project as a whole, start with [CLAUDE.md](../../CLAUDE.md). For how
detection is built and judged, see [README.md](README.md) in this directory.

## Where the model fits

1. **Research (you).** Write the model as the header comment of the boss's
   module, e.g. `lib/mechanics/wow/va/vashnik.ts`, and commit it as
   "Document Mythic <Boss> mechanics". The module has **no detector code**
   at this stage.
2. **Log verification (Claude).** Claude fetches a real report, checks
   every claim against the events, and adds a `VERIFIED AGAINST LOGS`
   section above yours. Where the two disagree, the log section wins. Your
   section stays underneath as the guide-derived model, lightly edited only
   to point at corrections.
3. **Detection (Claude).** Claude builds rules from the verified model and
   records thresholds with the evidence behind them.
4. **Review (the user).** The user reviews pulls on VOD. Their feedback is
   ground truth and becomes code changes plus pinned rulings.

The more precisely a model says *what the log will show* when something
goes right or wrong, the less of step 2 is guesswork. Everything below
follows from that.

## What a model must contain

Keep the existing house style: a `//` comment block of about 78 columns,
split into `-- SECTION --` headings. It should be dense and specific, not
exhaustive. 150–250 lines per boss has worked well.

1. **Scope and sources.**
   - The difficulty covered (normally Mythic only).
   - The sources, with the date you checked them.
   - Any patch sensitivity: hotfixes that change counts, damage or target
     numbers, and the dates they took effect. The Coiled Altar model does
     this well, so keep doing it.
2. **Shape and chronology.**
   - Phases, and what triggers each one: a timer, boss health, or a kill.
   - The rough order of each cycle.
   - Counts wherever the guides give them. Examples: "5 Bile impacts per
     Catalyst", "3 Burning Venoms", "~24 totems per Imbibe". Counts are what
     turn "was something missed?" into arithmetic.
3. **One block per mechanic,** using the template below.
4. **What ends a pull.**
   - Hard enrage or Berserk timing.
   - Soft enrages, such as stacking raid damage.
   - Every mechanic whose failure is normally unrecoverable.

   Detection has to mark the moment each wipe became inevitable, so this
   list matters as much as the per-player mistakes.
5. **Strategy variance.**
   - Every strategy the community actually uses.
   - What each one makes normal. The static Flame+Shadow Vashnik plan is a
     good example: Blood mechanics never appear, and repeated Infusion
     stacks are deliberate.
   - A strategy choice is never an error by itself.
6. **Not errors.** Damage that is expected and must never be flagged:
   - intentional soaks
   - unavoidable raid pulses
   - the explosion that a correct dispel or kill always produces
   - the chosen cost of a strategy
7. **Open questions for log verification.** A short list of what you could
   not settle, such as "does the wave kill the totem, or only strip its
   shield?". Put this in one list, not scattered through the text as
   instructions.

### Per-mechanic block template

```
// MECHANIC NAME (candidate IDs: cast 12345, player aura 12346, damage
// 12347, periodic tick 12348 — journal links, unverified)
//   What happens:   boss action, targets, counts, durations, cadence.
//   Correct play:   what players do; how assignments are decided
//                   (debuff / role / raid callout / position).
//   Failure modes:  one line each —
//     <mistake> -> LOG SIGNAL: <the event that would appear, or would be
//     missing> ; FAULT: <who; or "not in the log" if assigned by callout>
//     ; CONSEQUENCE: <Minor / Major / Raid, per the definitions below>
//   Removal:        how the aura ends (expiry / dispel / heal-through /
//                   death) and whether each one triggers an effect.
//   Not errors:     expected damage from this mechanic.
```

## Severity definitions detection uses

Frame each failure's consequence in these terms. Say which one you expect,
and what would make it escalate.

| Severity | Meaning |
|---|---|
| **Minor** | Avoidable damage that did not kill anyone or cause the wipe. |
| **Major** | Caused the death of the player or another player, or led to the wipe. It always names a player. |
| **Raid** | Leads to an inevitable wipe. It is used as the pull's cutoff point, and may name no player. |

## Lessons from the first two models (Entombed Sentinels, Vashnik)

### Spell IDs

**Journal spell IDs are usually NOT the IDs in the log.** Every mechanic
has a cast ID, one or more aura IDs and damage/tick IDs, and the journal
links one of them, often a different spell entirely. Real examples:

| Mechanic | Journal link | What the log actually used |
|---|---|---|
| Imbibe | 1283164 | cast 1284663 |
| Plague Froth | 1281907 | carrier aura 1281913, 0–2s companion aura 1281910, proximity tick 1281925 |
| Burning Presence | 1305902 | damage 1305901 |
| Malignant Catalyst | 1282525 | 1282525 is the *damage*; the casts are 1282509 and 1282516 |
| Catalytic Bile | 1282601/1282602 | 1282602 = a soaker's hit; the unsoaked penalty is a separate 1282616 |
| Sentinels Marks | "Mark" IDs | the linked IDs were the *boss* buffs; the player debuffs were different spells |

So do the following:
- **List every related spell by name,** plus any IDs you find. Names
  survive into the log's ability table, and IDs often don't match.
- **Label each ID with the event type you expect.** The types are: cast,
  begincast, player aura, boss aura, damage, periodic tick, and penalty.
- **Hunt for penalty spells.** A mechanic that punishes a miss almost always
  has a separate damage spell for the punishment, like Catalytic Bile's
  unsoaked hit. Finding that spell's name is the single most useful thing a
  model can do.

### Log signals

**Describe failures by their log signal, not only their gameplay.** The
failure signals detection has relied on, in order of reliability:

1. **A distinct penalty or wipe spell,** such as Noxious Blast or Bile's
   unsoaked hit.
2. **A cast that normally never completes, but does on failure.** Every
   Malignant Totem begins an 85s Malignance cast; clearing it stops the
   cast, and a missed totem finishes it.
3. **A stack or count field,** such as the Helical Toxins merge total on
   `applydebuffstack`, or Dripping Fangs stacking on a tank who didn't
   swap.
4. **Who took a damage event, and where they stood.**
5. **Deaths and the ability that killed them.**

For each failure mode, name the most specific signal you expect.

### Removal and consequences

**Spell out removal semantics.** An aura can end by expiry, dispel,
heal-through or the holder's death. Several mechanics fire on any removal:
Exploding Infection explodes when its carrier dies, and carriers dying
together at Imbibe caused five wipes.

**Say what happens to other players** when the holder dies with the aura
still on them.

### What the log shows

The log (Warcraft Logs) exposes:

| Event | Detail |
|---|---|
| Player damage taken | Amount, overkill, and the **victim's** x/y |
| Player debuffs | Apply, remove, and stack events, with stack counts |
| Enemy casts | Begincast and cast, with the caster's x/y |
| Enemy buffs | Apply and remove |
| Deaths | The killing ability |
| Player casts | The spell and its target, which is how dispellers are identified |

The log does **not** show:
- raid assignments or callouts
- visual cues (such as a totem glowing when a wave lines up)
- positions of objects that never cast or get hit
- who dispelled an aura (it only shows through the dispeller's cast)

When a failure depends on one of these, say so. It tells detection to
treat the failure as raid-wide instead of guessing a name.

### Other lessons

**Record geometry precisely when guides give it,** such as lane
directions, radii, and whether patterns are fixed or random. Plague Wave
lanes turned out to be axis-aligned in world coordinates, and that is what
made the source carrier identifiable.

**Environmental hazards count,** such as arena-edge venom. Model them,
including when they appear. Vashnik's edge venom only ever showed up once
the raid had called a wipe.

**Leave implementation to the detection stage.** Instructions such as "do
not hard-code X" or "correlate Y with Z" belong in the open-questions list
as questions, not scattered through the model. What the model is uniquely
good for is:
- how the fight works
- what counts as correct
- what each failure looks like
- who is at fault
