// src/ai-racer/track-editor/SnapSystem.ts
//
// Track construction pipeline:
//   raw stroke
//     -> simplify-js (RDP) to remove pointer jitter
//     -> closed centripetal Catmull-Rom spline (smooth, seam-free)
//     -> arc-length resample (uniform spacing)            = centerLine
//     -> Clipper offset by +/- halfWidth (etClosedLine)   = boundary contours
//
// Clipper resolves self-intersections by construction, so tight corners are
// rounded rather than tangled and figure-8 crossings union cleanly.
import ClipperLib from 'clipper-lib';
import simplify from 'simplify-js';
import type { Point, Track } from '../core/types';
import { GAME_CONSTANTS } from '../core/types';

export interface BuildTrackResult {
  ok: boolean;
  reason?: string;
  track?: Track;
}

// Clipper works in integers; scale floats up before offsetting and back after.
const CLIPPER_SCALE = 100;

// Tuning
const SIMPLIFY_TOLERANCE = 2.5; // px; smaller = follows the stroke more closely
const SAMPLES_PER_SEGMENT = 16; // spline samples per drawn segment before resampling
const CENTERLINE_SPACING = 8; // px between final centerline points

/**
 * Build a complete Track from a raw freehand stroke. Returns ok:false with a
 * reason when the geometry can't make a drivable loop.
 */
export function buildTrack(rawPoints: Point[], width: number): BuildTrackResult {
  if (rawPoints.length < 4) {
    return { ok: false, reason: 'Draw a longer loop.' };
  }

  // 1. Decimate the noisy pointer stream. simplify-js also drops duplicates.
  let pts = simplify(rawPoints, SIMPLIFY_TOLERANCE, true);

  // Drop a duplicated closing point so the periodic spline doesn't see a zero-length segment.
  if (pts.length > 1 && distance(pts[0], pts[pts.length - 1]) < CENTERLINE_SPACING) {
    pts = pts.slice(0, -1);
  }

  if (pts.length < 3) {
    return { ok: false, reason: 'Draw a longer loop with a clearer shape.' };
  }

  // 2. Smooth into a closed spline, then 3. resample to uniform spacing.
  const splined = catmullRomClosed(pts, SAMPLES_PER_SEGMENT);
  const closedForResample = [...splined, splined[0]];
  let centerLine = resamplePath(closedForResample, CENTERLINE_SPACING);
  // resample re-adds a point near the start; drop it so the loop has no duplicate.
  if (centerLine.length > 2 && distance(centerLine[0], centerLine[centerLine.length - 1]) < CENTERLINE_SPACING) {
    centerLine = centerLine.slice(0, -1);
  }

  if (centerLine.length < 8) {
    return { ok: false, reason: 'Track is too short.' };
  }

  // 4. Offset the closed centerline into boundary contours.
  const boundaries = offsetClosedPath(centerLine, width / 2);
  if (boundaries.length === 0) {
    return { ok: false, reason: 'Could not build track boundaries. Try redrawing.' };
  }

  // A drivable loop needs an interior hole; if the road is wider than the loop,
  // the centre fills solid and there's nowhere to drive.
  const { outer, holes } = classifyContours(boundaries);
  if (holes.length === 0) {
    return { ok: false, reason: 'Track is too wide for this loop — narrow the width or draw a bigger loop.' };
  }

  // 5. Start/finish line: perpendicular at centerLine[0], facing along the tangent.
  const c0 = centerLine[0];
  const c1 = centerLine[1 % centerLine.length];
  const tangent = normalize({ x: c1.x - c0.x, y: c1.y - c0.y });
  const perp = { x: -tangent.y, y: tangent.x };
  const halfWidth = width / 2;
  const startLine = {
    start: { x: c0.x + perp.x * halfWidth, y: c0.y + perp.y * halfWidth },
    end: { x: c0.x - perp.x * halfWidth, y: c0.y - perp.y * halfWidth },
    angle: Math.atan2(tangent.y, tangent.x),
  };

  const checkpoints = generateCheckpoints(centerLine, GAME_CONSTANTS.CHECKPOINT_SPACING);
  const totalLength = calculatePathLength(centerLine);

  return {
    ok: true,
    track: {
      centerLine,
      // Kept for the start-line / simple-loop consumers; full set lives in `boundaries`.
      leftBoundary: outer,
      rightBoundary: holes[0],
      boundaries,
      width,
      startLine,
      checkpoints,
      totalLength,
      isClosed: true,
    },
  };
}

/**
 * Split offset contours into the outer edge (largest by area) and interior holes.
 */
