# Opening screen and workspace refresh: plan

Started 2026-10-31. Goal: the app opens on "start a raid review", not on an
empty raid review, and a loaded review reads as a dense analysis workspace.
Keep about 80% of the current look (black and gold, Cinzel titles, gilt
panels); change the empty state, the hierarchy and the text contrast.

Source: a ChatGPT mockup and critique the user brought, reviewed against the
code. Accepted and rejected points are below so later steps don't reopen
them.

Read CLAUDE.md first (commit/push rules, co-author trailer, "show, don't
describe", small UI tweaks need no visual verification loop) and the
"Layout" section of [app-architecture.md](app-architecture.md).

## How we work through it

- One step at a time, in the order below. The user adds tweaks along the
  way; take them one by one, inside the step they belong to.
- Each step with a visual choice starts with 2-3 rendered mockups built
  from a real report's data. The user picks; then build.
- UI-only steps: `npx tsc --noEmit` passes, commit, push. No validate.js
  (no detection change).
- When a step lands, mark it done here with the date and move any decision
  it settled into app-architecture.md's "Layout" section. Delete this file
  when every step is done.

## Decisions already made

- **Two modes.** No report loaded: an onboarding screen. Report loaded: the
  existing three-column workspace.
- **One import entry point per mode.** Empty: the hero's URL field only (no
  toolbar import). Loaded: the toolbar becomes the report context bar.
- **Empty screen hides the empty panels.** Roster, Pull Review, VODs, Pulls
  and the video panel don't render until there's a report (at most a faint
  outline of the layout, if a mockup shows it helps).
- **Damage / Mitigation / Strategy** are dialog launchers, not tabs. They're
  disabled (or hidden) until a report is loaded and never drawn with a
  selected state.
- **Keep the fantasy identity.** No generic SaaS rounded-card dashboard.

## Open questions (ask at the step that needs them)

- **Selection colour** (step 5): the current rule is "selection and active
  tabs are arcane blue, never gold"; the mockup used gold. Keep blue unless
  the user says otherwise; a change touches the whole app.
- **VOD before a log** (step 3): Add VOD works with no report today. Keep
  that flow (an "Add VOD" link on the empty screen) or require a log first?
- **Switching reports** (step 2): "Import Another" was removed on purpose
  (`WCLImportBar` comment #7). Should the context bar get a "Change report"
  action?
- **Hero art** (step 1): use a background image or not. `public/` is
  gitignored, so an image is bundled like the panel ornaments (relative
  CSS `url()` from `components/ui/`), and it shows on the empty screen
  only.

## Steps

### 1. Empty-state onboarding screen — done 2026-10-31

Built as `components/OnboardingView.tsx` (layout A, ChatGPT's centred hero).
User's choices: three steps, **Connect to Logs → Import Report → Review**;
the first token shows a check once either provider is connected; line
glyphs drawn for the steps and the Import button; Import uses the plain
gold-framed `.ck-btn` (like Damage / Mitigation / Strategy), not primary
blue; Live log is a checkbox under the field. No recent reviews and no
statics list. No background art yet (still open, below). The screen shows
while there's no report and no VOD, so Add VOD (header) and a restored
`?session=` link with VODs still open the workspace.

Original scope, for reference: when no report is loaded (no `loadedReportCode`, not importing), render an
onboarding view in place of the panel grid.

- Hero: title, one line of purpose, the report URL field + Import (primary
  blue), the Live log toggle beside it, "Supports Warcraft Logs and FF Logs
  report URLs".
- Import progress and errors show in the hero (reuse `WCLImportBar`'s
  importing / error states, so there is one implementation).
- Steps strip: **Connect logs account** (only when neither provider is
  connected: `isAuthenticated()` / `isFFAuthenticated()`, as BurgerMenu
  reads them; opens `LogApiSetupDialog`) → Import report → Select a pull →
  Review VOD. Mark the current step.
- Returning users: "Resume last review" and recent reviews / statics links,
  if a client-readable source exists (check what session restore and
  statics expose before mocking it; don't add an API call on page load
  without asking).
- The `SessionFoundDialog` / `SampleDataFoundDialog` flows stay as they
  are; they trigger from the hero's Import exactly as from the toolbar.
- Header: Add VOD leaves the header (see step 3); on the empty screen it's
  at most a secondary link, per the open question.
- Done when: a fresh load shows only header + hero; importing swaps to the
  workspace; tsc passes.

### 2. Report context bar (loaded state)

Replace the `Log Loaded: <code>` chip in the toolbar with a context bar:
report title, boss / encounter, selected pull number, Kill or Wipe (and
wipe %), duration, player count, VOD count. Keep the live-log status, the
sample-data badge and the rate-limit line, de-emphasised at the right.

- Damage / Mitigation / Strategy sit at the right of this bar, disabled
  until a report is loaded.
- Data is all on the page already (`activePull`, `displayPulls`, `vods`,
  report meta). No new fetch.
- Done when: the bar updates with pull selection; no layout shift in the
  grid below.

### 3. Header and toolbar consolidation

- Move Add VOD from the header into the VODs panel header (as `+ Add VOD`).
- Game indicator (FFXIV / WoW crest) in the header once a report is loaded.
- Consider folding the context bar into the header row to give the panels
  ~40px more height. Mock both (separate strip vs merged) and let the user
  pick. `HEADER_H` stays 80px unless the user chooses otherwise
  (BrandBanner scales via `ART_H`).
- Done when: no orphan controls in the header; the page still never
  scrolls.

### 4. Typography and contrast pass

- Raise 11px secondary text (import bar, status lines, panel subtitles) to
  12-13px where space allows.
- Lift `--ck-text-2` / `--ck-text-3` contrast (currently `#b3afa6` /
  `#80848a`) to meet WCAG AA on the panel background for body-size text.
- Cinzel stays for titles; Inter everything else; `.ck-num` for numbers.
- Replace remaining hardcoded slate colours in the import bar
  (`#94a3b8`, `#e2e8f0`, `#1f2937`) with theme tokens.
- Done when: no new hardcoded greys; tsc passes. The user checks visually.

### 5. Panel hierarchy and border tiering

- Full gilt ornaments (corners + diamonds) on the center panel only;
  supporting panels get a simpler gold outline. A `Panel` prop (e.g.
  `variant="primary" | "support"`), not per-call CSS.
- Unify buttons: blue = the one primary action in view, neutral dark =
  secondary, selection per the open question above. Audit the small
  Video / Replay toggles against `.ck-tab`.
- Done when: the ornaments still don't clip (parents of a `Panel` must not
  clip; see app-architecture.md).

## Not doing

- A rounded-card SaaS redesign or heavy gradients.
- Changing the three-column workspace or its resizable layout.
- Shrinking RosterPanel's fixed height (a signed-off layout decision).
