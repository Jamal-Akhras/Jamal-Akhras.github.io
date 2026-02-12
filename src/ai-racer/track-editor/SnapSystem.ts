// src/ai-racer/track-editor/SnapSystem.ts
import type { Point, Track } from '../core/types';
import { GAME_CONSTANTS } from '../core/types';

/**
 * Smooth a path using Chaikin's corner cutting algorithm
 */
export function smoothPath(points: Point[], iterations: number = GAME_CONSTANTS.PATH_SMOOTHING_ITERATIONS): Point[] {
  if (points.length < 3) return points;

  let smoothed = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const newSmoothed: Point[] = [smoothed[0]];

    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[i + 1];

      // Create two new points at 25% and 75% along the segment
      newSmoothed.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      newSmoothed.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }

    newSmoothed.push(smoothed[smoothed.length - 1]);
    smoothed = newSmoothed;
  }

  return smoothed;
}

/**
 * Resample path to have evenly spaced points
 */
export function resamplePath(points: Point[], spacing: number = 10): Point[] {
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

      resampled.push({
        x: lerp(p0.x, p1.x, t),
        y: lerp(p0.y, p1.y, t),
      });

      accumulated -= spacing;
    }
  }

  // Ensure last point is included
  if (distance(resampled[resampled.length - 1], points[points.length - 1]) > spacing / 2) {
    resampled.push(points[points.length - 1]);
  }

  return resampled;
}

/**
 * Generate track boundaries from center line
 */
export function generateTrackBoundaries(centerLine: Point[], width: number): Track {
  // Smooth and resample the path
  const smoothed = smoothPath(centerLine, GAME_CONSTANTS.PATH_SMOOTHING_ITERATIONS);
  const resampled = resamplePath(smoothed, 10);

  // Ensure the path is closed
  if (distance(resampled[0], resampled[resampled.length - 1]) > 5) {
    resampled.push(resampled[0]);
  }

  const leftBoundary: Point[] = [];
  const rightBoundary: Point[] = [];
  const halfWidth = width / 2;

  for (let i = 0; i < resampled.length; i++) {
    const curr = resampled[i];
    const prev = resampled[(i - 1 + resampled.length) % resampled.length];
    const next = resampled[(i + 1) % resampled.length];

    // Calculate tangent direction (average of incoming and outgoing)
    const inDir = normalize({ x: curr.x - prev.x, y: curr.y - prev.y });
    const outDir = normalize({ x: next.x - curr.x, y: next.y - curr.y });
    const tangent = normalize({ x: inDir.x + outDir.x, y: inDir.y + outDir.y });

    // Calculate perpendicular (90 degrees to the left)
    const perpendicular = { x: -tangent.y, y: tangent.x };

    leftBoundary.push({
      x: curr.x + perpendicular.x * halfWidth,
      y: curr.y + perpendicular.y * halfWidth,
    });

    rightBoundary.push({
      x: curr.x - perpendicular.x * halfWidth,
      y: curr.y - perpendicular.y * halfWidth,
    });
  }

  // Generate start line
  const startPoint = resampled[0];
  const startNext = resampled[1];
  const startAngle = Math.atan2(startNext.y - startPoint.y, startNext.x - startPoint.x);

  // Generate checkpoints
  const checkpoints = generateCheckpoints(resampled, GAME_CONSTANTS.CHECKPOINT_SPACING);

  // Calculate total track length
  const totalLength = calculatePathLength(resampled);

  return {
    centerLine: resampled,
    leftBoundary,
    rightBoundary,
    width,
    startLine: {
      start: leftBoundary[0],
      end: rightBoundary[0],
      angle: startAngle,
    },
    checkpoints,
    totalLength,
    isClosed: true,
  };
}

/**
 * Generate evenly spaced checkpoints along the path
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

      checkpoints.push({
        x: lerp(path[i - 1].x, path[i].x, t),
        y: lerp(path[i - 1].y, path[i].y, t),
      });

      accumulated -= spacing;
    }
  }

  return checkpoints;
}

/**
 * Calculate total path length
 */
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

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalize(v: Point): Point {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len === 0) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
