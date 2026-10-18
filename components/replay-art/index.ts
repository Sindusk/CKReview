// components/replay-art/index.ts
//
// Every fight's replay art (types.ts), merged for the panel. Each fight
// with a replay spec (lib/replay/fights.ts) is registered here already,
// so filling one in never touches this file.

import type { AoeColors, EffectArtProps, FightArt, ShapeArtProps, TetherArtProps } from "./types";
import type { ComponentType } from "react";
import { FRU_ART } from "./fru";
import { DANCING_MAD_ART } from "./dancingmad";
import { TOP_ART } from "./top";
import { TEA_ART } from "./tea";
import { VA_ART } from "./va";

export const FIGHT_ART: FightArt[] = [FRU_ART, DANCING_MAD_ART, TOP_ART, TEA_ART, VA_ART];

const merge = <T,>(pick: (a: FightArt) => Record<string, T> | undefined): Record<string, T> =>
  Object.assign({}, ...FIGHT_ART.map((a) => pick(a) ?? {}));

export const EFFECT_ART: Record<string, ComponentType<EffectArtProps>> = merge((a) => a.effects);
export const SHAPE_ART: Record<string, ComponentType<ShapeArtProps>> = merge((a) => a.shapes);
export const TETHER_ART: Record<string, ComponentType<TetherArtProps>> = merge((a) => a.tethers);
export const EXTRA_COLORS: Record<string, AoeColors> = merge((a) => a.colors);