export function classifyContours(contours: Point[][]): { outer: Point[]; holes: Point[][] } {
  let outerIdx = 0;
  let maxArea = -Infinity;
  for (let i = 0; i < contours.length; i++) {
    const area = Math.abs(signedArea(contours[i]));
    if (area > maxArea) {
      maxArea = area;
      outerIdx = i;
    }
  }
  return {
    outer: contours[outerIdx],
    holes: contours.filter((_, i) => i !== outerIdx),
  };
}

/**
 * Offset a closed centerline by +/- delta into clean boundary contours using Clipper.
 */
function offsetClosedPath(path: Point[], delta: number): Point[][] {
  const co = new ClipperLib.ClipperOffset(2, 0.25 * CLIPPER_SCALE);
  const scaled = path.map(p => ({
    X: Math.round(p.x * CLIPPER_SCALE),
    Y: Math.round(p.y * CLIPPER_SCALE),
  }));
  co.AddPath(scaled, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedLine);

  const solution: { X: number; Y: number }[][] = [];
  co.Execute(solution, delta * CLIPPER_SCALE);

  return solution.map(contour =>
    contour.map(pt => ({ x: pt.X / CLIPPER_SCALE, y: pt.Y / CLIPPER_SCALE }))
  );
}

/**
 * Sample a closed centripetal Catmull-Rom spline through the given points.
 * Interpolates the points (track stays where it was drawn) and is seam-free
 * because it wraps periodically.
 */
export function catmullRomClosed(pts: Point[], samplesPerSegment: number, alpha = 0.5): Point[] {
  const n = pts.length;
  if (n < 3) return [...pts];

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const t0 = 0;
    const t1 = t0 + Math.pow(distance(p0, p1), alpha);
    const t2 = t1 + Math.pow(distance(p1, p2), alpha);
    const t3 = t2 + Math.pow(distance(p2, p3), alpha);

    // Degenerate knot spacing (coincident points) — just emit the vertex.
    if (t1 === t0 || t2 === t1 || t3 === t2) {
      out.push({ x: p1.x, y: p1.y });
      continue;
    }

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = t1 + ((t2 - t1) * s) / samplesPerSegment;
      out.push(interpolateCatmullRom(p0, p1, p2, p3, t0, t1, t2, t3, t));
    }
  }
  return out;
}

// Barry-Goldman pyramidal evaluation of a Catmull-Rom segment between p1 and p2.
function interpolateCatmullRom(
  p0: Point, p1: Point, p2: Point, p3: Point,
  t0: number, t1: number, t2: number, t3: number,
  t: number
): Point {
  const a1 = lerpPoint(p0, p1, (t - t0) / (t1 - t0));
  const a2 = lerpPoint(p1, p2, (t - t1) / (t2 - t1));
  const a3 = lerpPoint(p2, p3, (t - t2) / (t3 - t2));
  const b1 = lerpPoint(a1, a2, (t - t0) / (t2 - t0));
  const b2 = lerpPoint(a2, a3, (t - t1) / (t3 - t1));
  return lerpPoint(b1, b2, (t - t1) / (t2 - t1));
}

/**
 * Resample a path to evenly spaced points.
 */
export function resamplePath(points: Point[], spacing = 10): Point[] {
  if (points.length < 2) return points;

  const resampled: Point[] = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const segmentLength = distance(p0, p1);

    if (segmentLength === 0) continue;

    accumulated += segmentLength;

    while (accumulated >= spacing) {
      const overshoot = accumulated - spacing;
      const t = 1 - overshoot / segmentLength;
      resampled.push({ x: lerp(p0.x, p1.x, t), y: lerp(p0.y, p1.y, t) });
      accumulated -= spacing;
    }
  }

  if (distance(resampled[resampled.length - 1], points[points.length - 1]) > spacing / 2) {
    resampled.push(points[points.length - 1]);
  }

  return resampled;
}

/**
 * Generate evenly spaced checkpoints along the path.
 */
function generateCheckpoints(path: Point[], spacing: number): Point[] {
  const checkpoints: Point[] = [];
  let accumulated = 0;

  for (let i = 1; i < path.length; i++) {
    const dist = distance(path[i - 1], path[i]);
    accumulated += dist;

    while (accumulated >= spacing) {
      const overshoot = accumulated - spacing;
      const t = 1 - overshoot / dist;
      checkpoints.push({ x: lerp(path[i - 1].x, path[i].x, t), y: lerp(path[i - 1].y, path[i].y, t) });
      accumulated -= spacing;
    }
  }

  return checkpoints;
}

function calculatePathLength(path: Point[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += distance(path[i - 1], path[i]);
  }
  return length;
}

// ============================================================================
// Utility functions
// ============================================================================

function signedArea(path: Point[]): number {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize(v: Point): Point {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len === 0) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
