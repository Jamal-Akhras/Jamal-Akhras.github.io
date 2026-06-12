// src/ai-racer/RacingGame.tsx
import { useRef, useEffect, useCallback, useState } from 'react';
import Matter from 'matter-js';
import { Application, Graphics as PixiGraphics } from 'pixi.js';
import type { Track, RacingAction, GameMode, AIConfig } from './core/types';
import { GAME_CONSTANTS, DEFAULT_AI_CONFIG } from './core/types';
import { Car } from './core/Car';
import { NEATController } from './ai/NEATController';
import { TrackCollision } from './core/TrackCollision';
import { drawGrass, drawTrackSurface } from './core/trackRender';
import { buildNetworkSnapshot, type NetworkSnapshot } from './NetworkView';

// Driving keys whose default browser action (page scroll) we suppress.
const DRIVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

// Sample each car's position every Nth sim step for the racing-line trail.
const TRAIL_SAMPLE = 3;

// Telemetry colour ramp red (slow) -> yellow -> green (fast).
function speedColor(t: number): number {
  const stops = t < 0.5
    ? [[0xff, 0x3b, 0x3b], [0xff, 0xd8, 0x3b], t * 2]
    : [[0xff, 0xd8, 0x3b], [0x3b, 0xff, 0x6b], (t - 0.5) * 2];
  const [c0, c1, k] = stops as [number[], number[], number];
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
  return (r << 16) | (g << 8) | b;
}

// Draw a top-down car. Local frame: +x = forward (length), +y = right (width).
function drawCar(g: PixiGraphics, cx: number, cy: number, angle: number, color: number, alpha = 1): void {
  const L = GAME_CONSTANTS.CAR_LENGTH / 2;
  const W = GAME_CONSTANTS.CAR_WIDTH / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = (lx: number, ly: number): [number, number] => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
  const path = (pts: [number, number][]) => pts.flatMap(([lx, ly]) => tx(lx, ly));

  // Body with a tapered nose so heading is obvious
  const hull: [number, number][] = [
    [L, 0], [L * 0.55, W], [-L, W * 0.85], [-L, -W * 0.85], [L * 0.55, -W],
  ];
  g.poly(path(hull), true).fill({ color, alpha }).stroke({ width: 1, color: 0x000000, alpha: 0.4 * alpha });

  // Windshield / cabin
  const cabin: [number, number][] = [
    [L * 0.25, W * 0.55], [-L * 0.35, W * 0.6], [-L * 0.35, -W * 0.6], [L * 0.25, -W * 0.55],
  ];
  g.poly(path(cabin), true).fill({ color: 0x0b1220, alpha: 0.55 * alpha });

  // Headlights
  for (const side of [1, -1]) {
    const [hx, hy] = tx(L * 0.82, side * W * 0.5);
    g.circle(hx, hy, 1.6).fill({ color: 0xfff4c2, alpha });
  }
}

interface RacingGameProps {
  track: Track;
  mode: GameMode;
  width: number;
  height: number;
  populationSize?: number;
  aiConfig?: AIConfig;
  onGenerationComplete?: (stats: { generation: number; bestFitness: number; avgFitness: number }) => void;
  onNetwork?: (snapshot: NetworkSnapshot | null) => void;
}

