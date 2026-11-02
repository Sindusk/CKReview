# UX review: CKReview

Date: 2026-11-01  
Status: recommendations for discussion; no product changes made.

## Scope and method

Reviewed the first-run/import flow, loaded workspace, pull selection, Add VOD dialog, and Damage findings from a local FFXIV sample report with 73 pulls. Inspected the running app in the in-app browser and cross-checked behavior against the components and `docs/app-architecture.md`. The opening screen was viewed at approximately 1280 × 720; the selected-pull and Damage views were viewed at approximately 860 × 667. These are observations from one report and browser, not a usability study. No VOD was added or synchronized, no replay was fetched, and account, static, WoW, mobile, screen-reader, and full keyboard journeys were not exercised. Do not interpret this report as validation of detection accuracy.

Priority indicates expected user impact and frequency, not implementation effort. Findings identify a proposed direction, not an approved design. Respect existing signed-off choices in `docs/app-architecture.md`, particularly the centered opening, panel hierarchy, 300px FFXIV roster, and no automatic log fetch. For layout decisions, present a real-data mockup to the user before implementing.

## Priorities

| ID | Priority | Opportunity | Evidence |
| --- | --- | --- | --- |
| UX-1 | High | Keep the review usable when the workspace is narrow | Observed: at ~860px the roster and review controls overlap or truncate. |
| UX-2 | High | Explain the different counts for the same pull | Observed: Pull 1 shows 1 major in the list and 2 in Pull Review. |
| UX-3 | High | Make finding and moving between pulls faster | Observed: a 73-pull list exposes only a few rows at once with no jump/filter. |
| UX-4 | High | Make dialogs and core review actions usable by keyboard | Source-supported; requires keyboard and assistive technology verification. |
| UX-5 | Medium | Guide the first VOD alignment and form errors | Observed empty Add submission gives no feedback; sync guidance is source-reviewed. |
| UX-6 | Medium | Preserve readability in Damage at constrained widths | Observed truncated metric and finding labels at ~860px. |
| UX-7 | Medium | Make the next step after import more prominent | Observed all three central/support panels initially ask for a pull. |

## UX-1 — Workspace loses usable space at narrower widths

**Problem.** After selecting a pull at approximately 860 × 667, the three fixed concurrent columns compressed: roster names were ellipsized, its role summary overlapped the heading, and Pull Review's heading and stat labels collided. The review feed had little usable space. A user can drag dividers, but the dividers are invisible until hover, and expanding one area further compresses another. The opening layout at ~1280px was clear; this finding is specifically about the constrained workspace, not an aesthetic objection to the theme.

**Why it matters.** Selecting a pull is the core review task; users need to identify people, read findings, and see playback together. Narrow windows and browser zoom are plausible even on desktop. The page is intentionally viewport-bound and uses internal scrolling (`app/page.tsx:1532`, `:1672`; `components/ui/ResizeHandle.tsx:24`), so ordinary page scrolling does not recover width.

**Direction to discuss.** Define a minimum practical width for each panel and a compact workspace mode when the three cannot fit. For example, keep video/replay and the selected pull's findings visible, with roster and pull list available as clearly labeled switchable drawers or tabs. Retain the existing desktop arrangement and approved roster proportions when space permits. Give resizing a visible affordance and an explicit reset. Avoid simply shrinking text further.

**Acceptance checks.** With real FFXIV and WoW rosters at 1366 × 768 and a narrower supported viewport, plus 200% zoom, headings, selected pull, names, counts, and primary actions remain readable and reachable without overlapping. Users can get to each panel and return without losing selection or playback position. Decide and document the minimum supported viewport; test both games. Preserve the no-page-scroll desktop contract unless the user approves a change.

## UX-2 — Counts look inconsistent across the same pull

**Problem.** In the sample's Pull 1, the pull card displayed **1 major** while Pull Review displayed **2 major**. The list excludes major/minor events after the raid cutoff (`components/PullList.tsx:45`–`:52`); Pull Review includes the full pull (`components/AnalysisPanel.tsx:408`–`:415`). This distinction is meaningful, but neither count's visible label explained it in the observed view. The Review feed also showed events after the cutoff, so a user has to infer why the numbers differ.

