// src/ai-racer/track-editor/TrackEditor.tsx
import { useRef, useState, useCallback, useEffect } from 'react';
import { Application, Graphics as PixiGraphics } from 'pixi.js';
import { useDrag } from '@use-gesture/react';
import type { Point, Track } from '../core/types';
import { GAME_CONSTANTS } from '../core/types';
import { generateTrackBoundaries } from './SnapSystem';

interface TrackEditorProps {
  width: number;
  height: number;
  onTrackComplete: (track: Track) => void;
}

export default function TrackEditor({ width, height, onTrackComplete }: TrackEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<PixiGraphics | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trackWidth, setTrackWidth] = useState<number>(GAME_CONSTANTS.TRACK_WIDTH_DEFAULT);
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  // Initialize Pixi.js application
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initPixi = async () => {
      const app = new Application();
      await app.init({
        canvas: canvasRef.current!,
        width,
        height,
        backgroundColor: GAME_CONSTANTS.TRACK_GRASS_COLOR,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      const graphics = new PixiGraphics();
      app.stage.addChild(graphics);

      appRef.current = app;
      graphicsRef.current = graphics;
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, [width, height]);

  // Draw function
  const draw = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    g.clear();

    // Draw grass background
    g.rect(0, 0, width, height);
    g.fill(GAME_CONSTANTS.TRACK_GRASS_COLOR);

    // If we have a completed track, draw it
    if (track) {
      // Draw road as thick stroke along center line (handles self-intersecting tracks like figure-8)
      g.moveTo(track.centerLine[0].x, track.centerLine[0].y);
      for (const p of track.centerLine) {
        g.lineTo(p.x, p.y);
      }
      g.stroke({
        width: track.width,
        color: GAME_CONSTANTS.TRACK_ROAD_COLOR,
        cap: 'round',
        join: 'round'
      });

      // Draw track borders (left boundary)
      g.moveTo(track.leftBoundary[0].x, track.leftBoundary[0].y);
      for (const p of track.leftBoundary) {
        g.lineTo(p.x, p.y);
      }
      g.stroke({ width: 3, color: GAME_CONSTANTS.TRACK_BORDER_COLOR });

      // Draw track borders (right boundary)
      g.moveTo(track.rightBoundary[0].x, track.rightBoundary[0].y);
      for (const p of track.rightBoundary) {
        g.lineTo(p.x, p.y);
      }
      g.stroke({ width: 3, color: GAME_CONSTANTS.TRACK_BORDER_COLOR });

      // Draw start/finish line
      g.moveTo(track.startLine.start.x, track.startLine.start.y);
      g.lineTo(track.startLine.end.x, track.startLine.end.y);
      g.stroke({ width: 4, color: 0xffffff });

      // Draw checkpoints (debug)
      for (const cp of track.checkpoints) {
        g.circle(cp.x, cp.y, 5);
        g.fill({ color: 0x00ff00, alpha: 0.3 });
      }

      // Draw center line (debug)
      g.moveTo(track.centerLine[0].x, track.centerLine[0].y);
      for (const p of track.centerLine) {
        g.lineTo(p.x, p.y);
      }
      g.stroke({ width: 1, color: 0xffff00, alpha: 0.3 });
    } else {
      // Draw current drawing path
      if (points.length > 1) {
        // Draw the path with track width preview
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          g.lineTo(points[i].x, points[i].y);
        }
        g.stroke({ width: trackWidth, color: GAME_CONSTANTS.TRACK_ROAD_COLOR, alpha: 0.5 });

        // Draw center line
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          g.lineTo(points[i].x, points[i].y);
        }
        g.stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
      }

      // Draw start point
      if (points.length > 0) {
        g.circle(points[0].x, points[0].y, 10);
        g.fill(0x00ff00);

        // Inner circle
        g.circle(points[0].x, points[0].y, 5);
        g.fill(0xffffff);
      }

      // Draw snap indicator
      if (snapIndicator) {
        g.circle(snapIndicator.x, snapIndicator.y, GAME_CONSTANTS.SNAP_DISTANCE);
        g.stroke({ width: 3, color: 0x00ff00 });
      }
    }
  }, [points, track, trackWidth, width, height, snapIndicator]);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Check if we should snap to close the loop
  const checkSnap = useCallback((point: Point): boolean => {
    if (points.length < GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE) return false;
    const start = points[0];
    const dist = Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
    return dist < GAME_CONSTANTS.SNAP_DISTANCE;
  }, [points]);

  // Get mouse position relative to canvas
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Handle drag gesture
  const bind = useDrag(
    ({ down, xy: [x, y], first, last }) => {
      if (track) return; // Don't allow drawing when track exists

      const point = getCanvasPoint(x, y);

      if (first) {
        setIsDrawing(true);
        setPoints([point]);
        setSnapIndicator(null);
      } else if (down) {
        // Add point if moved enough distance
        setPoints(prev => {
          const lastPoint = prev[prev.length - 1];
          const dist = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
          if (dist > 5) {
            return [...prev, point];
          }
          return prev;
        });

        // Check for snap
        if (checkSnap(point)) {
          setSnapIndicator(points[0]);
        } else {
          setSnapIndicator(null);
        }
      }

      if (last) {
        setIsDrawing(false);
        if (checkSnap(point) && points.length >= GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE) {
          // Close the loop and generate track
          const closedPoints = [...points, points[0]];
          const generatedTrack = generateTrackBoundaries(closedPoints, trackWidth);
          setTrack(generatedTrack);
          onTrackComplete(generatedTrack);
        }
        setSnapIndicator(null);
      }
    },
    { pointer: { touch: true } }
  );

  // Clear track and start over
  const handleClear = () => {
    setPoints([]);
    setTrack(null);
    setSnapIndicator(null);
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
      <div className="absolute top-4 right-4 z-10 rounded-xl bg-black/50 px-3 py-2 backdrop-blur text-sm">
        {track ? (
          <span className="text-green-400">Track complete! Select a mode to play.</span>
        ) : isDrawing ? (
          <span className="text-yellow-400">Drawing... bring back to start to close</span>
        ) : points.length > 0 ? (
          <span className="text-zinc-300">
            {points.length} points ({Math.max(0, GAME_CONSTANTS.MIN_POINTS_FOR_CLOSE - points.length)} more needed)
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