export default function RacingGame({
  track,
  mode,
  width,
  height,
  populationSize = GAME_CONSTANTS.POPULATION_SIZE,
  aiConfig = DEFAULT_AI_CONFIG,
  onGenerationComplete,
  onNetwork,
}: RacingGameProps) {
  // Live config (sim speed, generation time, checkpoint timeout) read each frame
  // via a ref so those knobs apply without restarting the run.
  const configRef = useRef(aiConfig);
  configRef.current = aiConfig;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const trackGraphicsRef = useRef<PixiGraphics | null>(null); // static track layer (drawn once)
  const carsGraphicsRef = useRef<PixiGraphics | null>(null); // dynamic cars layer (redrawn each frame)

  // Matter.js + collision refs
  const engineRef = useRef<Matter.Engine | null>(null);
  const collisionRef = useRef<TrackCollision | null>(null);

  // Game state refs
  const carsRef = useRef<Car[]>([]);
  const runningRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const generationRef = useRef(0);
  const generationTimeRef = useRef(0);
  const renderRef = useRef<() => void>(() => {});
  const stepCounterRef = useRef(0); // for trail sampling
  const netFrameRef = useRef(0); // for throttling the network snapshot
  const bestLineRef = useRef<{ x: number; y: number; speed: number }[]>([]); // best driver's path from last gen

  // NEAT controller ref
  const neatRef = useRef<NEATController | null>(null);

  // Player input state
  const inputRef = useRef({ up: false, down: false, left: false, right: false });

  // UI state
  const [generation, setGeneration] = useState(0);
  const [aliveCars, setAliveCars] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);

  // Initialize cars
  const initializeCars = useCallback((count: number) => {
    Car.resetIdCounter();
    const cars: Car[] = [];
    const startX = track.startLine.start.x + (track.startLine.end.x - track.startLine.start.x) / 2;
    const startY = track.startLine.start.y + (track.startLine.end.y - track.startLine.start.y) / 2;
    const startAngle = track.startLine.angle;

    for (let i = 0; i < count; i++) {
      // Offset cars slightly so they don't all stack
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const car = new Car(startX + offsetX, startY + offsetY, startAngle);
      cars.push(car);

      // Add car body to physics world
      if (engineRef.current) {
        Matter.Composite.add(engineRef.current.world, car.body);
      }
    }

    return cars;
  }, [track]);

  // Reset all cars to start
  const resetCars = useCallback(() => {
    const startX = track.startLine.start.x + (track.startLine.end.x - track.startLine.start.x) / 2;
    const startY = track.startLine.start.y + (track.startLine.end.y - track.startLine.start.y) / 2;
    const startAngle = track.startLine.angle;

    for (const car of carsRef.current) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      car.reset(startX + offsetX, startY + offsetY, startAngle);
    }

    generationTimeRef.current = 0;
  }, [track]);

  // Get player action from keyboard input
  const getPlayerAction = useCallback((): RacingAction => {
    const input = inputRef.current;
    return {
      steering: (input.left ? -1 : 0) + (input.right ? 1 : 0),
      acceleration: input.up ? 1 : 0,
      brake: input.down ? 1 : 0,
    };
  }, []);

  // Get random action (for testing)
  const getRandomAction = useCallback((): RacingAction => {
    return {
      steering: Math.random() * 2 - 1,
      acceleration: Math.random(),
      brake: Math.random() * 0.3,
    };
  }, []);

  // Advance the simulation by one fixed step.
  const simulate = useCallback((stepDt: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    generationTimeRef.current += stepDt;

    // Sample positions periodically so the best car's path can be drawn.
    const recordTrail = mode === 'watch-ai-learn' && (++stepCounterRef.current % TRAIL_SAMPLE === 0);

    for (let i = 0; i < carsRef.current.length; i++) {
      const car = carsRef.current[i];
      if (!car.state.alive) continue;

      let action: RacingAction;
      if (mode === 'time-trial' || mode === 'live-race') {
        if (car.state.id === 0) {
          action = getPlayerAction();
        } else if (neatRef.current) {
          action = neatRef.current.getController(i)(car.getObservation());
        } else {
          action = getRandomAction();
        }
      } else if (mode === 'watch-ai-learn' && neatRef.current) {
        action = neatRef.current.getController(i)(car.getObservation());
      } else {
        action = getRandomAction();
      }

      // Stall-kill only applies while training; never kill the player/opponents.
      car.checkpointTimeout = mode === 'watch-ai-learn' ? configRef.current.checkpointTimeout : Infinity;
      car.applyAction(action);
      car.update(stepDt);
      if (collisionRef.current) car.updateSensors(collisionRef.current);
      car.updateCheckpoint(track);
      if (recordTrail && car.state.alive) car.trail.push({ x: car.body.position.x, y: car.body.position.y, speed: car.state.velocity });
    }

    Matter.Engine.update(engine, Math.min(stepDt * 1000, 16.667));

    // Track limits (F1-style): a car is out if 3+ of its 4 wheels are off the road.
    const collision = collisionRef.current;
    if (collision) {
      const L = (GAME_CONSTANTS.CAR_LENGTH / 2) * 0.7; // wheel inset from nose/tail
      const W = GAME_CONSTANTS.CAR_WIDTH / 2;
      const wheels: [number, number][] = [[L, W], [L, -W], [-L, W], [-L, -W]];
      for (const car of carsRef.current) {
        if (!car.state.alive) continue;
        const cx = car.body.position.x;
        const cy = car.body.position.y;
        const cos = Math.cos(car.body.angle);
        const sin = Math.sin(car.body.angle);
        let wheelsOff = 0;
        for (const [lx, ly] of wheels) {
          const wx = cx + lx * cos - ly * sin;
          const wy = cy + lx * sin + ly * cos;
          if (!collision.isOnTrack(wx, wy)) wheelsOff++;
        }
        if (wheelsOff >= 3) car.kill();
      }
    }

    // Generation end (watch-ai-learn): score everyone, evolve, reset.
    if (mode === 'watch-ai-learn' && neatRef.current) {
      const alive = carsRef.current.filter(c => c.state.alive).length;
      const timeUp = generationTimeRef.current > configRef.current.maxGenerationTime;
      if (alive === 0 || timeUp) {
        let bestIndex = 0;
        let bestFit = -Infinity;
        const reward = configRef.current.reward;
        for (let i = 0; i < carsRef.current.length; i++) {
          const f = carsRef.current[i].getFitness(reward);
          neatRef.current.setFitness(i, f);
          if (f > bestFit) {
            bestFit = f;
            bestIndex = i;
          }
        }
        // Keep the best driver's path to overlay during the next generation.
        bestLineRef.current = carsRef.current[bestIndex].trail.slice();

        const stats = neatRef.current.evolve();
        generationRef.current = stats.generation;
        setGeneration(stats.generation);
        setBestFitness(stats.bestFitness);
        onGenerationComplete?.({
          generation: stats.generation,
          bestFitness: stats.bestFitness,
          avgFitness: stats.avgFitness,
        });
        resetCars();
      }
    }
  }, [mode, track, getPlayerAction, getRandomAction, resetCars, onGenerationComplete]);

  // Main game loop. Kept in a ref so the init effect (which starts the rAF loop)
  // never depends on its identity — otherwise a changing callback would tear down
  // and rebuild the whole sim.
  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;

    const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : GAME_CONSTANTS.FIXED_TIMESTEP;
    lastTimeRef.current = timestamp;
    const cappedDt = Math.min(dt, 0.1);

    // Run faster than realtime while watching the AI learn so progress is visible.
    const steps = mode === 'watch-ai-learn' ? Math.max(1, Math.round(configRef.current.simSpeed)) : 1;
    const stepDt = mode === 'watch-ai-learn' ? GAME_CONSTANTS.FIXED_TIMESTEP : cappedDt;
    for (let s = 0; s < steps; s++) simulate(stepDt);

    setAliveCars(carsRef.current.filter(c => c.state.alive).length);
    renderRef.current();

    // Throttled snapshot of the current leader's network for the live view.
    if (mode === 'watch-ai-learn' && onNetwork && neatRef.current && ++netFrameRef.current % 6 === 0) {
      const cars = carsRef.current;
      let leader = -1;
      let bestCp = -1;
      for (let i = 0; i < cars.length; i++) {
        if (cars[i].state.alive && cars[i].state.checkpointsPassed > bestCp) {
          bestCp = cars[i].state.checkpointsPassed;
          leader = i;
        }
      }
      if (leader >= 0) {
        const genome = neatRef.current.getPopulation()[leader];
        if (genome) onNetwork(buildNetworkSnapshot(genome));
      }
    }
  }, [mode, simulate, onNetwork]);

  const gameLoopRef = useRef(gameLoop);
  gameLoopRef.current = gameLoop;

  // Stable per-frame driver: calls the latest gameLoop and reschedules itself.
  const frameTick = useCallback((timestamp: number) => {
    gameLoopRef.current(timestamp);
    if (runningRef.current) rafRef.current = requestAnimationFrame(frameTick);
  }, []);

  // Render only the cars each frame; the track is drawn once into its own layer.
  const render = useCallback(() => {
    const g = carsGraphicsRef.current;
    if (!g) return;

    g.clear();

    // Best driver's racing line from the previous generation, coloured by speed
    // (red = slow / braking, green = fast).
    const line = bestLineRef.current;
    if (mode === 'watch-ai-learn' && line.length > 1) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1];
        const b = line[i];
        const t = Math.max(0, Math.min(1, b.speed / GAME_CONSTANTS.MAX_SPEED));
        g.poly([a.x, a.y, b.x, b.y], false).stroke({ width: 3, color: speedColor(t), alpha: 0.95 });
      }
    }

    // Draw dead cars first (faded) so live cars render on top
    for (const car of carsRef.current) {
      if (car.state.alive) continue;
      drawCar(g, car.body.position.x, car.body.position.y, car.body.angle, 0x333333, 0.3);
    }

    // Draw live cars
    for (const car of carsRef.current) {
      if (!car.state.alive) continue;

      const x = car.body.position.x;
      const y = car.body.position.y;
      const angle = car.body.angle;
      const carColor = parseInt(car.state.color.replace('#', ''), 16);

      drawCar(g, x, y, angle, carColor);

      // Draw sensors (debug) - only for first few cars to reduce clutter
      if (mode === 'watch-ai-learn' && car.state.id < 3) {
        for (let i = 0; i < GAME_CONSTANTS.NUM_SENSORS; i++) {
          const sensorAngle = angle + (GAME_CONSTANTS.SENSOR_ANGLES[i] * Math.PI) / 180;
          const dist = car.sensorDistances[i] * GAME_CONSTANTS.MAX_SENSOR_DISTANCE;
          const endX = x + Math.cos(sensorAngle) * dist;
          const endY = y + Math.sin(sensorAngle) * dist;

          g.poly([x, y, endX, endY], false)
            .stroke({ width: 1, color: 0x00ff00, alpha: 0.3 });
        }
      }
    }
  }, [mode]);

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Initialize Pixi.js and Matter.js
  useEffect(() => {
    if (!canvasRef.current) return;

    let app: Application | null = null;
    let cancelled = false;

    const init = async () => {
      // Initialize Pixi.js
      app = new Application();
      await app.init({
        canvas: canvasRef.current!,
        width,
        height,
        backgroundColor: GAME_CONSTANTS.TRACK_GRASS_COLOR,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) {
        app.destroy();
        return;
      }

      // Static track layer (drawn once) + dynamic cars layer (redrawn each frame)
      const trackGraphics = new PixiGraphics();
      const carsGraphics = new PixiGraphics();
      app.stage.addChild(trackGraphics);
      app.stage.addChild(carsGraphics);
      drawGrass(trackGraphics, width, height);
      drawTrackSurface(trackGraphics, track);

      appRef.current = app;
      trackGraphicsRef.current = trackGraphics;
      carsGraphicsRef.current = carsGraphics;

      // Collision grid for sensor raycasting (replaces Matter wall bodies)
      collisionRef.current = new TrackCollision(track.boundaries);

      // Matter.js holds the car bodies; walls aren't needed (off-track check kills cars)
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 0 }, // Top-down, no gravity
      });
      engineRef.current = engine;

      // Initialize NEAT controller for AI learning mode. Structural options are
      // read at (re)mount; changing them in the UI bumps a key to remount.
      if (mode === 'watch-ai-learn') {
        const cfg = configRef.current;
        neatRef.current = new NEATController(populationSize, {
          hiddenSize: cfg.hiddenSize,
          hiddenLayers: cfg.hiddenLayers,
          mutationRate: cfg.mutationRate,
          elitism: cfg.elitism,
        });
      }

      // Initialize cars
      const carCount = mode === 'watch-ai-learn' ? populationSize : 1;
      carsRef.current = initializeCars(carCount);

      // Start game loop
      runningRef.current = true;
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(frameTick);
    };

    // Defer init one frame so React StrictMode's mount->unmount->remount collapses
    // to a single init — two concurrent Application.init() calls on the same canvas
    // corrupt its (single) WebGL context.
    const initId = requestAnimationFrame(() => { init(); });

    // Keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Stop arrow keys / space from scrolling the page while driving.
      if (DRIVE_KEYS.has(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelled = true;
      cancelAnimationFrame(initId);
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }

      neatRef.current = null;
      carsRef.current = [];
      collisionRef.current = null;

      // Clean up Pixi - use refs instead of closure variables
      trackGraphicsRef.current?.destroy();
      trackGraphicsRef.current = null;
      carsGraphicsRef.current?.destroy();
      carsGraphicsRef.current = null;
      if (appRef.current) {
        try {
          appRef.current.stop();
          appRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        appRef.current = null;
      }
    };
  }, [track, mode, width, height, populationSize, initializeCars, frameTick]);

  return (
    <div className="relative">
      {/* Stats overlay */}
      <div className="absolute top-4 left-4 z-10 rounded-xl bg-black/50 px-3 py-2 backdrop-blur text-sm">
        <div className="text-zinc-300">
          {mode === 'watch-ai-learn' && (
            <>
              <div>Generation: <span className="text-white font-mono">{generation}</span></div>
              <div>Alive: <span className="text-white font-mono">{aliveCars}/{populationSize}</span></div>
              <div>Best Fitness: <span className="text-green-400 font-mono">{bestFitness.toFixed(0)}</span></div>
            </>
          )}
          {(mode === 'time-trial' || mode === 'live-race') && (
            <div>Use Arrow Keys or WASD to drive</div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