**Why it matters.** Seemingly contradictory counts undermine trust precisely when the user is deciding which events deserve review. Users may assume an event was missed or counted twice.

**Direction to discuss.** Keep both scopes if they serve different tasks, but label them in context: e.g. “1 major before wipe cutoff” on the pull summary and “2 major, entire pull” in the detail. Mark post-cutoff entries and expose the cutoff time and reason near the counts, with a short explanation that also works without hover. Consider a compact scope toggle only if it clarifies rather than hides the complete timeline. Do not change detection or counting policy as part of a label fix.

**Acceptance checks.** A pull with events on both sides of a cutoff explains both totals and identifies which events are excluded. A pull with no cutoff and a manually called wipe have clear, accurate states. Verify the explanation against the actual counting logic, including multiple raid events, and ensure it remains legible in the compact layout.

## UX-3 — Long pull lists are difficult to navigate deliberately

**Problem.** The 73-pull sample showed roughly five cards in the available list area. Every card repeated the encounter name, which was truncated at the observed widths; reaching a specific late pull required scrolling a long internal list. There was no visible pull-number jump, search, or filter in `components/PullList.tsx:29`–`:115`. The selected-pull detail title names the encounter but does not prominently repeat the pull number, so context depends on finding the selected card again.

**Why it matters.** Raid leads often revisit a particular pull or compare adjacent attempts. Repeated scrolling and context switching slow that loop and make it easy to review the wrong attempt.

**Direction to discuss.** Add a compact jump-to-pull control and previous/next actions near the selected pull's identity. Show the pull number in the detail header. Consider filters for encounter and outcome when a report has multiple encounters; preserve chronological ordering by default and indicate when a filter hides pulls. Reduce repetitive encounter text only where the group context remains unambiguous. Test with multi-boss reports before settling on grouping.

**Acceptance checks.** From any scroll position, a reviewer can reach a known pull number and step to adjacent pulls, with the active pull clearly identified in both list and detail. Selection, filters, and playback stay coherent; no navigation causes an implicit log fetch. Check first/last pull and mixed-encounter numbering.

## UX-4 — Keyboard and dialog flow needs a shared accessibility pass

**Problem.** The shared dialog renders `role="dialog"` and `aria-modal` but its implementation does not provide an accessible title association, initial-focus management, a focus trap, Escape handling, or focus restoration (`components/ui/Dialog.tsx:125`–`:156`). In the observed Add VOD dialog, focus remained on the underlying Add VOD button when the dialog opened. Finding cards seek via a clickable container (`components/AnalysisPanel.tsx:169`–`:178`) without a keyboard handler in that component. Workspace resize handles are pointer-only (`components/ui/ResizeHandle.tsx:24`–`:44`). These are source-supported concerns; a full keyboard/screen-reader audit was not performed.

**Why it matters.** A keyboard or assistive-technology user may lose their place behind a modal or be unable to seek to a finding or resize the workspace. This also affects efficient desktop review without a mouse.

**Direction to discuss.** Give the shared dialog a programmatic name, move focus into it on open, contain focus while open, restore focus to the opener, and support Escape where dismissal is safe. Preserve unsaved form data safeguards and handle nested dialogs deliberately. Make seekable findings native buttons or equivalent keyboard-operable controls with an explicit action name; offer a keyboard-accessible resizing/reset alternative. Audit other custom interactive cards rather than assuming the shared dialog solves the whole journey.

**Acceptance checks.** Using only Tab, Shift+Tab, Enter, Space and Escape, open and close each representative dialog, reach its fields and actions without focusing the background, and return to the invoking control. Seek to a finding and change panel sizing without a mouse. Verify dialog names and state using a screen reader, including nested confirmation dialogs and a form with unsaved input.

## UX-5 — VOD setup needs clearer feedback and continuity

**Problem.** Clicking Add in an empty Add VOD form left the dialog unchanged, with no visible explanation. The handler silently returns for a missing perspective, URL, or file (`components/AddVodDialog.tsx:30`–`:38`). The subsequent sync control asks the reviewer to select a pull, seek to its start and sync (`app/page.tsx:1892`–`:1942`), but this later step was not exercised with a real VOD in this review.

