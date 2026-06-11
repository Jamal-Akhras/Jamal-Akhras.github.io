// src/ai-racer/core/TrackCollision.ts
// Static wall geometry for sensor raycasting. Boundary contours are flattened to
// line segments once and bucketed into a uniform grid, so a ray only tests the
// few segments in the cells it crosses instead of every wall in the track.
import type { Point } from './types';

const CELL_SIZE = 50; // px

export class TrackCollision {
  private segments: Float32Array; // [x1, y1, x2, y2] per segment
  private count: number;
  private grid = new Map<number, number[]>();

  constructor(boundaries: Point[][]) {
    const segs: number[] = [];
    for (const contour of boundaries) {
      for (let i = 0; i < contour.length; i++) {
        const a = contour[i];
        const b = contour[(i + 1) % contour.length]; // contours are closed loops
        segs.push(a.x, a.y, b.x, b.y);
      }
    }
    this.segments = new Float32Array(segs);
    this.count = this.segments.length / 4;

    for (let s = 0; s < this.count; s++) {
      const x1 = this.segments[s * 4];
      const y1 = this.segments[s * 4 + 1];
      const x2 = this.segments[s * 4 + 2];
      const y2 = this.segments[s * 4 + 3];
      const minCx = Math.floor(Math.min(x1, x2) / CELL_SIZE);
      const maxCx = Math.floor(Math.max(x1, x2) / CELL_SIZE);
      const minCy = Math.floor(Math.min(y1, y2) / CELL_SIZE);
      const maxCy = Math.floor(Math.max(y1, y2) / CELL_SIZE);
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const key = this.cellKey(cx, cy);
          let bucket = this.grid.get(key);
          if (!bucket) {
            bucket = [];
            this.grid.set(key, bucket);
          }
          bucket.push(s);
        }
      }
    }
  }

  /**
   * Cast a ray from (ox, oy) along the unit vector (dx, dy) up to maxDist.
   * Returns the distance to the nearest wall hit, or maxDist if none.
   */
  raycast(ox: number, oy: number, dx: number, dy: number, maxDist: number): number {
    const ex = ox + dx * maxDist;
    const ey = oy + dy * maxDist;
    const minCx = Math.floor(Math.min(ox, ex) / CELL_SIZE);
    const maxCx = Math.floor(Math.max(ox, ex) / CELL_SIZE);
    const minCy = Math.floor(Math.min(oy, ey) / CELL_SIZE);
    const maxCy = Math.floor(Math.max(oy, ey) / CELL_SIZE);

    const seg = this.segments;
    let best = maxDist;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.grid.get(this.cellKey(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const s = bucket[i];
          const t = raySegment(ox, oy, dx, dy, best, seg[s * 4], seg[s * 4 + 1], seg[s * 4 + 2], seg[s * 4 + 3]);
          if (t < best) best = t;
        }
      }
    }
    return best;
  }

  /**
   * Is the point on the road surface? Even-odd point-in-polygon over all boundary
   * contours: a point inside the outer edge but outside any infield hole counts as
   * "inside" (odd crossings), which is exactly the drivable ring.
   */
  isOnTrack(x: number, y: number): boolean {
    const seg = this.segments;
    let inside = false;
    for (let s = 0; s < this.count; s++) {
      const ay = seg[s * 4 + 1];
      const by = seg[s * 4 + 3];
      if (ay > y !== by > y) {
        const ax = seg[s * 4];
        const bx = seg[s * 4 + 2];
        const ix = ax + ((y - ay) / (by - ay)) * (bx - ax);
        if (x < ix) inside = !inside;
      }
    }
    return inside;
  }

  private cellKey(cx: number, cy: number): number {
    // Pack signed cell coords into one number (track stays well within +/-2048 cells).
    return (cx + 2048) * 4096 + (cy + 2048);
  }
}

/**
 * Ray (O + t*D, t in [0, maxT], D unit) vs segment (A->B). Returns t at the hit,
 * or Infinity if no hit within range.
 */
function raySegment(
  ox: number, oy: number, dx: number, dy: number, maxT: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const ex = bx - ax;
  const ey = by - ay;
  const det = ex * dy - dx * ey;
  if (Math.abs(det) < 1e-9) return Infinity; // parallel

  const diffx = ax - ox;
  const diffy = ay - oy;
  const t = (-diffx * ey + ex * diffy) / det; // distance along the ray
  const u = (dx * diffy - dy * diffx) / det; // position along the segment
  if (t >= 0 && t <= maxT && u >= 0 && u <= 1) return t;
  return Infinity;
}
