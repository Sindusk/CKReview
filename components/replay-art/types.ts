// components/replay-art/types.ts
//
// What a fight's art file (components/replay-art/<fight>.tsx) can give the
// replay panel, all drawn inside ReplayPanel's SVG (it may use the panel's
// #replay-glow filter) and animated from the replay clock `t`, so
// scrubbing and pausing hold the frame:
//
//   effects  art for its CasterEffect kinds (lib/replay/fight-spec.ts)
//   colors   fill / flash / rim / glow for new AoE styles drawn the
//            standard way
//   shapes   art that replaces the standard drawing for an AoE style
//   tethers  art for a tether element other than fire and lightning
//
// Kinds, styles and elements are global names: start new ones with the
// fight's key ("top-..."). Coordinates are SVG units; `scale` converts
// centi-yalms (centi-yards for WoW) to them.

import type { ComponentType } from "react";
import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect } from "@/lib/replay/fight-spec";
import type { ReplayActor } from "@/lib/replay/ffxiv-replay";

export type AoeColors = { fill: string; flash: string; rim: string; glow: string };

/** `x, y`: where the effect is now (its actor while tracked, else its spot); `cx, cy`: the arena centre. */
export type EffectArtProps = { e: CasterEffect; x: number; y: number; t: number; scale: number; cx: number; cy: number; actor?: ReplayActor };

/** `x, y` origin and `r` range in SVG units; `marked`: a line stack's marked player or group. */
export type ShapeArtProps = {
  s: AoeShape; x: number; y: number; r: number; scale: number; t: number;
  opacity: number; resolving: boolean; uid: string; marked?: { x: number; y: number };
};

export type TetherArtProps = { x1: number; y1: number; x2: number; y2: number; t: number };

export type FightArt = {
  effects?: Record<string, ComponentType<EffectArtProps>>;
  colors?:  Record<string, AoeColors>;
  shapes?:  Record<string, ComponentType<ShapeArtProps>>;
  tethers?: Record<string, ComponentType<TetherArtProps>>;
};

export const BOSS_ICON = 46;   // SVG units: the boss icon ReplayPanel draws