**Why it matters.** Adding and aligning a VOD bridges logs to the central review activity. Silent validation can look like a broken button, and the multiple prerequisites make it easy to stop after adding a video without understanding why seeking by event is not yet aligned.

**Direction to discuss.** On submission, identify missing fields inline and focus the first invalid field; validate an unsupported URL with a specific correction. After a successful add, show a concise contextual sequence: select a pull, find its start in the video, then sync. Make the active pull and video time visible alongside the action, confirm successful sync, and explain re-sync only when relevant. Retain the existing coverage-gap guidance and avoid extra mandatory steps for experienced users.

**Acceptance checks.** Empty, partially completed, malformed URL, and local-file cases produce actionable feedback without losing entered values. With a real VOD, a first-time reviewer can add, select, align, seek to an event, and understand confirmation and recovery from an incorrect alignment. Check YouTube, Twitch, and local files separately; no uploads or external fetches should be implied by the local-file choice.

## UX-6 — Damage analysis compresses the information it asks users to interpret

**Problem.** At ~860px, Damage's fixed 340px player column left the detail column narrow; metric labels appeared as “GCD up…”, “Own da…”, and “Buffs gi…”, and Biggest Wins descriptions were clipped. The view uses two independently scrolling columns and a five-column metric grid (`components/DamageDialog.tsx:292`, `:316`, `:672`–`:685`). The detailed tooltips provide useful explanations, but the visible labels do not provide enough context at that width.

**Why it matters.** Estimated loss and damage attribution require careful interpretation. Truncated labels and hover-dependent explanations make comparison harder and can encourage misreading the numbers.

**Direction to discuss.** At constrained widths, allow metrics and win cards to wrap or stack, and give the detail column the space it needs. Consider a compact player picker or switchable player/detail panes. Keep units, scope, and uncertainty visible with each value. This should follow the same breakpoint decision as UX-1, not introduce a separate unrelated navigation model.

**Acceptance checks.** At supported widths and zoom, each metric's full label, value, and relevant unit or scope can be read without hovering; full finding descriptions remain accessible. Selecting another player and changing pulls preserve a clear context. Check a player with many findings and an all-pulls aggregate.

## UX-7 — The post-import next action competes with empty panels

**Problem.** On import, no pull is selected. Roster, Replay, and Pull Review each display a separate empty state instructing the reviewer to select a pull, while the actual list is at the far right. The directions are consistent and the selected-pull design preserves a large replay area, but there is no single prominent next action or selected pull identity until a card is chosen.

**Why it matters.** The import-to-first-insight transition is the first experience of the workspace. Three repeated empty messages consume attention while the small pull list carries the action.

**Direction to discuss.** Make the pull list's next action explicit immediately after import, for example by emphasizing “Choose a pull to start” in its header and visually relating it to the empty workspace. Evaluate whether selecting a sensible first or most recent pull would help, but do not silently fetch replay data or assume one default works for live sessions and long reports. This is a design decision, not a recommendation to auto-select without testing.

**Acceptance checks.** A new reviewer can identify and select a pull without coaching; the transition preserves the current empty-state design language and does not fetch positions automatically. Test a report with many pulls, one pull, and no eligible pulls.

## Suggested review and implementation sequence

1. Agree on supported desktop widths and a real-data mockup for UX-1/UX-6; those choices affect where other controls can fit.
2. Address UX-2's scope language independently of detection, then prototype UX-3 navigation using a long and a mixed-boss report.
3. Make UX-4 a shared interaction pass, testing representative dialogs and event seeking; coordinate with any new compact workspace.
4. Validate UX-5 with an actual VOD and UX-7 with a first-time reviewer before committing to a guided flow or default selection.

For each accepted item, the implementing agent should recheck current code and user-approved design decisions, implement only the agreed scope, and verify the stated acceptance checks. The observed narrower view is evidence of a real layout issue but does not establish a particular breakpoint; measure before choosing one. Further visual review at 1920 × 1080 and 1366 × 768, real VOD syncing, WoW, statics, and assistive technology remain outstanding.
