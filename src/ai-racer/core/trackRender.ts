// src/ai-racer/core/trackRender.ts
// Shared, "pretty" track rendering used by both the editor and the game so they
// look identical: mowed grass, asphalt road, red/white kerbs, a dashed centre
// line, and a checkered start/finish band.
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Point, Track } from './types';
import { GAME_CONSTANTS } from './types';

const GRASS_BASE = GAME_CONSTANTS.TRACK_GRASS_COLOR; // 0x4a7c23
const GRASS_STRIPE = 0x53892a; // slightly lighter "mowed" band
const ROAD_COLOR = 0x3a3d42; // asphalt
const KERB_RED = 0xd11a1a;
const KERB_WHITE = 0xf2f2f2;

/** Mowed-lawn background: alternating horizontal green bands. */
export function drawGrass(g: PixiGraphics, width: number, height: number): void {
  g.rect(0, 0, width, height).fill(GRASS_BASE);
  const STRIPE = 46;
  for (let y = 0; y < height; y += STRIPE * 2) {
    g.rect(0, y, width, STRIPE).fill(GRASS_STRIPE);
  }
}

/** Road surface + kerbs + centre line + start/finish line. */
export function drawTrackSurface(g: PixiGraphics, track: Track): void {
  // Asphalt: a thick round stroke of the centre line. This exactly matches the
  // Clipper round-offset boundaries while leaving grass in the infield and outside.
  if (track.centerLine.length > 1) {
    const loop = [...track.centerLine, track.centerLine[0]];
    g.poly(loop.flatMap(p => [p.x, p.y]), false).stroke({
      width: track.width,
      color: ROAD_COLOR,
      cap: 'round',
      join: 'round',
    });
  }

  drawKerbs(g, track.boundaries);
  drawDashedCenterLine(g, track.centerLine);
  drawStartLine(g, track.startLine);
}

/** Alternating red/white kerb striping along every boundary contour. */
function drawKerbs(g: PixiGraphics, contours: Point[][]): void {
  const PERIOD = 16; // px per colour band
  for (const contour of contours) {
    if (contour.length < 2) continue;
    let acc = 0;
    for (let i = 0; i < contour.length; i++) {
      const p1 = contour[i];
      const p2 = contour[(i + 1) % contour.length];
      const color = Math.floor(acc / PERIOD) % 2 === 0 ? KERB_RED : KERB_WHITE;
      g.poly([p1.x, p1.y, p2.x, p2.y], false).stroke({ width: 5, color, cap: 'butt' });
      acc += dist(p1, p2);
    }
  }
}

/** Dashed white centre line. */
function drawDashedCenterLine(g: PixiGraphics, line: Point[]): void {
  if (line.length < 2) return;
  const pts = [...line, line[0]];
  const DASH = 14;
  const GAP = 12;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (acc % (DASH + GAP) < DASH) {
      g.poly([p1.x, p1.y, p2.x, p2.y], false).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    }
    acc += dist(p1, p2);
  }
}

/** Checkered start/finish band straddling the start line. */
function drawStartLine(g: PixiGraphics, sl: Track['startLine']): void {
  const { start, end } = sl;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;

  const ux = dx / len; // along the line
  const uy = dy / len;
  const px = -uy; // perpendicular (along the track direction)
  const py = ux;

  const SQ = 6;
  const cols = Math.floor(len / SQ);
  const rows = 2;
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows; r++) {
      const black = (i + r) % 2 === 0;
      // bottom-left corner of this square, band centred on the line
      const off = (r - 1) * SQ; // rows=2 -> [-SQ, 0], band spans [-SQ, +SQ]
      const cxp = start.x + ux * i * SQ + px * off;
      const cyp = start.y + uy * i * SQ + py * off;
      const quad = [
        cxp, cyp,
        cxp + ux * SQ, cyp + uy * SQ,
        cxp + ux * SQ + px * SQ, cyp + uy * SQ + py * SQ,
        cxp + px * SQ, cyp + py * SQ,
      ];
      g.poly(quad, true).fill(black ? 0x111111 : 0xffffff);
    }
  }
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}
