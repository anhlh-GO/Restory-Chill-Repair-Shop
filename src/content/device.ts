// Device model shared by every gadget: parts with a home position, a side, a
// draw order, and the parts that must come off before them ("Screws first").

import type { C } from '../core/draw';
import { screwHead, ellPath } from '../core/draw';
import type { Txt } from '../core/i18n';

export type Side = 'F' | 'B' | 'A';

export interface DrawState {
  /** Which face of the DEVICE the camera looks at (only matters for side 'A' parts). */
  view: 'F' | 'B';
  inDevice: boolean;
  time: number;
  broken: boolean;
  /** 0..1 — the device is switched on (done celebration). */
  power: number;
}

export interface PartDef {
  id: string;
  name: Txt;
  kind?: 'screw' | 'part';
  side: Side;
  z: number;
  /** Home offset from the device centre, device units. */
  x: number;
  y: number;
  /** Footprint for tray fitting. */
  w: number;
  h: number;
  /** Local outline centred on (0,0): hit test, dirt clip, ghost. */
  shape: Path2D;
  needs?: string[];
  draw(c: C, s: DrawState): void;
  /** Little glyph for the checklist. */
  icon?: string;
  /** Cleaning tool when this part is dirty. */
  tool?: 'brush' | 'sponge';

  // ---- 3D ----
  /** Thickness in device units (default by role). */
  thick?: number;
  /** Height it sits at inside the device (default: stacked on what is under it). */
  elev?: number;
  /** For base shells: how deep the inside is (inner parts sit that much lower). The body becomes a hollow tub. */
  cavity?: number;
  /** Radius of the rounded top edges. Up to half the part's width: a half tube / dome. */
  round?: number;
  /** Rim width of a hollow base shell (default 8). */
  wall?: number;
  /** Raised details modelled on top of the face (buttons, keys…). */
  bumps?: Bump[];
  /** Side colour of the extruded body (default: the face's main colour, darker). */
  body?: string;
  /** Surface feel. */
  mat?: 'plastic' | 'metal' | 'rubber' | 'glass' | 'pcb';
}

export interface Bump {
  kind: 'cyl' | 'box' | 'cross';
  x: number;
  y: number;
  w: number;
  h?: number;
  height: number;
  color: string;
  /** Only on this face of a two-faced part. */
  view?: 'F' | 'B';
  metal?: boolean;
}

export interface DeviceDef {
  id: string;
  name: Txt;
  w: number;
  h: number;
  hasBack: boolean;
  parts: PartDef[];
  /** Overlay drawn on the assembled device when it powers on. */
  working(c: C, t: number, k: number): void;
  /** Extra particles while working (device-space positions to emit from). */
  workFx?: { kind: 'steam' | 'note' | 'spark' | 'flash'; x: number; y: number; color: string; dir: number };
}

export const SCREW_R = 7;

export function screw(id: string, x: number, y: number, side: Side, z = 9, needs?: string[]): PartDef {
  const shape = ellPath(0, 0, SCREW_R + 3, SCREW_R + 3);
  return {
    id, kind: 'screw', side, z, x, y, w: 16, h: 16, shape, needs, thick: 3, mat: 'metal',
    name: { en: 'Screw', vi: 'Con vít' },
    icon: '⚙',
    draw(c) { screwHead(c, 0, 0, SCREW_R, 0.6); },
  };
}
