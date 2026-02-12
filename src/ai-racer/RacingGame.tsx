// src/ai-racer/RacingGame.tsx
import { useRef, useEffect, useCallback, useState } from 'react';
import Matter from 'matter-js';
import { Application, Graphics as PixiGraphics } from 'pixi.js';
import type { Track, RacingAction, GameMode } from './core/types';
import { GAME_CONSTANTS } from './core/types';
import { Car } from './core/Car';
import { NEATController } from './ai/NEATController';

interface RacingGameProps {
  track: Track;
  mode: GameMode;
  width: number;
  height: number;
  populationSize?: number;
  onGenerationComplete?: (generation: number, bestFitness: number) => void;
}

export default function RacingGame({
  track,
  mode,
  width,
  height,
  populationSize = GAME_CONSTANTS.POPULATION_SIZE,
  onGenerationComplete,
}: RacingGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<PixiGraphics | null>(null);

  // Matter.js refs
  const engineRef = useRef<Matter.Engine | null>(null);
  const wallBodiesRef = useRef<Matter.Body[]>([]);

  // Game state refs
  const carsRef = useRef<Car[]>([]);
  const runningRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const generationRef = useRef(0);
  const generationTimeRef = useRef(0);

  // NEAT controller ref
  const neatRef = useRef<NEATController | null>(null);

  // Player input state
  const inputRef = useRef({ up: false, down: false, left: false, right: false });

  // UI state
  const [generation, setGeneration] = useState(0);
  const [aliveCars, setAliveCars] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);

  // Create wall bodies from track boundaries
  const createWallBodies = useCallback((track: Track): Matter.Body[] => {
    const walls: Matter.Body[] = [];
    const wallThickness = 10;

    // Create walls from left boundary
    for (let i = 0; i < track.leftBoundary.length - 1; i++) {
      const p1 = track.leftBoundary[i];
      const p2 = track.leftBoundary[i + 1];
      const wall = createWallSegment(p1.x, p1.y, p2.x, p2.y, wallThickness);
      walls.push(wall);
    }

    // Create walls from right boundary
    for (let i = 0; i < track.rightBoundary.length - 1; i++) {
      const p1 = track.rightBoundary[i];
      const p2 = track.rightBoundary[i + 1];
      const wall = createWallSegment(p1.x, p1.y, p2.x, p2.y, wallThickness);
      walls.push(wall);
    }

    return walls;
  }, []);

  // Create a single wall segment
  const createWallSegment = (
    x1: number, y1: number,
    x2: number, y2: number,
    thickness: number
  ): Matter.Body => {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    return Matter.Bodies.rectangle(cx, cy, length, thickness, {
      isStatic: true,
      angle,
      label: 'wall',
      collisionFilter: {
        category: 0x0001,
        mask: 0x0002,
      },
    });
  };

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

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;

    const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : GAME_CONSTANTS.FIXED_TIMESTEP;
    lastTimeRef.current = timestamp;

    // Cap delta time
    const cappedDt = Math.min(dt, 0.1);
    generationTimeRef.current += cappedDt;

    // Update physics
    if (engineRef.current) {
      // Apply actions to all cars
      for (let i = 0; i < carsRef.current.length; i++) {
        const car = carsRef.current[i];
        if (!car.state.alive) continue;

        // Get action based on mode
        let action: RacingAction;
        if (mode === 'time-trial' || mode === 'live-race') {
          // Player controls first car
          if (car.state.id === 0) {
            action = getPlayerAction();
          } else {
            // AI controls other cars using NEAT if available
            if (neatRef.current) {
              const controller = neatRef.current.getController(i);
              action = controller(car.getObservation());
            } else {
              action = getRandomAction();
            }
          }
        } else if (mode === 'watch-ai-learn' && neatRef.current) {
          // Watch AI Learn mode - use NEAT controller
          const controller = neatRef.current.getController(i);
          action = controller(car.getObservation());
        } else {
          action = getRandomAction();
        }

        car.applyAction(action);
        car.update(cappedDt);
        car.updateSensors(wallBodiesRef.current);
        car.updateCheckpoint(track);
      }

      // Step physics (cap to 16.667ms to avoid Matter.js warning)
      const physicsDt = Math.min(cappedDt * 1000, 16.667);
      Matter.Engine.update(engineRef.current, physicsDt);

      // Check if cars are off-track (distance from centerline)
      for (const car of carsRef.current) {
        if (!car.state.alive) continue;

        const carX = car.body.position.x;
        const carY = car.body.position.y;

        // Find minimum distance to any point on centerline
        let minDist = Infinity;
        for (const point of track.centerLine) {
          const dist = Math.sqrt((carX - point.x) ** 2 + (carY - point.y) ** 2);
          if (dist < minDist) minDist = dist;
        }

        // Kill car if too far from track (track width / 2 + small margin)
        const maxDistFromCenter = (track.width / 2) + 10;
        if (minDist > maxDistFromCenter) {
          car.kill();
        }
      }
    }

    // Check for generation end
    const alive = carsRef.current.filter(c => c.state.alive).length;
    const timeLimit = generationTimeRef.current > GAME_CONSTANTS.MAX_GENERATION_TIME;

    if ((alive === 0 || timeLimit) && mode === 'watch-ai-learn' && neatRef.current) {
      // Set fitness scores for all cars
      for (let i = 0; i < carsRef.current.length; i++) {
        const fitness = carsRef.current[i].getFitness();
        neatRef.current.setFitness(i, fitness);
      }

      // Evolve to next generation
      const stats = neatRef.current.evolve();

      generationRef.current = stats.generation;
      setGeneration(stats.generation);
      setBestFitness(stats.bestFitness);

      if (onGenerationComplete) {
        onGenerationComplete(stats.generation, stats.bestFitness);
      }

      // Reset for next generation
      resetCars();
    }

    // Update UI state (throttled)
    setAliveCars(alive);

    // Render
    render();

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [mode, track, getPlayerAction, getRandomAction, resetCars, onGenerationComplete]);

  // Render function
  const render = useCallback(() => {
    const g = graphicsRef.current;
    if (!g) return;

    g.clear();

    // Draw grass background
    g.rect(0, 0, width, height).fill(GAME_CONSTANTS.TRACK_GRASS_COLOR);

    // Draw track road as a thick stroke along centerline
    if (track.centerLine.length > 1) {
      const roadPath = track.centerLine.flatMap(p => [p.x, p.y]);
      g.poly(roadPath, false).stroke({
        width: track.width,
        color: GAME_CONSTANTS.TRACK_ROAD_COLOR,
        cap: 'round',
        join: 'round'
      });
    }

    // Draw track borders
    if (track.leftBoundary.length > 1) {
      const leftPath = track.leftBoundary.flatMap(p => [p.x, p.y]);
      g.poly(leftPath, false).stroke({ width: 3, color: GAME_CONSTANTS.TRACK_BORDER_COLOR });
    }

    if (track.rightBoundary.length > 1) {
      const rightPath = track.rightBoundary.flatMap(p => [p.x, p.y]);
      g.poly(rightPath, false).stroke({ width: 3, color: GAME_CONSTANTS.TRACK_BORDER_COLOR });
    }

    // Draw start/finish line
    g.poly([
      track.startLine.start.x, track.startLine.start.y,
      track.startLine.end.x, track.startLine.end.y
    ], false).stroke({ width: 4, color: 0xffffff });

    // Draw cars - use body position directly from Matter.js
    for (const car of carsRef.current) {
      if (!car.state.alive) continue;

      // Get position directly from Matter.js body
      const x = car.body.position.x;
      const y = car.body.position.y;
      const angle = car.body.angle;
      const carColor = parseInt(car.state.color.replace('#', ''), 16);

      // Draw car as a rotated rectangle using transform
      const hw = GAME_CONSTANTS.CAR_WIDTH / 2;
      const hh = GAME_CONSTANTS.CAR_HEIGHT / 2;

      // Calculate rotated corners manually
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const corners = [
        { x: x + (-hw * cos - -hh * sin), y: y + (-hw * sin + -hh * cos) },
        { x: x + (hw * cos - -hh * sin), y: y + (hw * sin + -hh * cos) },
        { x: x + (hw * cos - hh * sin), y: y + (hw * sin + hh * cos) },
        { x: x + (-hw * cos - hh * sin), y: y + (-hw * sin + hh * cos) },
      ];

      const carPath = corners.flatMap(c => [c.x, c.y]);
      g.poly(carPath, true).fill(carColor);

      // Draw direction indicator (front of car)
      const frontX = x + Math.cos(angle) * hh;
      const frontY = y + Math.sin(angle) * hh;
      g.circle(frontX, frontY, 3).fill(0xffffff);

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

    // Draw dead cars (faded)
    for (const car of carsRef.current) {
      if (car.state.alive) continue;

      const corners = car.getCorners();
      if (corners.length < 4) continue;

      const carPath = corners.flatMap(c => [c.x, c.y]);
      g.poly(carPath, true).fill({ color: 0x333333, alpha: 0.3 });
    }
  }, [track, width, height, mode]);

  // Initialize Pixi.js and Matter.js
  useEffect(() => {
    if (!canvasRef.current) return;

    let app: Application | null = null;

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

      const graphics = new PixiGraphics();
      app.stage.addChild(graphics);

      appRef.current = app;
      graphicsRef.current = graphics;

      // Initialize Matter.js
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: 0 }, // Top-down, no gravity
      });
      engineRef.current = engine;

      // Create wall bodies
      const walls = createWallBodies(track);
      wallBodiesRef.current = walls;
      Matter.Composite.add(engine.world, walls);

      // Initialize NEAT controller for AI learning mode
      if (mode === 'watch-ai-learn') {
        neatRef.current = new NEATController(populationSize);
      }

      // Initialize cars
      const carCount = mode === 'watch-ai-learn' ? populationSize : 1;
      carsRef.current = initializeCars(carCount);

      // Start game loop
      runningRef.current = true;
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    };

    init();

    // Keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
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
      wallBodiesRef.current = [];

      // Clean up Pixi - use ref instead of closure variable
      if (graphicsRef.current) {
        graphicsRef.current.destroy();
        graphicsRef.current = null;
      }
      if (appRef.current) {
        try {
          appRef.current.stop();
          appRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        appRef.current = null;
      }
    };
  }, [track, mode, width, height, populationSize, createWallBodies, initializeCars, gameLoop]);

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
