// src/ai-racer/track-editor/TrackEditor.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import { Application, Graphics as PixiGraphics } from 'pixi.js';
import { useDrag } from '@use-gesture/react';
import type { Point, Track } from '../core/types';
import { GAME_CONSTANTS } from '../core/types';
import { buildTrack } from './SnapSystem';
import { drawGrass, drawTrackSurface } from '../core/trackRender';

interface TrackEditorProps {
  width: number;
  height: number;
  onTrackComplete: (track: Track) => void;
}

const MIN_POINT_SPACING = 4; // px between captured stroke points

export default function TrackEditor({ width, height, onTrackComplete }: TrackEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<PixiGraphics | null>(null);

  // In-progress stroke lives in a ref so capturing points doesn't re-render.
  const pointsRef = useRef<Point[]>([]);
  const snapRef = useRef<Point | null>(null);
  const drawRef = useRef<() => void>(() => {});

  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [trackWidth, setTrackWidth] = useState<number>(GAME_CONSTANTS.TRACK_WIDTH_DEFAULT);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Pixi.js application.
  // Init is deferred one frame so React StrictMode's mount->unmount->remount
  // collapses to a single real init — a canvas has only one WebGL context, and
  // two concurrent Application.init() calls on it corrupt the shared context.
  useEffect(() => {
    let disposed = false;
    let app: Application | null = null;

    const id = requestAnimationFrame(async () => {
      if (disposed || !canvasRef.current) return;
      const a = new Application();
      try {
        await a.init({
          canvas: canvasRef.current,
          width,
          height,
          backgroundColor: GAME_CONSTANTS.TRACK_GRASS_COLOR,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
      } catch {
        a.destroy();
        return;
      }
      if (disposed) {
        a.destroy();
        return;
      }

      const graphics = new PixiGraphics();
      a.stage.addChild(graphics);

      app = a;
      appRef.current = a;
      graphicsRef.current = graphics;
      drawRef.current();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(id);
      if (app) {
        // destroy() (not destroy(true)) so the React-owned canvas element survives
        try {
          app.destroy();
        } catch {
          // Ignore cleanup errors
        }
        app = null;
        appRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, [width, height]);

  // Draw function — reads the stroke ref and committed track state.
  const draw = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    g.clear();
    drawGrass(g, width, height);

    if (track) {
      drawTrackSurface(g, track);
      return;
    }

    // In-progress stroke preview
    const points = pointsRef.current;
    if (points.length > 1) {
      const path = points.flatMap(p => [p.x, p.y]);
      g.poly(path, false).stroke({ width: trackWidth, color: GAME_CONSTANTS.TRACK_ROAD_COLOR, alpha: 0.5, cap: 'round', join: 'round' });
      g.poly(path, false).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
    }

    if (points.length > 0) {
      g.circle(points[0].x, points[0].y, 10).fill(0x00ff00);
      g.circle(points[0].x, points[0].y, 5).fill(0xffffff);
    }

    if (snapRef.current) {
      g.circle(snapRef.current.x, snapRef.current.y, GAME_CONSTANTS.SNAP_DISTANCE).stroke({ width: 3, color: 0x00ff00 });
    }
  }, [track, trackWidth, width, height]);

  // Keep an imperative handle so the drag handler can redraw without re-rendering.
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Map display coordinates back to canvas space (handles CSS scaling, e.g. fullscreen).
    const scaleX = rect.width ? width / rect.width : 1;
    const scaleY = rect.height ? height / rect.height : 1;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, [width, height]);

  const isNearStart = useCallback((point: Point): boolean => {
    const pts = pointsRef.current;
    if (pts.length < GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE) return false;
    return distance(point, pts[0]) < GAME_CONSTANTS.SNAP_DISTANCE;
  }, []);

  // Handle drag gesture
  const bind = useDrag(
    ({ down, xy: [x, y], first, last }) => {
      if (track) return; // No drawing once a track exists

      const point = getCanvasPoint(x, y);

      if (first) {
        pointsRef.current = [point];
        snapRef.current = null;
        setError(null);
        setIsDrawing(true);
        setPointCount(1);
        drawRef.current();
        return;
      }

      if (down) {
        const pts = pointsRef.current;
        const lastPoint = pts[pts.length - 1];
        if (distance(point, lastPoint) > MIN_POINT_SPACING) {
          pts.push(point);
          setPointCount(pts.length);
        }
        snapRef.current = isNearStart(point) ? pts[0] : null;
        drawRef.current();
      }

      if (last) {
        setIsDrawing(false);
        const pts = pointsRef.current;
        const shouldClose = isNearStart(point) && pts.length >= GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE;
        snapRef.current = null;

        if (shouldClose) {
          const result = buildTrack(pts, trackWidth);
          if (result.ok && result.track) {
            setTrack(result.track);
            onTrackComplete(result.track);
          } else {
            setError(result.reason ?? 'Could not build a track from that stroke.');
            pointsRef.current = [];
            setPointCount(0);
          }
        }
        drawRef.current();
      }
    },
    { pointer: { touch: true } }
  );

  const handleClear = () => {
    pointsRef.current = [];
    snapRef.current = null;
    setTrack(null);
    setError(null);
    setPointCount(0);
    drawRef.current();
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="rounded-xl bg-black/50 px-3 py-2 backdrop-blur">
          <label className="text-xs text-zinc-300 block mb-1">
            Track Width: {trackWidth}px
          </label>
          <input
            type="range"
            min={GAME_CONSTANTS.TRACK_WIDTH_MIN}
            max={GAME_CONSTANTS.TRACK_WIDTH_MAX}
            value={trackWidth}
            onChange={(e) => setTrackWidth(Number(e.target.value))}
            className="w-32"
            disabled={!!track}
          />
        </div>
        <button
          onClick={handleClear}
          className="rounded-xl bg-red-500/80 px-3 py-2 text-sm text-white hover:bg-red-500"
        >
          Clear
        </button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4 z-10 rounded-xl bg-black/50 px-3 py-2 backdrop-blur text-sm max-w-[260px]">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : track ? (
          <span className="text-green-400">Track complete! Select a mode to play.</span>
        ) : isDrawing ? (
          <span className="text-yellow-400">Drawing… bring back to start to close</span>
        ) : pointCount > 0 ? (
          <span className="text-zinc-300">
            {pointCount} points ({Math.max(0, GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE - pointCount)} more needed)
          </span>
        ) : (
          <span className="text-zinc-400">Click and drag to draw a track</span>
        )}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        {...bind()}
        style={{
          width,
          height,
          cursor: track ? 'default' : isDrawing ? 'crosshair' : 'pointer',
          touchAction: 'none',
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}
